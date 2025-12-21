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
const { STRING_PATTERNS } = require('../stringPatterns');

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

    // Parse plain text content that may contain Blade expressions
    this.parsePlainTextContent(template, results);

    // Parse Blade-specific patterns
    this.parseBladePatterns(template, results);

    return results;
  }

  /**
   * Parse plain text content that may contain Blade expressions
   */
  parsePlainTextContent(template, results) {
    // Split template by HTML tags and process the text parts
    const parts = template.split(/<[^>]*>/);
    
    for (const part of parts) {
      const text = part.trim();
      if (!text) continue;
      
      // Skip if already translated
      if (this.isAlreadyTranslated(text)) continue;
      
      // Skip pure Blade directives
      if (/^@[a-z]/i.test(text)) continue;
      
      // Process mixed content with Blade expressions
      // Replace Blade expressions with placeholders for validation
      const bladeMatches = [
        ...text.match(/\{\{\s*[^}]+\s*\}\}/g) || [],  // {{ expression }}
        ...text.match(/\{!!\s*[^}]+\s*!!\}/g) || []    // {!! expression !!}
      ];
      
      let validationText = text;
      bladeMatches.forEach((match, index) => {
        validationText = validationText.replace(match, `{blade_${index}}`);
      });
      
      // Skip if still has Blade directives after processing
      if (/@[a-z]/i.test(validationText)) continue;
      
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (!cleanText) continue;

      if (shouldTranslate(validationText, { ignorePatterns: this.ignorePatterns })) {
        results.items.push({
          type: 'text',
          text: cleanText,
          kind: 'text',
          parentTag: 'plain',
        });
        results.stats.extracted++;
      }
    }
  }

  /**
   * Parse HTML content from Blade template
   */
  parseHtmlContent(template, results) {
    // Match text content between tags (including multi-line)
    const tagRegex = /<([A-Za-z][A-Za-z0-9-_]*)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = tagRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const rawText = match[3];

      // Skip if already translated
      if (this.isAlreadyTranslated(rawText)) continue;

      // Process mixed content with Blade expressions
      // Extract text while preserving placeholders
      let processedText = rawText;
      
      // Replace Blade expressions with placeholders for validation
      const bladeMatches = [
        ...rawText.match(/\{\{\s*[^}]+\s*\}\}/g) || [],  // {{ expression }}
        ...rawText.match(/\{!!\s*[^}]+\s*!!\}/g) || []    // {!! expression !!}
      ];
      
      let validationText = rawText;
      bladeMatches.forEach((match, index) => {
        validationText = validationText.replace(match, `{blade_${index}}`);
      });
      
      // Skip if still has Blade directives after processing
      if (/@[a-z]/i.test(validationText)) continue;
      
      const text = processedText.replace(/\s+/g, ' ').trim();
      if (!text) continue;

      if (shouldTranslate(validationText, { ignorePatterns: this.ignorePatterns })) {
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

      // Handle Alpine.js x-text directive with string literals
      if (attrName === 'x-text') {
        this.parseAlpineXText(attrValue, tagName, results);
        continue;
      }

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
   * Parse Alpine.js x-text directive for string literals
   * e.g., x-text="'Hello World'" or x-text="condition ? 'Yes' : 'No'"
   */
  parseAlpineXText(value, tagName, results) {
    if (!value) return;

    // Extract string literals from the Alpine.js expression
    const stringRegex = STRING_PATTERNS.alpineText;
    const ternaryRegex = STRING_PATTERNS.alpineTernary;
    
    // Handle ternary expressions first
    let match;
    while ((match = ternaryRegex.exec(value)) !== null) {
      const candidate1 = (match[2] || '').trim();
      const candidate2 = (match[4] || '').trim();
      
      // Process both branches of ternary
      [candidate1, candidate2].forEach(candidate => {
        if (!candidate) return;
        
        // Skip if it looks like a variable or identifier
        if (/^[a-z_$][a-zA-Z0-9_$]*$/.test(candidate)) return;
        
        if (shouldTranslate(candidate, { ignorePatterns: this.ignorePatterns })) {
          results.items.push({
            type: 'text',
            text: candidate,
            kind: 'text',
            parentTag: tagName,
          });
          results.stats.extracted++;
        }
      });
    }
    
    // Reset regex lastIndex and process regular string literals
    stringRegex.lastIndex = 0;
    while ((match = stringRegex.exec(value)) !== null) {
      const candidate = (match[2] || '').trim();
      if (!candidate) continue;

      // Skip if it looks like a variable or identifier
      if (/^[a-z_$][a-zA-Z0-9_$]*$/.test(candidate)) continue;

      if (!shouldTranslate(candidate, { ignorePatterns: this.ignorePatterns })) {
        continue;
      }

      results.items.push({
        type: 'text',
        text: candidate,
        kind: 'text',
        parentTag: tagName,
      });
      results.stats.extracted++;
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
