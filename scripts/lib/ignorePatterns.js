/**
 * Shared ignore patterns utilities for i18n scripts
 * 
 * This module integrates with the validators system for optimal accuracy.
 */
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { isTranslatableText } = require('./textValidation');

// Try to load new validators
let newValidators = null;
try {
  newValidators = require('./validators');
} catch (e) {
  //TODO: Remove legacy fallback
}

let cachedPatterns = null;
let cachedPatternsPath = null;

/**
 * Load ignore patterns from file
 */
function loadIgnorePatterns(projectRoot) {
  const patternsPath = path.resolve(projectRoot, 'scripts', 'i18n-ignore-patterns.json');
  
  // Return cached if same path
  if (cachedPatterns !== null && cachedPatternsPath === patternsPath) {
    return cachedPatterns;
  }

  try {
    let patterns = {};
    if (existsSync(patternsPath)) {
      const raw = readFileSync(patternsPath, 'utf8');
      const parsed = JSON.parse(raw);
      patterns = parsed && typeof parsed === 'object' ? parsed : {};
    }

    const autoPath = path.resolve(projectRoot, 'scripts', '.i18n-auto-ignore.json');
    if (existsSync(autoPath)) {
      try {
        const rawAuto = readFileSync(autoPath, 'utf8');
        const parsedAuto = JSON.parse(rawAuto);
        if (parsedAuto && typeof parsedAuto === 'object') {
          if (Array.isArray(parsedAuto.exact)) {
            patterns.exact = (Array.isArray(patterns.exact) ? patterns.exact : []).concat(
              parsedAuto.exact,
            );
          }
          if (Array.isArray(parsedAuto.exactInsensitive)) {
            patterns.exactInsensitive = (
              Array.isArray(patterns.exactInsensitive) ? patterns.exactInsensitive : []
            ).concat(parsedAuto.exactInsensitive);
          }
          if (Array.isArray(parsedAuto.contains)) {
            patterns.contains = (Array.isArray(patterns.contains) ? patterns.contains : []).concat(
              parsedAuto.contains,
            );
          }
        }
      } catch {
      }
    }

    cachedPatterns = patterns;
    cachedPatternsPath = patternsPath;
    return cachedPatterns;
  } catch {
    cachedPatterns = {};
    cachedPatternsPath = patternsPath;
    return cachedPatterns;
  }
}

function getIgnorePatterns(projectRoot) {
  if (projectRoot) {
    return loadIgnorePatterns(projectRoot);
  }
  if (cachedPatterns !== null) {
    return cachedPatterns;
  }
  return loadIgnorePatterns(process.cwd());
}

/**
 * Check if attribute should be ignored
 */
function shouldIgnoreAttribute(attrName, patterns) {
  if (!patterns || !Array.isArray(patterns.ignoreAttributes)) {
    return false;
  }
  const lower = String(attrName || '').toLowerCase();
  return patterns.ignoreAttributes.some((name) => String(name || '').toLowerCase() === lower);
}

function isPlaceholderOnlyText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  let stripped = trimmed
    .replace(/\{\{\s*[^}]+\s*\}\}/g, ' ')
    .replace(/\{[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*\}/g, ' ');
  stripped = stripped.replace(/[\(\)\[\]\{\},.:;'"!?!\-_]/g, ' ');
  stripped = stripped.replace(/\s+/g, ' ').trim();
  if (!stripped) return true;
  if (!/[A-Za-z]/.test(stripped)) return true;
  const letters = stripped.replace(/[^A-Za-z]/g, '');
  if (letters.length <= 1 && stripped.length <= 3) return true;
  return false;
}

function isUnderscoreCssToken(text) {
  const token = String(text || '').trim().toLowerCase();
  if (!token || token.indexOf('_') === -1) {
    return false;
  }

  if (token.includes('flex_items_')) {
    return true;
  }

  const segments = token.split('_').filter(Boolean);
  if (segments.length < 2) {
    return false;
  }

  const cssSegments = new Set([
    'flex',
    'grid',
    'items',
    'justify',
    'content',
    'self',
    'place',
    'start',
    'end',
    'center',
    'between',
    'around',
    'evenly',
  ]);

  let matches = 0;
  for (const seg of segments) {
    if (cssSegments.has(seg)) {
      matches += 1;
    }
  }

  return matches >= 2;
}

function isCssUtilityString(text) {
  const withoutPlaceholders = String(text || '')
    .replace(/\{\{\s*[^}]+\s*\}\}/g, ' ')
    .replace(/\{[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*\}/g, ' ');

  const tokens = withoutPlaceholders.split(/\s+/).filter(Boolean);

  const cssTokenPrefixPattern = /^(text|bg|border|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min-w|max-w|min-h|max-h|flex|grid|gap|items|justify|self|place|content|space|divide|ring|shadow|opacity|z|top|left|right|bottom|inset|rounded|cursor|overflow|display|position|stroke|fill|animate|transition|transform|scale|rotate|translate|skew|origin|filter|backdrop|brightness|contrast|blur|saturate|hue|font|leading|tracking|col|row)-/i;
  const hasStrongCssSignal = tokens.some((t) => {
    const lower = String(t || '').toLowerCase();
    return (
      /-\d/.test(lower) ||
      /[:\[\]\/]/.test(lower) ||
      /^!/.test(lower) ||
      cssTokenPrefixPattern.test(lower) ||
      isUnderscoreCssToken(lower)
    );
  });
  
  // Handle edge case: single token that looks like CSS
  if (tokens.length === 1) {
    const token = tokens[0];
    if (isUnderscoreCssToken(token)) {
      return true;
    }
    // Check for Tailwind-style classes: text-gray-200, stroke-current, etc.
    if (/^[a-z]+(?:-[a-z0-9]+)+$/i.test(token) && 
        (/\d+/.test(token) || /^(text|bg|border|p|m|w|h|flex|grid|items|justify|self|place|gap|space|divide|ring|shadow|opacity|z|top|left|right|bottom|inset|rounded|cursor|overflow|display|position|stroke|fill|animate|transition|transform|scale|rotate|translate|skew|origin|filter|backdrop|brightness|contrast|blur|saturate|hue|current|auto|full|none|start|end|center|stretch|between|around|evenly|primary|secondary|success|danger|warning|info|light|dark|white|black|gray|grey|red|blue|green|yellow|purple|pink|indigo|teal|orange|cyan|amber|lime|emerald|sky|violet|fuchsia|rose)-/i.test(token) || 
         /^(current|auto|full|none|start|end|center|stretch|between|around|evenly)$/i.test(token))) {
      return true;
    }
  }
  
  if (tokens.length < 2) {
    return false;
  }

  const cssKeywords = new Set([
    'absolute',
    'relative',
    'fixed',
    'sticky',
    'static',
    'transform',
    'transition',
    'animate',
    'duration',
    'ease',
    'delay',
    'inline',
    'block',
    'flex',
    'grid',
    'hidden',
    'visible',
    'border',
    'rounded',
    'shadow',
    'overflow',
    'cursor',
    'pointer',
    'stroke',
    'current',
    'currentColor',
  ]);

  let cssLikeCount = 0;
  for (const token of tokens) {
    const lower = String(token || '').toLowerCase();
    if (isUnderscoreCssToken(lower)) {
      cssLikeCount += 1;
      continue;
    }
    if (cssKeywords.has(lower)) {
      cssLikeCount += 1;
      continue;
    }
    // Tailwind-style classes: text-gray-200, stroke-current, bg-blue-500, etc.
    if (/^-?[a-z][a-z0-9]*(?:-[a-z0-9/:%]+)+$/.test(lower)) {
      if (/\d/.test(lower) || /[:\[\]\/]/.test(lower) || /^!/.test(lower) || cssTokenPrefixPattern.test(lower)) {
        cssLikeCount += 1;
        continue;
      }
    }
    // Numeric suffixes: mb3, p2, w100, etc.
    if (/^[a-z]+[0-9]+$/.test(lower)) {
      cssLikeCount += 1;
      continue;
    }
    // CSS color/value keywords: current, auto, full, none, etc.
    // Use exact word boundaries to prevent substring matching
    if (/^(current|auto|full|none|start|end|center|stretch|between|around|evenly|primary|secondary|success|danger|warning|info|light|dark|white|black|gray|grey|red|blue|green|yellow|purple|pink|indigo|teal|orange|cyan|amber|lime|emerald|sky|violet|fuchsia|rose)$/i.test(lower)) {
      if (hasStrongCssSignal) {
        cssLikeCount += 1;
      }
    }
  }

  // For 2 tokens, both must look like CSS
  if (tokens.length === 2) {
    return cssLikeCount === 2;
  }

  // For short strings (3-4 tokens), be stricter
  if (tokens.length >= 3 && tokens.length <= 4) {
    return cssLikeCount >= 2 && cssLikeCount / tokens.length >= 0.6;
  }

  // For longer strings (common in Tailwind), be more lenient
  if (tokens.length >= 5) {
    return cssLikeCount / tokens.length >= 0.5;
  }
  
  return false;
}

/**
 * Check if text is non-translatable
 * Combines pattern-based ignores with linguistic validation
 */
function isNonTranslatableText(text, patterns) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return true;
  
  const normalized = trimmed.replace(/\s+/g, ' ');

  if (isPlaceholderOnlyText(normalized)) {
    return true;
  }

  // CSS / utility-class blobs (e.g. Tailwind strings) are non-translatable
  if (isCssUtilityString(normalized)) {
    return true;
  }

  // Full CSS rule blocks (selectors with `{}` and declarations) are clearly non-translatable
  // Example: "table { border-collapse: collapse; width: 100%; ... } .sheet-title { ... }"
  if (/\{[^}]*:[^;]+;[^}]*\}/.test(normalized)) {
    return true;
  }

  // Check exact matches
  if (patterns && Array.isArray(patterns.exact) && patterns.exact.includes(normalized)) {
    return true;
  }

  // Check case-insensitive exact matches
  if (patterns && Array.isArray(patterns.exactInsensitive)) {
    const lowerNorm = normalized.toLowerCase();
    for (const v of patterns.exactInsensitive) {
      if (String(v).toLowerCase() === lowerNorm) {
        return true;
      }
    }
  }

  // Check contains patterns
  if (patterns && Array.isArray(patterns.contains)) {
    for (const part of patterns.contains) {
      if (part && normalized.includes(String(part))) {
        return true;
      }
    }
  }

  // Apply comprehensive linguistic validation (includes phonetic patterns and new validators when available)
  // Prefer the unified shouldTranslateText (which uses validators) when available,
  // otherwise fall back to the legacy isTranslatableText heuristic.
  if (newValidators && newValidators.shouldTranslate) {
    if (!newValidators.shouldTranslate(normalized, { ignorePatterns: patterns })) {
      return true;
    }
  } else if (!isTranslatableText(normalized)) {
    return true;
  }

  return false;
}

/**
 * Check if text should be translated
 */
function shouldTranslateText(text, patterns) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  
  // Use new validators if available for improved accuracy
  if (newValidators && newValidators.shouldTranslate) {
    return newValidators.shouldTranslate(trimmed, { ignorePatterns: patterns });
  }
  
  // Legacy behavior
  const pats = patterns || getIgnorePatterns();
  if (isNonTranslatableText(trimmed, pats)) return false;
  
  // Check for unbalanced parentheses
  const openParens = (trimmed.match(/\(/g) || []).length;
  const closeParens = (trimmed.match(/\)/g) || []).length;
  if (openParens !== closeParens) return false;
  
  return true;
}

/**
 * Check if text should be ignored (inverse of shouldTranslateText)
 * This is an alias for compatibility with babel-extract-i18n.js
 */
function shouldIgnoreText(text, patterns) {
  return !shouldTranslateText(text, patterns);
}

module.exports = {
  loadIgnorePatterns,
  getIgnorePatterns,
  shouldIgnoreAttribute,
  isPlaceholderOnlyText,
  isCssUtilityString,
  isNonTranslatableText,
  shouldTranslateText,
  shouldIgnoreText,
};
