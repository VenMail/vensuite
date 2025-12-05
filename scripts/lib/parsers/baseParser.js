/**
 * Base Parser Interface
 * 
 * All framework-specific parsers should extend this interface.
 * This provides a consistent API for extracting translatable content
 * from different file types and frameworks.
 */

/**
 * @typedef {Object} ExtractedText
 * @property {string} type - Type of extraction ('text', 'attribute', 'string')
 * @property {string} text - The extracted text content
 * @property {string} kind - Translation kind ('text', 'heading', 'button', 'label', 'placeholder', 'title', 'alt', 'aria_label', 'toast')
 * @property {string} [parentTag] - Parent HTML/component tag name
 * @property {string} [attributeName] - Attribute name if type is 'attribute'
 * @property {number} [line] - Line number in source file
 * @property {number} [column] - Column number in source file
 */

/**
 * @typedef {Object} ParserOptions
 * @property {Object} [ignorePatterns] - Patterns to ignore during extraction
 * @property {string} [namespace] - Namespace for the extracted keys
 * @property {string} [filePath] - Path to the source file
 * @property {string} [srcRoot] - Source root directory
 */

/**
 * @typedef {Object} ParserResult
 * @property {ExtractedText[]} items - Extracted translatable items
 * @property {Object} stats - Extraction statistics
 * @property {string[]} errors - Any errors encountered during parsing
 */

// Common HTML entities map - use Unicode escapes for special quote chars to avoid syntax issues
const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '\u2013', // en-dash
  '&mdash;': '\u2014', // em-dash
  '&lsquo;': '\u2018', // left single quote
  '&rsquo;': '\u2019', // right single quote
  '&ldquo;': '\u201C', // left double quote
  '&rdquo;': '\u201D', // right double quote
  '&hellip;': '\u2026', // ellipsis
  '&copy;': '\u00A9',  // copyright
  '&reg;': '\u00AE',   // registered
  '&trade;': '\u2122', // trademark
  '&euro;': '\u20AC',  // euro
  '&pound;': '\u00A3', // pound
  '&yen;': '\u00A5',   // yen
  '&cent;': '\u00A2',  // cent
};

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;
  
  let decoded = text;
  
  // Replace named entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.split(entity).join(char);
  }
  
  // Replace numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Replace numeric entities (hex)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

/**
 * Base parser class that all framework parsers should extend
 */
class BaseParser {
  /**
   * @param {ParserOptions} options
   */
  constructor(options = {}) {
    this.options = options;
    this.ignorePatterns = options.ignorePatterns || {};
  }
  
  /**
   * Decode HTML entities in extracted text
   * @param {string} text
   * @returns {string}
   */
  decodeEntities(text) {
    return decodeHtmlEntities(text);
  }

  /**
   * Get the file extensions this parser handles
   * @returns {string[]}
   */
  static getExtensions() {
    throw new Error('Subclass must implement getExtensions()');
  }

  /**
   * Get the framework/language name
   * @returns {string}
   */
  static getName() {
    throw new Error('Subclass must implement getName()');
  }

  /**
   * Check if this parser can handle the given file
   * @param {string} filePath
   * @returns {boolean}
   */
  static canHandle(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    return this.getExtensions().includes(ext);
  }

  /**
   * Parse file content and extract translatable text
   * @param {string} content - File content
   * @param {ParserOptions} options - Parser options
   * @returns {ParserResult}
   */
  parse(content, options = {}) {
    throw new Error('Subclass must implement parse()');
  }

  /**
   * Infer translation kind from HTML/component tag name
   * @param {string} tagName
   * @returns {string}
   */
  inferKindFromTag(tagName) {
    if (!tagName) return 'text';
    const lower = tagName.toLowerCase();
    
    // Headings
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(lower)) return 'heading';
    
    // Labels
    if (lower === 'label') return 'label';
    
    // Buttons (including common component naming patterns)
    if (lower === 'button' || 
        lower.endsWith('button') || 
        lower.endsWith('btn') ||
        lower.includes('-button') ||
        lower.includes('-btn')) return 'button';
    
    // Links (including framework-specific components)
    if (lower === 'a' || 
        lower === 'link' ||
        lower === 'nuxt-link' ||
        lower === 'nuxtlink' ||
        lower === 'router-link' ||
        lower === 'routerlink' ||
        lower === 'inertia-link' ||
        lower === 'inertialink' ||
        lower === 'next/link' ||
        lower === 'gatsby-link') return 'link';
    
    // Form inputs
    if (['input', 'textarea', 'select'].includes(lower)) return 'placeholder';
    
    // Title
    if (lower === 'title') return 'title';
    
    // Toast/notification components
    if (lower.includes('toast') || 
        lower.includes('notification') ||
        lower.includes('alert') ||
        lower.includes('snackbar')) return 'toast';
    
    // Modal/dialog titles
    if (lower.includes('modal') || lower.includes('dialog')) return 'heading';
    
    return 'text';
  }

  /**
   * Infer translation kind from attribute name
   * @param {string} attrName
   * @returns {string}
   */
  inferKindFromAttr(attrName) {
    const lower = String(attrName || '').toLowerCase();
    if (lower === 'placeholder') return 'placeholder';
    if (lower === 'title') return 'title';
    if (lower === 'alt') return 'alt';
    if (lower === 'aria-label' || lower === 'arialabel') return 'aria_label';
    if (lower === 'label') return 'label';
    if (lower === 'description' || lower === 'desc') return 'text';
    if (lower === 'message' || lower === 'msg') return 'text';
    if (lower === 'error' || lower === 'errormessage') return 'text';
    if (lower === 'helper' || lower === 'helpertext') return 'text';
    return 'text';
  }
}

module.exports = {
  BaseParser,
  decodeHtmlEntities,
  HTML_ENTITIES,
};
