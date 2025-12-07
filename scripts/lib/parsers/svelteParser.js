/**
 * Svelte Parser
 * 
 * Handles Svelte and SvelteKit frameworks.
 * Supports: .svelte files
 * 
 * Features:
 * - State-machine based template parsing for accurate text extraction
 * - Svelte directive handling ({#if}, {#each}, {#await}, etc.)
 * - Svelte expression handling ({expression})
 * - Multi-line text content support
 */

const { BaseParser } = require('./baseParser');
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
  SVELTE_BLOCK: 'SVELTE_BLOCK',
};

class SvelteParser extends BaseParser {
  static getExtensions() {
    return ['svelte'];
  }

  static getName() {
    return 'Svelte (Svelte, SvelteKit)';
  }

  parse(content, options = {}) {
    const results = {
      items: [],
      stats: { processed: 0, extracted: 0, errors: 0 },
      errors: [],
    };

    if (!content || typeof content !== 'string') {
      return results;
    }

    // Ensure ignore patterns from options are respected by helper methods
    this.ignorePatterns = options.ignorePatterns || this.ignorePatterns || {};

    results.stats.processed = 1;

    // Parse the template using state machine
    this.parseTemplate(content, results);

    // Also extract from script section for string literals
    const script = this.extractScript(content);
    if (script) {
      this.parseScript(script, results);
    }

    return results;
  }

  /**
   * Extract script section from Svelte file
   */
  extractScript(content) {
    // Match both <script> and <script context="module"> or <script lang="ts">
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    return match ? match[1] : null;
  }

  /**
   * Parse script section for string literals
   */
  parseScript(script, results) {
    if (!script || typeof script !== 'string') {
      return;
    }

    const lines = script.split('\n');

    // First, identify lines that contain explicit i18n key lookups or logging
    const skipLineIndexes = new Set();
    const i18nLinePatterns = [
      /\$?t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /i18n\.t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /\$t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /\$_\s*\(\s*['"][^'"]+['"]\s*\)/,  // svelte-i18n pattern
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

    // Scan for string literals in reactive declarations, refs, etc.
    const stringPatterns = [
      /'([^'\\\n]{3,200})'/g,
      /"([^"\\\n]{3,200})"/g,
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line || !line.trim()) continue;

      // Skip import/export lines
      if (/^\s*(import|export)\s/.test(line)) continue;

      for (const pattern of stringPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const candidate = (match[1] || '').trim();
          if (!candidate) continue;

          // Skip i18n key lookups
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
   * Parse Svelte template using state machine
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

      // First, look inside Svelte expressions for string literals that should be translated.
      // This covers patterns like:
      //   {searchValue ? "No matching files found" : "No files found"}
      //   {searchValue ? 'No matching files found' : 'No files found'}
      try {
        // Match Svelte expressions (but not block expressions like {#if}, {:else}, {/if})
        const exprRegex = /\{(?![#:\/])([^}]+)\}/g;
        let exprMatch;
        const parentTag = getCurrentParentTag();

        while ((exprMatch = exprRegex.exec(text)) !== null) {
          const expr = (exprMatch[1] || '').trim();
          if (!expr) continue;

          // Find all string literals inside the expression
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
        // Best-effort extraction; ignore expression parsing errors.
      }

      // Now handle any plain text outside of Svelte expressions.
      let cleanText = text
        .replace(/\{[^}]+\}/g, '')  // Remove all {expression} patterns
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      if (shouldTranslate(cleanText, { ignorePatterns: this.ignorePatterns })) {
        const kind = this.inferKindFromTag(getCurrentParentTag());
        results.items.push({
          type: 'text',
          text: cleanText,
          kind,
          parentTag: getCurrentParentTag(),
        });
        results.stats.extracted++;
      }
    };

    const processAttributeValue = (name, value, tag) => {
      if (!name || !value) return;

      // Skip Svelte-specific attributes
      if (/^(on|bind|use|class|style|transition|animate|in|out):/.test(name)) return;
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
          // Check for HTML comment
          if (char === '<' && template.slice(pos, pos + 4) === '<!--') {
            const text = template.slice(textStart, pos);
            if (text.trim()) processTextContent(text);
            state = STATE.COMMENT;
            pos += 4;
            continue;
          }

          // Check for tag start
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
          } else if (/[a-zA-Z@:#]/.test(char)) {
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
          } else if (char === '{') {
            // Svelte expression as attribute value - skip it
            let braceCount = 1;
            pos += 1;
            while (pos < len && braceCount > 0) {
              if (template[pos] === '{') braceCount++;
              else if (template[pos] === '}') braceCount--;
              pos++;
            }
            state = STATE.TAG_SPACE;
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
            } else if (char === '{') {
              // Svelte expression inside quoted attribute - skip the expression part
              attrValue += char;
              pos += 1;
              let braceCount = 1;
              while (pos < len && braceCount > 0) {
                if (template[pos] === '{') braceCount++;
                else if (template[pos] === '}') braceCount--;
                attrValue += template[pos];
                pos++;
              }
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
   * Override inferKindFromTag to include Svelte/SvelteKit specific components
   */
  inferKindFromTag(tagName) {
    if (!tagName) return 'text';
    const lower = tagName.toLowerCase();

    // SvelteKit specific
    if (lower === 'a' && tagName === 'a') return 'link';

    // Common Svelte UI library components
    if (lower.includes('button') || lower.includes('btn')) return 'button';
    if (lower.includes('link')) return 'link';
    if (lower.includes('input') || lower.includes('field')) return 'placeholder';
    if (lower.includes('dialog') || lower.includes('modal')) return 'heading';

    return super.inferKindFromTag(tagName);
  }
}

module.exports = { SvelteParser };
