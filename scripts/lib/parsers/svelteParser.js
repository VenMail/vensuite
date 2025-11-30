/**
 * Svelte Parser
 * 
 * Handles Svelte and SvelteKit frameworks.
 * Supports: .svelte files
 */

const { BaseParser } = require('./baseParser');
const { shouldTranslate, isTranslatableAttribute, isNonTranslatableAttribute } = require('../validators');

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

    results.stats.processed = 1;

    // Remove script and style blocks
    let template = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Remove Svelte block expressions
    template = template
      .replace(/\{#[^}]+\}/g, '')
      .replace(/\{:[^}]+\}/g, '')
      .replace(/\{\/[^}]+\}/g, '');

    // Parse text content
    const tagRegex = /<([A-Za-z][A-Za-z0-9_.-]*)\b([^>]*)>([^<]*)</g;
    let match;

    while ((match = tagRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      let rawText = match[3];

      // Remove Svelte expressions from text
      rawText = rawText.replace(/\{[^}]+\}/g, '');
      const text = rawText.replace(/\s+/g, ' ').trim();

      if (text && shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        results.items.push({
          type: 'text',
          text,
          kind: this.inferKindFromTag(tagName),
          parentTag: tagName,
        });
        results.stats.extracted++;
      }

      // Parse attributes
      this.parseAttributes(attributes, tagName, results);
    }

    return results;
  }

  parseAttributes(attrString, tagName, results) {
    if (!attrString) return;

    const attrRegex = /([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*["']([^"'{]+)["']/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
      const attrName = match[1];
      const attrValue = match[2];

      // Skip Svelte-specific attributes
      if (/^(on|bind|use|class|style|transition|animate|in|out):/.test(attrName)) continue;
      if (isNonTranslatableAttribute(attrName)) continue;
      if (!isTranslatableAttribute(attrName)) continue;

      const text = attrValue.trim();
      if (text && shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        results.items.push({
          type: 'attribute',
          text,
          kind: this.inferKindFromAttr(attrName),
          attributeName: attrName,
          parentTag: tagName,
        });
        results.stats.extracted++;
      }
    }
  }
}

module.exports = { SvelteParser };
