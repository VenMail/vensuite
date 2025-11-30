/**
 * Parser Registry
 * 
 * Central registry for all framework-specific parsers.
 * Provides automatic parser selection based on file type.
 * 
 * Supported Frameworks:
 * - React, Next.js, Gatsby, Remix (JSX/TSX)
 * - Vue 2/3, Nuxt 2/3, Quasar (Vue SFC)
 * - Laravel, Inertia, Livewire (Blade)
 * - Svelte, SvelteKit (Svelte)
 * - Python, Go, C#, Java, Ruby, PHP, Rust, Swift, Kotlin (Generic)
 * 
 * Adding a new parser:
 * 1. Create a new parser class extending BaseParser
 * 2. Implement getExtensions(), getName(), and parse() methods
 * 3. Register it in the PARSERS array below
 */

const { BaseParser } = require('./baseParser');
const { JsxParser } = require('./jsxParser');
const { VueParser } = require('./vueParser');
const { BladeParser } = require('./bladeParser');
const { SvelteParser } = require('./svelteParser');
const { GenericParser } = require('./genericParser');

// Registered parsers in priority order
const PARSERS = [
  BladeParser,    // Must come before generic PHP
  VueParser,
  SvelteParser,
  JsxParser,      // Handles JS/TS/JSX/TSX
  GenericParser,  // Fallback for other languages
];

/**
 * Get the appropriate parser for a file
 * @param {string} filePath - Path to the file
 * @returns {BaseParser|null} - Parser instance or null if no parser found
 */
function getParserForFile(filePath) {
  if (!filePath) return null;

  for (const ParserClass of PARSERS) {
    if (ParserClass.canHandle(filePath)) {
      return new ParserClass();
    }
  }

  return null;
}

/**
 * Get all registered parsers
 * @returns {Array} - Array of parser classes
 */
function getAllParsers() {
  return [...PARSERS];
}

/**
 * Get parser by name
 * @param {string} name - Parser name
 * @returns {BaseParser|null}
 */
function getParserByName(name) {
  const ParserClass = PARSERS.find(p => p.getName() === name);
  return ParserClass ? new ParserClass() : null;
}

/**
 * Get all supported file extensions
 * @returns {string[]}
 */
function getSupportedExtensions() {
  const extensions = new Set();
  for (const ParserClass of PARSERS) {
    for (const ext of ParserClass.getExtensions()) {
      extensions.add(ext);
    }
  }
  return Array.from(extensions);
}

/**
 * Check if a file type is supported
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupported(filePath) {
  return getParserForFile(filePath) !== null;
}

/**
 * Parse a file and extract translatable content
 * @param {string} content - File content
 * @param {string} filePath - Path to the file
 * @param {Object} options - Parser options
 * @returns {Object} - Parser result
 */
function parseFile(content, filePath, options = {}) {
  const parser = getParserForFile(filePath);
  if (!parser) {
    return {
      items: [],
      stats: { processed: 0, extracted: 0, errors: 1 },
      errors: [`No parser available for file: ${filePath}`],
    };
  }

  return parser.parse(content, { ...options, filePath });
}

/**
 * Register a custom parser
 * @param {typeof BaseParser} ParserClass - Parser class to register
 * @param {number} [priority] - Priority (lower = higher priority)
 */
function registerParser(ParserClass, priority = PARSERS.length) {
  if (!ParserClass || typeof ParserClass.canHandle !== 'function') {
    throw new Error('Invalid parser class');
  }
  
  // Remove if already registered
  const existingIndex = PARSERS.findIndex(p => p.getName() === ParserClass.getName());
  if (existingIndex !== -1) {
    PARSERS.splice(existingIndex, 1);
  }
  
  // Insert at priority position
  PARSERS.splice(Math.min(priority, PARSERS.length), 0, ParserClass);
}

/**
 * Get framework information for display
 * @returns {Array<{name: string, extensions: string[]}>}
 */
function getFrameworkInfo() {
  return PARSERS.map(ParserClass => ({
    name: ParserClass.getName(),
    extensions: ParserClass.getExtensions(),
  }));
}

module.exports = {
  // Parser classes
  BaseParser,
  JsxParser,
  VueParser,
  BladeParser,
  SvelteParser,
  GenericParser,
  
  // Registry functions
  getParserForFile,
  getAllParsers,
  getParserByName,
  getSupportedExtensions,
  isSupported,
  parseFile,
  registerParser,
  getFrameworkInfo,
};
