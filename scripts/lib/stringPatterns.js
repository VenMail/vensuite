/**
 * String Patterns
 * 
 * Common regex patterns for parsing strings in various contexts
 */

const STRING_PATTERNS = {
  // Alpine.js x-text patterns for string literals
  alpineText: /(?:^|[^a-zA-Z0-9_$])(?:'([^']*)'|"([^"]*)")/g,
  
  // Alpine.js ternary expression patterns
  alpineTernary: /(?:^|[^a-zA-Z0-9_$])\?\s*(?:'([^']*)'|"([^"]*)")\s*:\s*(?:'([^']*)'|"([^"]*)")/g,
};

module.exports = { STRING_PATTERNS };
