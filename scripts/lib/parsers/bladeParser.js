/**
 * Blade Parser
 * 
 * Handles Laravel Blade templates.
 * Supports: .blade.php files
 * 
 * Frameworks: Laravel, Laravel with Inertia, Laravel Breeze, Laravel Jetstream
 * 
 * Features:
 * - Blade directive handling (@if, @foreach, @lang, etc.)
 * - Already-translated content detection (__(), trans(), @lang)
 * - Livewire component support
 * - Alpine.js attribute handling
 */

const { BaseParser } = require('./baseParser');
const { shouldTranslate, isTranslatableAttribute, isNonTranslatableAttribute } = require('../validators');

class BladeParser extends BaseParser {
  static getExtensions() {
    return ['blade.php'];
  }

  static getName() {
    return 'Blade (Laravel, Inertia, Livewire)';
  }

  static canHandle(filePath) {
    return filePath.toLowerCase().endsWith('.blade.php');
  }

  /**
   * Parse Blade template content
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

    results.stats.processed = 1;

    // Remove Blade comments
    let template = content.replace(/\{\{--[\s\S]*?--\}\}/g, ' ');

    // Remove PHP blocks
    template = template.replace(/<\?php[\s\S]*?\?>/g, ' ');
    template = template.replace(/<\?=[\s\S]*?\?>/g, ' ');

    // Parse HTML-like content
    this.parseHtmlContent(template, results);

    // Parse Blade-specific patterns
    this.parseBladePatterns(template, results);

    return results;
  }

  /**
   * Parse HTML content from Blade template
   */
  parseHtmlContent(template, results) {
    // Match text content between tags
    const tagRegex = /<([A-Za-z][A-Za-z0-9-_]*)\b([^>]*)>([^<]*)<\/\1>/g;
    let match;

    while ((match = tagRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const rawText = match[3];

      // Skip if already translated
      if (this.isAlreadyTranslated(rawText)) continue;

      // Skip Blade expressions
      if (rawText.includes('{{') || rawText.includes('{!!') || rawText.includes('@')) continue;

      const text = rawText.replace(/\s+/g, ' ').trim();
      if (!text) continue;

      if (shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        const kind = this.inferKindFromTag(tagName);
        results.items.push({
          type: 'text',
          text,
          kind,
          parentTag: tagName,
        });
        results.stats.extracted++;
      }

      // Also check translatable attributes
      this.parseAttributes(attributes, tagName, results);
    }

    // Match self-closing tags with translatable attributes
    const selfClosingRegex = /<([A-Za-z][A-Za-z0-9-_]*)\b([^>]*)\/?>/g;
    while ((match = selfClosingRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      this.parseAttributes(attributes, tagName, results);
    }
  }

  /**
   * Parse attributes from tag
   */
  parseAttributes(attrString, tagName, results) {
    if (!attrString) return;

    // Match attribute patterns
    const attrRegex = /([a-zA-Z][a-zA-Z0-9_:-]*)\s*=\s*["']([^"']+)["']/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
      const attrName = match[1];
      const attrValue = match[2];

      // Skip non-translatable attributes
      if (isNonTranslatableAttribute(attrName)) continue;
      if (!isTranslatableAttribute(attrName)) continue;

      // Skip if already translated
      if (this.isAlreadyTranslated(attrValue)) continue;

      // Skip Blade expressions
      if (attrValue.includes('{{') || attrValue.includes('{!!')) continue;

      const text = attrValue.replace(/\s+/g, ' ').trim();
      if (!text) continue;

      if (shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        const kind = this.inferKindFromAttr(attrName);
        results.items.push({
          type: 'attribute',
          text,
          kind,
          attributeName: attrName,
          parentTag: tagName,
        });
        results.stats.extracted++;
      }
    }
  }

  /**
   * Parse Blade-specific patterns
   */
  parseBladePatterns(template, results) {
    // Look for text in Blade section directives
    const sectionPatterns = [
      /@section\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
      /@yield\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const pattern of sectionPatterns) {
      let match;
      while ((match = pattern.exec(template)) !== null) {
        const sectionName = match[1];
        const defaultValue = match[2];

        // Skip if already translated
        if (this.isAlreadyTranslated(defaultValue)) continue;

        if (shouldTranslate(defaultValue, { ignorePatterns: this.ignorePatterns })) {
          results.items.push({
            type: 'string',
            text: defaultValue,
            kind: sectionName === 'title' ? 'title' : 'text',
          });
          results.stats.extracted++;
        }
      }
    }
  }

  /**
   * Check if text is already translated
   */
  isAlreadyTranslated(text) {
    if (!text) return false;
    return (
      text.includes("__('") ||
      text.includes('__("') ||
      text.includes("trans('") ||
      text.includes('trans("') ||
      text.includes('@lang(') ||
      text.includes('{{ __(') ||
      text.includes('{!! __(') ||
      text.includes('$t(') ||
      text.includes('t(')
    );
  }

  /**
   * Override inferKindFromTag for Laravel/Livewire components
   */
  inferKindFromTag(tagName) {
    if (!tagName) return 'text';
    const lower = tagName.toLowerCase();

    // Livewire components
    if (lower.startsWith('livewire:') || lower.startsWith('wire:')) {
      return 'text';
    }

    // Laravel Breeze / Jetstream components
    if (lower === 'x-button' || lower === 'x-primary-button' || lower === 'x-secondary-button') {
      return 'button';
    }
    if (lower === 'x-input' || lower === 'x-text-input') {
      return 'placeholder';
    }
    if (lower === 'x-label' || lower === 'x-input-label') {
      return 'label';
    }
    if (lower === 'x-modal') {
      return 'heading';
    }

    // Alpine.js patterns (x-data, x-show, etc. are attributes, not tags)

    return super.inferKindFromTag(tagName);
  }
}

module.exports = { BladeParser };
