/**
 * Vue Parser
 * 
 * Handles Vue 2, Vue 3, Nuxt 2, Nuxt 3, and Quasar frameworks.
 * Supports: .vue files (Single File Components)
 * 
 * Features:
 * - Proper state-machine based template parsing
 * - Vue directive handling (v-if, v-for, @click, :prop, etc.)
 * - Composition API and Options API support
 * - Nuxt-specific components (NuxtLink, etc.)
 */

const { BaseParser, decodeHtmlEntities } = require('./baseParser');
const { shouldTranslate, isTranslatableAttribute, isNonTranslatableAttribute, LOGGING_LINE_PATTERNS } = require('../validators');

// Parser states
const STATE = {
  TEXT: 'TEXT',
  TAG_OPEN: 'TAG_OPEN',
  TAG_NAME: 'TAG_NAME',
  TAG_SPACE: 'TAG_SPACE',
  ATTR_NAME: 'ATTR_NAME',
  ATTR_EQUALS: 'ATTR_EQUALS',
  ATTR_VALUE_START: 'ATTR_VALUE_START',
  ATTR_VALUE: 'ATTR_VALUE',
  TAG_CLOSE: 'TAG_CLOSE',
  COMMENT: 'COMMENT',
  SCRIPT: 'SCRIPT',
  STYLE: 'STYLE',
};

class VueParser extends BaseParser {
  static getExtensions() {
    return ['vue'];
  }

  static getName() {
    return 'Vue (Vue 2/3, Nuxt 2/3, Quasar)';
  }

  /**
   * Parse Vue SFC content
   * @param {string} content
   * @param {Object} options
   * @returns {Object}
   */
  parse(content, options = {}) {
    const results = {
      items: [],
      stats: { processed: 0, extracted: 0, errors: 0 },
      errors: [],
    };

    if (!content || typeof content !== 'string') {
      return results;
    }

    // Handle code blocks that might break state machine parsing
    if (content.includes('```') || content.includes('`')) {
      // Replace code blocks with placeholders to avoid parsing issues
      content = content.replace(/```[\s\S]*?```/g, '<code-block></code-block>');
      content = content.replace(/`[^`]+`/g, '<inline-code></inline-code>');
    }

    // Ensure ignore patterns from options are respected by helper methods
    this.ignorePatterns = options.ignorePatterns || this.ignorePatterns || {};

    results.stats.processed = 1;

    // Extract and parse template section
    const template = this.extractTemplate(content);
    if (template) {
      this.parseTemplate(template, results);
    }

    // Also extract from script section for i18n keys
    const script = this.extractScript(content);
    if (script) {
      this.parseScript(script, results);
    }

    return results;
  }

  /**
   * Extract template section from Vue SFC
   * Handles nested <template> tags (Vue slots) by finding the matching closing tag
   */
  extractTemplate(content) {
    // Find the opening <template> tag at the root level
    const openMatch = content.match(/^[\s\S]*?<template(\s[^>]*)?>|<template(\s[^>]*)?>/i);
    if (!openMatch) return null;

    const startIndex = openMatch.index + openMatch[0].length;
    let depth = 1;
    let pos = startIndex;
    const len = content.length;

    while (pos < len && depth > 0) {
      // Look for <template or </template
      const nextOpen = content.indexOf('<template', pos);
      const nextClose = content.indexOf('</template>', pos);

      if (nextClose === -1) {
        // No closing tag found
        break;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Check if it's actually a template tag (not something like <templateFoo>)
        const afterOpen = content[nextOpen + 9]; // character after '<template'
        if (!afterOpen || /[\s>\/]/.test(afterOpen)) {
          depth++;
        }
        pos = nextOpen + 9;
      } else {
        depth--;
        if (depth === 0) {
          return content.slice(startIndex, nextClose);
        }
        pos = nextClose + 11; // length of '</template>'
      }
    }

    // Fallback: try greedy match for the last </template>
    const greedyMatch = content.match(/<template[^>]*>([\s\S]*)<\/template>/i);
    return greedyMatch ? greedyMatch[1] : null;
  }

  /**
   * Extract script section from Vue SFC
   */
  extractScript(content) {
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    return match ? match[1] : null;
  }

  /**
   * Parse Vue template using state machine
   */
  parseTemplate(template, results) {
    let state = STATE.TEXT;
    let pos = 0;
    let textStart = 0;
    let tagName = '';
    let attrName = '';
    let attrValue = '';
    let attrQuote = '';
    let currentTag = '';
    let tagStack = [];

    const len = template.length;

    const getCurrentParentTag = () => {
      return tagStack.length > 0 ? tagStack[tagStack.length - 1] : null;
    };

    const processTextContent = (text) => {
      if (!text) return;

      // First, look inside Vue mustache expressions for string literals that should be translated.
      // This covers patterns like:
      //   {{ searchValue ? "No matching files found" : "No files found" }}
      //   {{ searchValue ? 'No matching files found' : 'No files found' }}
      try {
        // Use a more robust approach to extract mustache expressions
        // that handles nested braces in string literals
        const mustacheExpressions = this.extractMustacheExpressions(text);
        const parentTag = getCurrentParentTag();

        for (const expr of mustacheExpressions) {
          if (!expr) continue;

          // Find all string literals inside the expression. We deliberately just
          // hand candidates to shouldTranslate; validators will reject keys,
          // technical identifiers, etc.
          const stringRegex = /(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\1/g;
          let strMatch;
          while ((strMatch = stringRegex.exec(expr)) !== null) {
            const candidate = (strMatch[2] || '').trim();
            if (!candidate) continue;

            if (!shouldTranslate(candidate, { ignorePatterns: this.ignorePatterns })) {
              continue;
            }

            const kind = this.inferKindFromTag(parentTag);
            results.items.push({
              type: 'text',
              text: candidate,
              kind,
              parentTag,
            });
            results.stats.extracted++;
          }
        }
      } catch {
        // Best-effort extraction; ignore mustache parsing errors.
      }

      // Now handle any plain text outside of mustache expressions.
      // For validation, we need to preserve placeholders to ensure the text is still meaningful
      let cleanText = text;
      const mustacheRanges = this.getMustacheRanges(text);
      
      // Create a version with placeholders replaced for validation
      let validationText = text;
      // Replace mustache expressions with generic placeholders to preserve text structure
      for (let i = mustacheRanges.length - 1; i >= 0; i--) {
        const { start, end } = mustacheRanges[i];
        validationText = validationText.slice(0, start) + '{placeholder}' + validationText.slice(end);
      }
      validationText = validationText.replace(/\s+/g, ' ').trim();

      if (!validationText) return;
      
      // Decode HTML entities before validation
      validationText = decodeHtmlEntities(validationText);

      // Validate the text with placeholders preserved
      if (shouldTranslate(validationText, { ignorePatterns: this.ignorePatterns })) {
        // For the actual extracted text, preserve mustache expressions as placeholders
        // This ensures the text is complete and can be properly replaced later
        let extractedText = text;
        // Replace mustache expressions with standardized placeholders for consistency
        for (let i = mustacheRanges.length - 1; i >= 0; i--) {
          const { start, end } = mustacheRanges[i];
          const expression = text.slice(start + 2, end - 2).trim(); // Get content inside {{ }}
          extractedText = extractedText.slice(0, start) + `{{ ${expression} }}` + extractedText.slice(end);
        }
        extractedText = extractedText.replace(/\s+/g, ' ').trim();
        extractedText = decodeHtmlEntities(extractedText);

        const kind = this.inferKindFromTag(getCurrentParentTag());
        results.items.push({
          type: 'text',
          text: extractedText,
          kind,
          parentTag: getCurrentParentTag(),
        });
        results.stats.extracted++;
      }
    };

    const processAttributeValue = (name, value, tag) => {
      if (!name || !value) return;

      // Skip Vue directives and bindings
      if (isNonTranslatableAttribute(name)) return;
      if (!isTranslatableAttribute(name)) return;

      const cleanValue = value.replace(/\s+/g, ' ').trim();
      if (!cleanValue) return;

      if (shouldTranslate(cleanValue, { ignorePatterns: this.ignorePatterns })) {
        const kind = this.inferKindFromAttr(name);
        results.items.push({
          type: 'attribute',
          text: cleanValue,
          kind,
          attributeName: name,
          parentTag: tag,
        });
        results.stats.extracted++;
      }
    };

    // Main parsing loop
    while (pos < len) {
      const char = template[pos];
      const nextChar = pos + 1 < len ? template[pos + 1] : '';

      switch (state) {
        case STATE.TEXT: {
          if (char === '<' && template.slice(pos, pos + 4) === '<!--') {
            const text = template.slice(textStart, pos);
            if (text.trim()) processTextContent(text);
            state = STATE.COMMENT;
            pos += 4;
            continue;
          }

          if (char === '<') {
            const text = template.slice(textStart, pos);
            if (text.trim()) processTextContent(text);

            if (nextChar === '/') {
              state = STATE.TAG_CLOSE;
              pos += 2;
              tagName = '';
            } else if (/[a-zA-Z]/.test(nextChar)) {
              state = STATE.TAG_NAME;
              pos += 1;
              tagName = '';
            } else {
              pos += 1;
            }
            continue;
          }

          pos += 1;
          break;
        }

        case STATE.COMMENT: {
          if (char === '-' && template.slice(pos, pos + 3) === '-->') {
            pos += 3;
            state = STATE.TEXT;
            textStart = pos;
            continue;
          }
          pos += 1;
          break;
        }

        case STATE.TAG_NAME: {
          if (/[a-zA-Z0-9_:-]/.test(char)) {
            tagName += char;
            pos += 1;
          } else if (char === '>' || char === '/') {
            currentTag = tagName;
            const lowerTag = tagName.toLowerCase();

            if (lowerTag === 'script') {
              state = STATE.SCRIPT;
            } else if (lowerTag === 'style') {
              state = STATE.STYLE;
            } else if (char === '/') {
              if (template[pos + 1] === '>') pos += 2;
              else pos += 1;
              state = STATE.TEXT;
              textStart = pos;
            } else {
              tagStack.push(tagName);
              pos += 1;
              state = STATE.TEXT;
              textStart = pos;
            }
          } else if (/\s/.test(char)) {
            currentTag = tagName;
            state = STATE.TAG_SPACE;
            pos += 1;
          } else {
            pos += 1;
          }
          break;
        }

        case STATE.TAG_SPACE: {
          if (/\s/.test(char)) {
            pos += 1;
          } else if (char === '>') {
            const lowerTag = currentTag.toLowerCase();
            if (lowerTag === 'script') {
              state = STATE.SCRIPT;
              pos += 1;
            } else if (lowerTag === 'style') {
              state = STATE.STYLE;
              pos += 1;
            } else {
              tagStack.push(currentTag);
              pos += 1;
              state = STATE.TEXT;
              textStart = pos;
            }
          } else if (char === '/') {
            if (template[pos + 1] === '>') pos += 2;
            else pos += 1;
            state = STATE.TEXT;
            textStart = pos;
          } else if (/[a-zA-Z@:#v]/.test(char)) {
            state = STATE.ATTR_NAME;
            attrName = char;
            pos += 1;
          } else {
            pos += 1;
          }
          break;
        }

        case STATE.ATTR_NAME: {
          if (/[a-zA-Z0-9_:@#.\-\[\]]/.test(char)) {
            attrName += char;
            pos += 1;
          } else if (char === '=') {
            state = STATE.ATTR_VALUE_START;
            pos += 1;
          } else if (/\s/.test(char)) {
            state = STATE.TAG_SPACE;
            pos += 1;
          } else if (char === '>' || char === '/') {
            if (char === '/') {
              if (template[pos + 1] === '>') pos += 2;
              else pos += 1;
              state = STATE.TEXT;
              textStart = pos;
            } else {
              tagStack.push(currentTag);
              pos += 1;
              state = STATE.TEXT;
              textStart = pos;
            }
          } else {
            pos += 1;
          }
          break;
        }

        case STATE.ATTR_VALUE_START: {
          if (char === '"' || char === "'") {
            attrQuote = char;
            attrValue = '';
            state = STATE.ATTR_VALUE;
            pos += 1;
          } else if (/\s/.test(char)) {
            pos += 1;
          } else {
            attrQuote = '';
            attrValue = char;
            state = STATE.ATTR_VALUE;
            pos += 1;
          }
          break;
        }

        case STATE.ATTR_VALUE: {
          if (attrQuote) {
            if (char === attrQuote) {
              processAttributeValue(attrName, attrValue, currentTag);
              state = STATE.TAG_SPACE;
              pos += 1;
            } else {
              attrValue += char;
              pos += 1;
            }
          } else {
            if (/[\s>\/]/.test(char)) {
              processAttributeValue(attrName, attrValue, currentTag);
              if (char === '>') {
                tagStack.push(currentTag);
                state = STATE.TEXT;
                textStart = pos + 1;
              } else {
                state = STATE.TAG_SPACE;
              }
              pos += 1;
            } else {
              attrValue += char;
              pos += 1;
            }
          }
          break;
        }

        case STATE.TAG_CLOSE: {
          if (char === '>') {
            const closingTag = tagName.toLowerCase();
            while (tagStack.length > 0) {
              const top = tagStack.pop();
              if (top.toLowerCase() === closingTag) break;
            }
            pos += 1;
            state = STATE.TEXT;
            textStart = pos;
            tagName = '';
          } else if (/[a-zA-Z0-9_:-]/.test(char)) {
            tagName += char;
            pos += 1;
          } else {
            pos += 1;
          }
          break;
        }

        case STATE.SCRIPT: {
          if (char === '<' && template.slice(pos, pos + 9).toLowerCase() === '</script>') {
            pos += 9;
            state = STATE.TEXT;
            textStart = pos;
            continue;
          }
          pos += 1;
          break;
        }

        case STATE.STYLE: {
          if (char === '<' && template.slice(pos, pos + 8).toLowerCase() === '</style>') {
            pos += 8;
            state = STATE.TEXT;
            textStart = pos;
            continue;
          }
          pos += 1;
          break;
        }

        default:
          pos += 1;
      }
    }

    // Process remaining text
    if (state === STATE.TEXT && textStart < len) {
      const text = template.slice(textStart);
      if (text.trim()) processTextContent(text);
    }
  }

  /**
   * Parse script section for i18n patterns
   */
  parseScript(script, results) {
    // Look for common i18n patterns in Vue scripts
    // This is a simplified extraction - the JSX parser handles full AST parsing

    const { shouldTranslate } = require('../validators');

    if (!script || typeof script !== 'string') {
      return;
    }

    const lines = script.split('\n');

    // First, identify lines that contain explicit i18n key lookups or logging
    // so we avoid treating those strings as user-facing text.
    const skipLineIndexes = new Set();
    const i18nLinePatterns = [
      /\$?t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /i18n\.t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /useI18n\(\)\.t\s*\(\s*['"][^'"]+['"]\s*\)/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of i18nLinePatterns) {
        if (pattern.test(line)) {
          skipLineIndexes.add(i);
          break;
        }
      }
      if (!skipLineIndexes.has(i)) {
        for (const logPattern of LOGGING_LINE_PATTERNS) {
          if (logPattern.test(line)) {
            skipLineIndexes.add(i);
            break;
          }
        }
      }
    }

    // Now scan for string literals in the script (computed(), methods, etc.)
    const stringPatterns = [
      /'([^'\\\n]{3,200})'/g,
      /"([^"\\\n]{3,200})"/g,
    ];

    // Also look for ref() and reactive() calls with string values
    const refPatterns = [
      /ref\s*\(\s*['"]([^'"]{3,200})['"]\s*\)/g,
      /reactive\s*\(\s*\{[^}]*['"]([^'"]{3,200})['"][^}]*\}\s*\)/g,
      /shallowRef\s*\(\s*['"]([^'"]{3,200})['"]\s*\)/g,
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line || !line.trim()) continue;

      // Skip import/export lines
      if (/^\s*(import|export)\s/.test(line)) continue;

      // Check ref patterns first (higher priority)
      for (const pattern of refPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const candidate = (match[1] || '').trim();
          if (!candidate) continue;

          if (skipLineIndexes.has(lineIndex)) continue;

          if (!shouldTranslate(candidate, { ignorePatterns: this.ignorePatterns })) {
            continue;
          }

          results.items.push({
            type: 'string',
            text: candidate,
            kind: 'text',
          });
          results.stats.extracted++;
        }
      }

      // Then check general string patterns
      for (const pattern of stringPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const candidate = (match[1] || '').trim();
          if (!candidate) continue;

          // Skip obvious i18n key lookups; validators will also reject most keys,
          // but this keeps noise down if keys look like natural language.
          if (skipLineIndexes.has(lineIndex)) {
            continue;
          }

          if (!shouldTranslate(candidate, { ignorePatterns: this.ignorePatterns })) {
            continue;
          }

          results.items.push({
            type: 'string',
            text: candidate,
            kind: 'text',
          });
          results.stats.extracted++;
        }
      }
    }
  }

  /**
   * Extract mustache expressions from text, handling nested braces in strings
   * This is more robust than a simple regex when expressions contain }
   */
  extractMustacheExpressions(text) {
    const expressions = [];
    let pos = 0;
    const len = text.length;

    while (pos < len) {
      // Find opening {{
      const start = text.indexOf('{{', pos);
      if (start === -1) break;

      // Parse the expression, tracking quotes and braces
      let depth = 2; // We've seen {{
      let exprStart = start + 2;
      let i = exprStart;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let inBacktick = false;
      let escaped = false;

      while (i < len && depth > 0) {
        const char = text[i];

        if (escaped) {
          escaped = false;
          i++;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          i++;
          continue;
        }

        // Track string state
        if (!inDoubleQuote && !inBacktick && char === "'") {
          inSingleQuote = !inSingleQuote;
        } else if (!inSingleQuote && !inBacktick && char === '"') {
          inDoubleQuote = !inDoubleQuote;
        } else if (!inSingleQuote && !inDoubleQuote && char === '`') {
          inBacktick = !inBacktick;
        }

        // Only track braces outside of strings
        if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
          if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
          }
        }

        i++;
      }

      if (depth === 0) {
        // Extract the expression (excluding the closing }})
        const expr = text.slice(exprStart, i - 2).trim();
        if (expr) {
          expressions.push(expr);
        }
      }

      pos = i;
    }

    return expressions;
  }

  /**
   * Get the start and end positions of all mustache expressions in text.
   * Used to properly remove mustache expressions while handling nested braces in strings.
   * @param {string} text - The text to parse
   * @returns {Array<{start: number, end: number}>} - Array of ranges
   */
  getMustacheRanges(text) {
    const ranges = [];
    let pos = 0;
    const len = text.length;

    while (pos < len) {
      const start = text.indexOf('{{', pos);
      if (start === -1) break;

      let depth = 2;
      let i = start + 2;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let inBacktick = false;
      let escaped = false;

      while (i < len && depth > 0) {
        const char = text[i];

        if (escaped) {
          escaped = false;
          i++;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          i++;
          continue;
        }

        if (!inDoubleQuote && !inBacktick && char === "'") {
          inSingleQuote = !inSingleQuote;
        } else if (!inSingleQuote && !inBacktick && char === '"') {
          inDoubleQuote = !inDoubleQuote;
        } else if (!inSingleQuote && !inDoubleQuote && char === '`') {
          inBacktick = !inBacktick;
        }

        if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
          if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
          }
        }

        i++;
      }

      if (depth === 0) {
        ranges.push({ start, end: i });
      }

      pos = i;
    }

    return ranges;
  }

  /**
   * Override inferKindFromTag to include Vue/Nuxt specific components
   */
  inferKindFromTag(tagName) {
    if (!tagName) return 'text';
    const lower = tagName.toLowerCase();

    // Nuxt-specific
    if (lower === 'nuxt-link' || lower === 'nuxtlink') return 'link';
    if (lower === 'nuxt-page' || lower === 'nuxtpage') return 'text';

    // Vue Router
    if (lower === 'router-link' || lower === 'routerlink') return 'link';
    if (lower === 'router-view' || lower === 'routerview') return 'text';

    // Quasar components
    if (lower.startsWith('q-btn')) return 'button';
    if (lower.startsWith('q-input')) return 'placeholder';
    if (lower.startsWith('q-select')) return 'placeholder';
    if (lower.startsWith('q-dialog')) return 'heading';
    if (lower.startsWith('q-card-section')) return 'text';

    // Vuetify components
    if (lower.startsWith('v-btn')) return 'button';
    if (lower.startsWith('v-text-field')) return 'placeholder';
    if (lower.startsWith('v-select')) return 'placeholder';
    if (lower.startsWith('v-dialog')) return 'heading';
    if (lower.startsWith('v-card-title')) return 'heading';
    if (lower.startsWith('v-card-text')) return 'text';

    // Element Plus / Element UI
    if (lower === 'el-button') return 'button';
    if (lower === 'el-input') return 'placeholder';
    if (lower === 'el-select') return 'placeholder';
    if (lower === 'el-dialog') return 'heading';

    // PrimeVue
    if (lower === 'p-button' || lower === 'button') return 'button';
    if (lower === 'p-inputtext' || lower === 'inputtext') return 'placeholder';
    if (lower === 'p-dialog' || lower === 'dialog') return 'heading';

    return super.inferKindFromTag(tagName);
  }
}

module.exports = { VueParser };
