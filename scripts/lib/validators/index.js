/**
 * Unified Content Validator
 * Combines all specialized validators to determine if text is translatable.
 * 
 * This is the main entry point for the new validation architecture.
 */

const { isCssContent, isSpreadsheetReference } = require('./cssValidator');
const { isCodeContent, isEventHandlerValue, isJsExpression, isLoggingCall, LOGGING_LINE_PATTERNS } = require('./codeValidator');
const { isHtmlContent, isNonTranslatableAttribute, isTranslatableAttribute, containsVueBindingSyntax } = require('./htmlValidator');
const { isTechnicalContent, isUrl, isFilePath, isUuid, isHexColor } = require('./technicalValidator');

/**
 * Minimum requirements for translatable text
 */
const MIN_TRANSLATABLE_LENGTH = 2;
const MIN_LETTER_COUNT = 1;

/**
 * Words that are never translatable on their own
 */
const NEVER_TRANSLATE_WORDS = new Set([
  // Boolean/null values
  'true', 'false', 'null', 'undefined', 'nan', 'infinity',
  // Common technical terms
  'ok', 'id', 'url', 'uri', 'api', 'css', 'html', 'xml', 'json', 'svg',
  // Size abbreviations
  'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl',
  // Common component props
  'primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'error', 'info',
  'default', 'outline', 'ghost', 'link', 'solid', 'subtle',
  // HTML elements (when used as values)
  'div', 'span', 'input', 'button', 'form', 'select', 'option', 'textarea',
  'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'header', 'footer', 'nav', 'main', 'aside', 'section', 'article',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'video', 'audio',
]);

/**
 * Check if text has basic requirements for translation
 */
function hasBasicRequirements(text) {
  const trimmed = String(text || '').trim();
  
  // Must have minimum length
  if (trimmed.length < MIN_TRANSLATABLE_LENGTH) {
    return false;
  }
  
  // Must have at least one letter
  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < MIN_LETTER_COUNT) {
    return false;
  }
  
  // Check for never-translate words (single words only)
  if (!/\s/.test(trimmed) && NEVER_TRANSLATE_WORDS.has(trimmed.toLowerCase())) {
    return false;
  }
  
  return true;
}

/**
 * Check if text contains balanced brackets/quotes
 */
function hasBalancedDelimiters(text) {
  const trimmed = String(text || '').trim();
  
  // Check parentheses
  const openParens = (trimmed.match(/\(/g) || []).length;
  const closeParens = (trimmed.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return false;
  }
  
  // Check square brackets
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    return false;
  }
  
  // Check curly braces (but allow {placeholder} patterns)
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return false;
  }
  
  // Check quotes
  const apostrophes = (trimmed.match(/[A-Za-z]'[A-Za-z]/g) || []).length;
  const singleQuotes = (trimmed.match(/'/g) || []).length - apostrophes;
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    return false;
  }
  
  return true;
}

/**
 * Check if text looks like a placeholder-only pattern
 * e.g., "{name}", "{{value}}", "{user.name}"
 * But allow text that has both placeholders AND substantial translatable content
 */
function isPlaceholderOnly(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return true;
  
  // Count total characters and placeholder characters
  const totalLength = trimmed.length;
  
  // Calculate placeholder content length
  const placeholderMatches = [
    ...trimmed.match(/\{\{\s*[^}]+\s*\}\}/g) || [],  // Vue mustache: {{ expr }}
    ...trimmed.match(/\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g) || [],  // Simple placeholders: {name}
    ...trimmed.match(/\$\{[^}]+\}/g) || [],  // Template literals: ${expr}
    ...trimmed.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || [],  // Named params: :name
    ...trimmed.match(/%[sdifboOcj%]/g) || []  // Printf-style: %s, %d
  ];
  
  const placeholderLength = placeholderMatches.reduce((sum, match) => sum + match.length, 0);
  
  // If placeholders are more than 70% of the content, consider it placeholder-only
  if (placeholderLength > totalLength * 0.7) {
    return true;
  }
  
  // Remove all placeholder patterns for final check
  let stripped = trimmed
    .replace(/\{\{\s*[^}]+\s*\}\}/g, '')  // Vue mustache: {{ expr }}
    .replace(/\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g, '')  // Simple placeholders: {name}
    .replace(/\$\{[^}]+\}/g, '')  // Template literals: ${expr}
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '')  // Named params: :name
    .replace(/%[sdifboOcj%]/g, '')  // Printf-style: %s, %d
    .trim();
  
  // Remove punctuation and whitespace
  stripped = stripped.replace(/[\s\p{P}]/gu, '');
  
  // If nothing left or only numbers, it's placeholder-only
  if (!stripped || !/[a-zA-Z]/.test(stripped)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text looks like human-readable content
 * Uses linguistic patterns to detect legitimate words
 */
function looksLikeHumanText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Must have at least one space for multi-word text, or be a single capitalized word
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    // Single word: must start with capital letter and look like a word
    let word = words[0];
    
    // Strip trailing punctuation (.,:;!?) for validation
    word = word.replace(/[.,:;!?]+$/, '');
    
    // Allow single capitalized words that look like labels (including contractions)
    if (/^[A-Z][a-zA-Z0-9']*$/.test(word)) {
      return true;
    }

    // Allow ALL CAPS words (labels/constants)
    if (/^[A-Z0-9_]+$/.test(word) && /[A-Z]/.test(word)) {
      return true;
    }
    
    // **NEW**: Allow common UI button/action words even if lowercase
    const commonUIWords = new Set([
      'back', 'next', 'cancel', 'done', 'close', 'save', 'delete', 'edit', 'view',
      'add', 'create', 'update', 'remove', 'search', 'filter', 'sort', 'export',
      'import', 'upload', 'download', 'share', 'copy', 'paste', 'cut', 'undo',
      'redo', 'refresh', 'reload', 'reset', 'clear', 'submit', 'send', 'continue',
      'skip', 'finish', 'start', 'stop', 'pause', 'play', 'resume', 'retry',
      'confirm', 'ok', 'yes', 'no', 'all', 'none', 'any', 'other', 'more', 'less'
    ]);
    if (commonUIWords.has(word.toLowerCase())) {
      return true;
    }
    
    // Reject camelCase (starts with lower), snake_case, kebab-case
    if (/^[a-z]/.test(word) && !commonUIWords.has(word.toLowerCase())) {
      if (/_/.test(word) || /-/.test(word)) {
        return false;
      }
    }
    
    return false;
  }
  
  // Multi-word: check if it looks like a sentence/phrase
  let validWordCount = 0;
  for (const word of words) {
    // Remove punctuation and parentheses for checking
    const cleaned = word.replace(/[^\w]/g, '');
    if (!cleaned) continue;
    
    // Check if word looks like English (has vowels, reasonable length)
    if (/[aeiou]/i.test(cleaned) && cleaned.length >= 2) {
      validWordCount++;
    }
  }
  
  // At least 50% of words should look valid
  return validWordCount >= words.length * 0.5;
}

/**
 * Normalize special characters in text before validation
 * Converts curly quotes to straight quotes, special whitespace to regular space, etc.
 */
function normalizeSpecialChars(text) {
  return String(text || '')
    // Curly quotes to straight quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Special dashes to regular hyphen
    .replace(/[\u2013\u2014\u2015]/g, '-')
    // Special whitespace to regular space
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Ellipsis to three dots
    .replace(/\u2026/g, '...');
}

/**
 * Check if text matches common UI string patterns (should be allowed through)
 * This provides an early exit before running aggressive technical validators
 */
function isCommonUIString(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Pattern 1: Action words with optional parameters: "Import emails", "Delete {count} items"
  const actionPattern = /^(cancel|delete|edit|view|add|create|update|remove|search|filter|sort|export|import|upload|download|share|copy|paste|cut|undo|redo|refresh|reload|reset|clear|submit|send|continue|skip|finish|start|stop|pause|play|resume|retry|confirm|select|choose|pick|open|close|save|load|back|next|previous|forward|done|ok|yes|no)/i;
  if (actionPattern.test(trimmed)) {
    return true;
  }
  
  // Pattern 2: UI labels with optional placeholders: "Total: {count}", "Found {total} matches"
  const labelPattern = /^(found|extracted|uploaded|downloaded|processed|selected|total|valid|invalid|detected|configured|showing|displaying|loading|saving)\s+/i;
  if (labelPattern.test(trimmed)) {
    return true;
  }
  
  // Pattern 3: Status messages: "Import completed successfully", "Processing..."
  const statusPattern = /(successfully|failed|completed|started|finished|resumed|cancelled|paused|stopped|pending|processing|loading|ready)/i;
  if (statusPattern.test(trimmed)) {
    return true;
  }
  
  // Pattern 4: Questions/prompts: "Select a user", "Enter your password"
  const promptPattern = /^(select|choose|enter|type|provide|upload|download|connect|configure|setup|install)\s+(a|an|the|your)\s+/i;
  if (promptPattern.test(trimmed)) {
    return true;
  }
  
  // Pattern 5: Time/duration expressions: "Last 2 years", "1 year ago"
  const timePattern = /^(last|past|next|in|within|after|before)\s+\d+\s+(second|minute|hour|day|week|month|year)s?\b/i;
  if (timePattern.test(trimmed)) {
    return true;
  }
  
  // Pattern 6: Helpful hints/notes: "or drag and drop", "Click to upload"
  const hintPattern = /^(or|and|to|for|with|from|into|onto|click|tap|press|drag|drop)\s+/i;
  if (hintPattern.test(trimmed)) {
    return true;
  }
  
  // Pattern 7: Recommendations/suggestions: "Full emails (recommended)"
  if (/\(recommended\)$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Main validation function: Check if text should be translated
 * 
 * @param {string} text - The text to validate
 * @param {Object} options - Validation options
 * @param {Object} options.ignorePatterns - Custom ignore patterns
 * @param {string} options.context - Context hint ('attribute', 'text', 'expression')
 * @param {string} options.attributeName - Attribute name if context is 'attribute'
 * @returns {boolean} - True if text should be translated
 */
function shouldTranslate(text, options = {}) {
  // Normalize special characters first
  const normalized = normalizeSpecialChars(text);
  const trimmed = normalized.trim();
  const { ignorePatterns, context, attributeName } = options;
  
  // Basic requirements check
  if (!hasBasicRequirements(trimmed)) {
    return false;
  }
  
  // Balanced delimiters check
  if (!hasBalancedDelimiters(trimmed)) {
    return false;
  }
  
  // Placeholder-only check
  if (isPlaceholderOnly(trimmed)) {
    return false;
  }
  
  // **NEW**: Early exit for common UI strings (before aggressive technical checks)
  // This prevents false positives on legitimate UI text
  if (isCommonUIString(trimmed)) {
    // Still check for obvious code patterns even if it looks like UI
    if (!isCodeContent(trimmed) && !isHtmlContent(trimmed) && !isUrl(trimmed)) {
      return true;
    }
  }
  
  // Context-specific checks
  if (context === 'attribute' && attributeName) {
    if (isNonTranslatableAttribute(attributeName)) {
      return false;
    }
  }
  
  // CSS content check
  if (isCssContent(trimmed)) {
    return false;
  }
  
  // Spreadsheet reference check
  if (isSpreadsheetReference(trimmed)) {
    return false;
  }
  
  // Code/expression check
  if (isCodeContent(trimmed)) {
    return false;
  }
  
  // Event handler check
  if (isEventHandlerValue(trimmed)) {
    return false;
  }
  
  // HTML/template content check
  if (isHtmlContent(trimmed)) {
    return false;
  }
  
  // Vue binding syntax check
  if (containsVueBindingSyntax(trimmed)) {
    return false;
  }
  
  // Technical content check
  if (isTechnicalContent(trimmed)) {
    return false;
  }
  
  // Custom ignore patterns
  if (ignorePatterns) {
    const normalized = trimmed.replace(/\s+/g, ' ');
    
    // Exact match
    if (Array.isArray(ignorePatterns.exact) && ignorePatterns.exact.includes(normalized)) {
      return false;
    }
    
    // Case-insensitive exact match
    if (Array.isArray(ignorePatterns.exactInsensitive)) {
      const lowerNorm = normalized.toLowerCase();
      for (const v of ignorePatterns.exactInsensitive) {
        if (String(v).toLowerCase() === lowerNorm) {
          return false;
        }
      }
    }
    
    // Contains match
    if (Array.isArray(ignorePatterns.contains)) {
      for (const part of ignorePatterns.contains) {
        if (part && normalized.includes(String(part))) {
          return false;
        }
      }
    }
  }
  
  // Final check: does it look like human-readable text?
  if (!looksLikeHumanText(trimmed)) {
    return false;
  }
  
  return true;
}

/**
 * Inverse of shouldTranslate for compatibility
 */
function shouldIgnore(text, options = {}) {
  return !shouldTranslate(text, options);
}

/**
 * Validate extracted text and return detailed result
 * 
 * @param {string} text - The text to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with reason
 */
function validateText(text, options = {}) {
  const normalized = normalizeSpecialChars(text);
  const trimmed = normalized.trim();
  
  if (!hasBasicRequirements(trimmed)) {
    return { valid: false, reason: 'basic_requirements' };
  }
  
  if (!hasBalancedDelimiters(trimmed)) {
    return { valid: false, reason: 'unbalanced_delimiters' };
  }
  
  if (isPlaceholderOnly(trimmed)) {
    return { valid: false, reason: 'placeholder_only' };
  }

  // Early allowlist for common UI text to avoid aggressive false positives
  if (isCommonUIString(trimmed)) {
    if (!isCodeContent(trimmed) && !isHtmlContent(trimmed) && !isUrl(trimmed)) {
      return { valid: true, reason: null };
    }
  }
  
  if (isCssContent(trimmed)) {
    return { valid: false, reason: 'css_content' };
  }
  
  if (isSpreadsheetReference(trimmed)) {
    return { valid: false, reason: 'spreadsheet_reference' };
  }
  
  if (isCodeContent(trimmed)) {
    return { valid: false, reason: 'code_content' };
  }
  
  if (isEventHandlerValue(trimmed)) {
    return { valid: false, reason: 'event_handler' };
  }
  
  if (isHtmlContent(trimmed)) {
    return { valid: false, reason: 'html_content' };
  }
  
  if (containsVueBindingSyntax(trimmed)) {
    return { valid: false, reason: 'vue_binding' };
  }
  
  if (isTechnicalContent(trimmed)) {
    return { valid: false, reason: 'technical_content' };
  }
  
  if (!looksLikeHumanText(trimmed)) {
    return { valid: false, reason: 'not_human_text' };
  }
  
  return { valid: true, reason: null };
}

module.exports = {
  // Main functions
  shouldTranslate,
  shouldIgnore,
  validateText,
  normalizeSpecialChars,
  
  // Helper functions
  hasBasicRequirements,
  hasBalancedDelimiters,
  isPlaceholderOnly,
  looksLikeHumanText,
  
  // Re-export specialized validators
  isCssContent,
  isSpreadsheetReference,
  isCodeContent,
  isEventHandlerValue,
  isJsExpression,
  isLoggingCall,
  LOGGING_LINE_PATTERNS,
  isHtmlContent,
  isNonTranslatableAttribute,
  isTranslatableAttribute,
  containsVueBindingSyntax,
  isTechnicalContent,
  isUrl,
  isFilePath,
  isUuid,
  isHexColor,
  
  // Constants
  NEVER_TRANSLATE_WORDS,
};
