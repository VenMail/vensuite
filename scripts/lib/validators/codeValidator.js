/**
 * Enhanced Code/Expression Validator
 * More robust detection of programming constructs while avoiding false positives for English text
 */

// JavaScript keywords (expanded)
const JS_KEYWORDS = new Set([
  // Control flow
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
  'new', 'return', 'static', 'super', 'switch', 'throw', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield',
  
  // Values
  'false', 'null', 'true', 'undefined',
  
  // TypeScript/ESNext
  'implements', 'interface', 'package', 'private', 'protected', 'public',
  'abstract', 'as', 'asserts', 'any', 'unknown', 'never', 'keyof', 'readonly',
  'type', 'namespace', 'module', 'declare', 'global', 'from', 'get', 'set',
  'of', 'satisfies',
  
  // Contextual
  'arguments', 'eval', 'this',
]);

// Common programming identifiers that shouldn't be translated
const PROGRAMMING_IDENTIFIERS = new Set([
  // Global objects
  'console', 'window', 'document', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'indexedDB', 'crypto', 'performance',
  
  // Built-ins
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON',
  'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'Promise',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect',
  'Intl', 'ArrayBuffer', 'DataView', 'TypedArray',
  
  // Common functions
  'fetch', 'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'addEventListener', 'removeEventListener', 'dispatchEvent',
  
  // DOM methods
  'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName',
  'getElementsByTagName', 'createElement', 'createTextNode', 'appendChild',
  'removeChild', 'insertBefore', 'replaceChild', 'cloneNode',
  'getAttribute', 'setAttribute', 'removeAttribute', 'hasAttribute',
  
  // Common properties/methods
  'classList', 'style', 'innerHTML', 'innerText', 'textContent',
  'value', 'checked', 'selected', 'disabled', 'readonly', 'required',
  'length', 'size', 'name', 'id', 'className', 'tagName', 'nodeType',
  
  // Array methods
  'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'concat', 'join',
  'reverse', 'sort', 'filter', 'map', 'reduce', 'reduceRight', 'forEach',
  'find', 'findIndex', 'findLast', 'findLastIndex', 'includes', 'indexOf',
  'lastIndexOf', 'every', 'some', 'keys', 'values', 'entries', 'from',
  'isArray', 'at', 'flat', 'flatMap',
  
  // String methods
  'toString', 'valueOf', 'toUpperCase', 'toLowerCase', 'trim', 'trimStart',
  'trimEnd', 'split', 'replace', 'replaceAll', 'match', 'matchAll', 'search',
  'substring', 'substr', 'slice', 'charAt', 'charCodeAt', 'codePointAt',
  'startsWith', 'endsWith', 'padStart', 'padEnd', 'repeat', 'localeCompare',
  'normalize',
  
  // Number methods
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'isInteger', 'toFixed',
  'toExponential', 'toPrecision',
  
  // Utility functions
  'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
  'escape', 'unescape', 'btoa', 'atob',
]);

// Common English words/phrases that might look like code but aren't
const COMMON_ENGLISH_PATTERNS = new Set([
  'ok', 'okay', 'yes', 'no', 'true', 'false', // (handled separately)
  'null', 'undefined', // (handled separately)
  'click', 'open', 'close', 'save', 'load', 'back', 'next', 'previous',
  'first', 'last', 'home', 'end', 'stop', 'start', 'pause', 'play',
  'add', 'remove', 'delete', 'edit', 'view', 'show', 'hide', 'toggle',
  'search', 'find', 'filter', 'sort', 'group', 'merge', 'split', 'join',
  'copy', 'paste', 'cut', 'undo', 'redo', 'refresh', 'update', 'create',
  'select', 'deselect', 'enable', 'disable', 'expand', 'collapse',
  'success', 'error', 'warning', 'info', 'help', 'about', 'contact',
  'required', 'optional', 'recommended', 'suggested', 'default', 'custom',
  'basic', 'advanced', 'simple', 'complex', 'easy', 'hard', 'fast', 'slow',
  'new', 'old', 'young', 'big', 'small', 'large', 'tiny', 'short', 'long',
  'high', 'low', 'hot', 'cold', 'light', 'dark', 'bright', 'dim',
]);

// Known library/framework identifiers
const LIBRARY_IDENTIFIERS = new Set([
  // React/Vue/Angular patterns
  'props', 'state', 'ref', 'emit', 'slot', 'component', 'directive',
  'mixin', 'plugin', 'store', 'action', 'mutation', 'getter', 'setter',
  'context', 'provider', 'consumer', 'hook', 'effect', 'reducer',
  'dispatch', 'commit', 'selector',
  
  // Common variable names
  'data', 'item', 'items', 'list', 'array', 'obj', 'object', 'func',
  'function', 'fn', 'callback', 'cb', 'err', 'error', 'res', 'response',
  'req', 'request', 'val', 'value', 'idx', 'index', 'key', 'id',
  'result', 'results', 'output', 'input', 'param', 'params', 'args',
  'arguments', 'options', 'config', 'settings', 'init', 'initialize',
]);

const JS_DIRECTIVE_LITERALS = new Set([
  'use strict',
  'use client',
  'use server',
]);

/**
 * Debug/logging function names that should be ignored during extraction
 * Strings passed to these functions are typically debug messages, not user-facing text
 */
const LOGGING_FUNCTIONS = new Set([
  // JavaScript console methods
  'log', 'error', 'warn', 'info', 'debug', 'trace', 'dir', 'table', 'assert',
  'count', 'countReset', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd',
  'timeLog', 'profile', 'profileEnd',
]);

const LOGGING_OBJECTS = new Set([
  // JavaScript
  'console',
  // Node.js / Winston / Pino / Bunyan / Log4js
  'logger', 'log', 'logging', 'winston', 'pino', 'bunyan', 'log4js',
  // Laravel / PHP
  'Log', 'Logger',
  // Python-style
  'logging',
  // Misc frameworks
  'debug', 'debugger', 'tracer', 'reporter',
]);

/**
 * Check if a call expression is a logging/debug call
 * @param {string} calleeName - The full callee name (e.g., "console.log", "Log::error")
 * @returns {boolean}
 */
function isLoggingCall(calleeName) {
  if (!calleeName || typeof calleeName !== 'string') return false;
  
  const normalized = calleeName.trim();
  
  // Check for object.method pattern (console.log, logger.info, etc.)
  const dotMatch = normalized.match(/^([a-zA-Z_$][\w$]*)\s*\.\s*([a-zA-Z_$][\w$]*)$/);
  if (dotMatch) {
    const [, obj, method] = dotMatch;
    if (LOGGING_OBJECTS.has(obj) && LOGGING_FUNCTIONS.has(method)) {
      return true;
    }
    // Also check if object alone is a logger
    if (LOGGING_OBJECTS.has(obj)) {
      return true;
    }
  }
  
  // Check for PHP/Laravel static method pattern (Log::error, Logger::info)
  const colonMatch = normalized.match(/^([a-zA-Z_][\w]*)::([a-zA-Z_][\w]*)$/);
  if (colonMatch) {
    const [, cls, method] = colonMatch;
    if (LOGGING_OBJECTS.has(cls) && LOGGING_FUNCTIONS.has(method)) {
      return true;
    }
    if (LOGGING_OBJECTS.has(cls)) {
      return true;
    }
  }
  
  // Check for standalone logging functions
  if (LOGGING_FUNCTIONS.has(normalized)) {
    return true;
  }
  
  return false;
}

/**
 * Regex patterns to detect logging statements in source code lines
 */
const LOGGING_LINE_PATTERNS = [
  // JavaScript console
  /\bconsole\s*\.\s*(?:log|error|warn|info|debug|trace|dir|table|assert)\s*\(/,
  // Generic logger object
  /\blogger\s*\.\s*(?:log|error|warn|info|debug|trace|fatal|verbose|silly)\s*\(/i,
  /\blogging\s*\.\s*(?:log|error|warn|warning|info|debug|critical|exception)\s*\(/i,
  // Winston
  /\bwinston\s*\.\s*(?:log|error|warn|info|debug|verbose|silly)\s*\(/,
  // Pino
  /\bpino\s*\.\s*(?:fatal|error|warn|info|debug|trace)\s*\(/,
  // Log4js
  /\blog4js\s*\.\s*(?:fatal|error|warn|info|debug|trace|mark)\s*\(/,
  // Laravel/PHP Log facade
  /\bLog\s*::\s*(?:emergency|alert|critical|error|warning|notice|info|debug)\s*\(/,
  /\bLogger\s*::\s*(?:log|error|warning|info|debug)\s*\(/,
  // Python logging
  /\blogging\s*\.\s*(?:critical|error|warning|info|debug|exception|log)\s*\(/,
  // Debug module
  /\bdebug\s*\(\s*['"][^'"]*['"]\s*\)/,
  // Print/echo statements (debugging)
  /\bprint_r\s*\(/,
  /\bvar_dump\s*\(/,
  /\bdd\s*\(/,
  /\bdump\s*\(/,
];

/**
 * Check if text looks like English text with parentheses (e.g., "Click (here)")
 */
function isEnglishWithParens(text) {
  const trimmed = String(text || '').trim();
  
  // Simple English word followed by text in parentheses
  if (/^[A-Z][a-z]*\s+\([^)]+\)$/.test(trimmed)) {
    return true;
  }
  
  // Multiple English words with parentheses
  if (/^[A-Z][a-z]+(?:\s+[A-Za-z][a-z]*)*\s+\([^)]+\)$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a simple English word that happens to be camelCase
 */
function isLikelyEnglishWord(text) {
  const trimmed = String(text || '').trim().toLowerCase();
  
  // Single words that are common English
  if (COMMON_ENGLISH_PATTERNS.has(trimmed)) {
    return true;
  }
  
  // Words that are camelCase but could be English compounds
  if (/^[a-z]+[A-Z][a-z]+$/.test(text)) {
    const parts = text.split(/(?=[A-Z])/).map(p => p.toLowerCase());
    const firstPart = parts[0];
    
    // Check if first part is a common English verb/word
    const commonFirstParts = new Set([
      'click', 'open', 'close', 'save', 'load', 'back', 'next', 'previous',
      'add', 'remove', 'delete', 'edit', 'view', 'show', 'hide', 'toggle',
      'search', 'find', 'filter', 'sort', 'copy', 'paste', 'cut', 'undo',
      'refresh', 'update', 'create', 'select', 'enable', 'disable',
    ]);
    
    if (commonFirstParts.has(firstPart) && parts.length === 2) {
      // Could be a UI label like "clickHere" or "saveButton"
      const secondPart = parts[1].toLowerCase();
      const commonSecondParts = new Set([
        'button', 'link', 'menu', 'item', 'list', 'form', 'field', 'text',
        'icon', 'image', 'panel', 'window', 'dialog', 'modal', 'tab',
        'page', 'section', 'area', 'box', 'container', 'wrapper',
        'here', 'now', 'again', 'more', 'less',
      ]);
      
      if (commonSecondParts.has(secondPart)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Improved check for JavaScript expressions
 */
function isJsExpression(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Avoid simple English phrases
  if (isEnglishWithParens(trimmed)) {
    return false;
  }
  
  if (isLikelyEnglishWord(trimmed)) {
    return false;
  }
  
  // Ternary expressions - must have ? and : operators
  if (trimmed.includes('?') && trimmed.includes(':')) {
    const parts = trimmed.split('?');
    if (parts.length >= 2) {
      const condition = parts[0].trim();
      // Condition should look like a JS expression
      if (condition && !/^[A-Z]/.test(condition)) {
        return true;
      }
    }
  }
  
  // Function calls with parentheses - more strict matching
  // Match: func(), obj.method(), Module.function(), but not "Click (here)"
  const funcCallRegex = /^(?:await\s+|new\s+|yield\s+|void\s+|typeof\s+|delete\s+)?(?:[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*|\([^)]+\))\s*\([^)]*\)(?:\s*\.\s*[a-zA-Z_$][\w$]*\s*\([^)]*\))*$/;
  
  if (funcCallRegex.test(trimmed)) {
    // Additional check: if it looks like "word(word)" where first word is capitalized
    const simpleCallMatch = trimmed.match(/^([A-Z][a-z]+)\s*\(([^)]+)\)$/);
    if (simpleCallMatch) {
      const arg = simpleCallMatch[2].trim();
      // If argument is a single capitalized word or quoted string, might be English
      if (/^[A-Z][a-z]+$/.test(arg) || /^["'][^"']+["']$/.test(arg)) {
        return false;
      }
    }
    return true;
  }
  
  // Arrow functions - must have => and function body
  if (trimmed.includes('=>')) {
    const arrowParts = trimmed.split('=>');
    if (arrowParts.length === 2) {
      const params = arrowParts[0].trim();
      const body = arrowParts[1].trim();
      
      // Check if params look like function parameters
      const validParamPattern = /^(?:[a-zA-Z_$][\w$]*(?:\s*,\s*[a-zA-Z_$][\w$]*)*|\{[^}]*\}|\([^)]*\))$/;
      if (validParamPattern.test(params) && body) {
        return true;
      }
    }
  }
  
  // Comparison operators with expressions on both sides
  const comparisonRegex = /^(?:[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*|\([^)]+\)|[0-9]+(?:\.[0-9]+)?)\s*(?:[<>]=?|===?|!==?)\s*(?:[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*|\([^)]+\)|[0-9]+(?:\.[0-9]+)?|["'][^"']*["'])$/;
  if (comparisonRegex.test(trimmed)) {
    return true;
  }
  
  // Logical operators with expressions
  if ((trimmed.includes('&&') || trimmed.includes('||')) && !/^[A-Z]/.test(trimmed)) {
    const parts = trimmed.split(/(&&|\|\|)/);
    // At least one part should look like a JS expression
    const hasExpression = parts.some(part => 
      part.trim() && 
      /^[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)*$/.test(part.trim()) &&
      !isLikelyEnglishWord(part.trim())
    );
    if (hasExpression) {
      return true;
    }
  }
  
  // Property access chains (min 2 dots)
  if (/[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*){2,}/.test(trimmed)) {
    // Check it's not something like "a.b.c" where all are single letters (could be abbreviations)
    const match = trimmed.match(/[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*){2,}/);
    if (match) {
      const parts = match[0].split('.');
      // If all parts are single letters or very short, might be abbreviation
      if (parts.every(p => p.length > 1 || /[0-9]/.test(p))) {
        return true;
      }
    }
  }
  
  // Array/object access with brackets
  const bracketAccessRegex = /[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*\[(?:[^\[\]]+|"[^"]*"|'[^']*')\]/;
  if (bracketAccessRegex.test(trimmed)) {
    // But not simple bracketed text like "[Required]"
    if (!/^\[[A-Z][a-z]+\]$/.test(trimmed)) {
      return true;
    }
  }
  
  // Assignment expressions (including destructuring)
  if (/^(?:const|let|var)\s+[a-zA-Z_$][\w$]/.test(trimmed)) {
    return true;
  }
  
  if (/[a-zA-Z_$][\w$]*\s*=\s*(?![=>])/.test(trimmed)) {
    // Check it's not something like "Name = John" (English)
    const match = trimmed.match(/^([a-zA-Z_$][\w$]*)\s*=\s*(.+)$/);
    if (match) {
      const [, lhs, rhs] = match;
      // If LHS is single capitalized word and RHS is text, might be English
      if (/^[A-Z][a-z]+$/.test(lhs) && /^[A-Z][a-z]/.test(rhs.trim())) {
        return false;
      }
      return true;
    }
  }
  
  // Template literals with expressions
  if (/\$\{[^}]+\}/.test(trimmed)) {
    return true;
  }
  
  // Spread/Rest operator
  if (/\.{3}[a-zA-Z_$][\w$]*/.test(trimmed)) {
    return true;
  }
  
  // Object/Array destructuring
  const destructuringPatterns = [
    /^\s*\{[^}]+\}\s*(?:=|\s+as\s+)/,
    /^\s*\[[^\]]+\]\s*(?:=|\s+as\s+)/,
    /^(?:const|let|var)\s+\{[^}]+\}/,
    /^(?:const|let|var)\s+\[[^\]]+\]/,
  ];
  
  if (destructuringPatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }
  
  // Method chaining
  if (/\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Improved Vue directive expression detection
 */
function isVueDirectiveExpression(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Skip English text
  if (isEnglishWithParens(trimmed) || isLikelyEnglishWord(trimmed)) {
    return false;
  }
  
  // Vue event handlers with common prefixes
  const vueEventRegex = /^(?:@|v-on:)?(?:click|input|submit|change|key(?:down|up|press)|mouse(?:down|up|move|enter|leave)|focus|blur|scroll)/;
  if (vueEventRegex.test(trimmed.toLowerCase())) {
    return true;
  }
  
  // Vue bindings
  if (/^(?::|v-bind:)[a-zA-Z_$][\w$]*/.test(trimmed)) {
    return true;
  }
  
  // Vue directives
  if (/^v-(if|show|for|model|text|html|pre|cloak|once|ref)/.test(trimmed)) {
    return true;
  }
  
  // Boolean expressions for v-if/v-show (must have operators or be complex)
  if (/^!?[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+$/.test(trimmed)) {
    return true;
  }
  
  if (/^[a-zA-Z_$][\w$]*\s*(?:[<>]=?|===?|!==?)\s*/.test(trimmed)) {
    return true;
  }
  
  // Method calls in templates (often used in Vue)
  if (/^[a-zA-Z_$][\w$]*\s*\([^)]*\)$/.test(trimmed)) {
    // Check it's not a simple English call
    const match = trimmed.match(/^([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)$/);
    if (match) {
      const [, funcName, args] = match;
      if (/^[A-Z][a-z]+$/.test(funcName) && !args.trim()) {
        return false; // Could be "Save()" etc.
      }
      return true;
    }
  }
  
  // Vue slot names
  if (/^#[a-zA-Z_$][\w$]*/.test(trimmed)) {
    return true;
  }
  
  // Vue template references
  if (/^ref="[^"]+"$/.test(trimmed) || /^\$refs\./.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Improved programming identifier detection
 */
function isProgrammingIdentifier(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Skip common English words
  if (isLikelyEnglishWord(trimmed)) {
    return false;
  }
  
  // Check against known sets first
  if (JS_KEYWORDS.has(trimmed)) {
    return true;
  }
  
  if (PROGRAMMING_IDENTIFIERS.has(trimmed)) {
    return true;
  }
  
  if (LIBRARY_IDENTIFIERS.has(trimmed)) {
    return true;
  }
  
  // camelCase with at least two parts and not starting with capital
  if (/^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
    // Additional check: if it looks like "iPhone" or similar
    if (/^i[A-Z][a-z]+/.test(trimmed) || /^e[A-Z][a-z]+/.test(trimmed)) {
      // Could be product names like "iPhone", "eBay"
      const commonProductNames = new Set(['iPhone', 'iPad', 'iPod', 'iMac', 'eBay', 'eCommerce']);
      if (commonProductNames.has(trimmed)) {
        return false;
      }
    }
    return true;
  }
  
  // PascalCase (for classes, components) - must have at least two capitals
  if (/^[A-Z][a-z]+[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
    return true;
  }
  
  // snake_case with multiple underscores
  if (/^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)+$/.test(trimmed)) {
    return true;
  }
  
  // SCREAMING_SNAKE_CASE (constants)
  if (/^[A-Z][A-Z0-9]*(_[A-Z][A-Z0-9]*)+$/.test(trimmed)) {
    return true;
  }
  
  // Hungarian notation or type prefixes
  if (/^(?:is|has|can|should|will|did)[A-Z][a-zA-Z0-9]+$/.test(trimmed)) {
    return true;
  }
  
  // Common suffix patterns
  if (/[A-Z][a-z]+(?:Util|Helper|Service|Factory|Provider|Controller|Component|Directive|Module)$/.test(trimmed)) {
    return true;
  }
  
  // React/Vue component patterns
  if (/^[A-Z][a-zA-Z0-9]*(?:Button|Modal|Dialog|Form|Input|Select|Table|List|Item|Card|Panel|View|Page)$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Main entry point - improved code detection with better English filtering
 */
function isCodeContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.length < 2) return false;
  
  const lower = trimmed.toLowerCase();
  
  // Quick heuristics to identify English text
  if (isEnglishWithParens(trimmed)) {
    return false;
  }
  
  // If it starts with a capital letter and looks like a sentence
  if (/^[A-Z][a-z]+(?:\s+[a-z][a-z]*)*[.!?]?$/.test(trimmed) && !trimmed.includes('(')) {
    // But check for common false negatives
    const codeIndicators = ['=>', '()', '{}', '[]', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>='];
    if (!codeIndicators.some(indicator => trimmed.includes(indicator))) {
      return false;
    }
  }
  
  if (JS_DIRECTIVE_LITERALS.has(lower) && trimmed === lower) {
    return true;
  }
  
  // Check for explicit code patterns
  if (isJsExpression(trimmed)) {
    return true;
  }
  
  if (isVueDirectiveExpression(trimmed)) {
    return true;
  }
  
  if (isProgrammingIdentifier(trimmed)) {
    return true;
  }
  
  // Additional code patterns
  
  // Control flow with parentheses (must have code inside)
  const controlFlowMatch = trimmed.match(/^(if|for|while|switch|catch)\s*\(([^)]+)\)/);
  if (controlFlowMatch) {
    const [, keyword, condition] = controlFlowMatch;
    // Condition should look like code, not English
    if (condition.trim() && !/^[A-Z]/.test(condition.trim())) {
      return true;
    }
  }
  
  // Declarations
  if (/^(const|let|var|function|class|import|export|type|interface)\s+[a-zA-Z_$]/.test(trimmed)) {
    return true;
  }
  
  // Try/catch/finally blocks
  if (/^(try|catch|finally)\s*\{/.test(trimmed)) {
    return true;
  }
  
  // Return/throw statements (must have expression after)
  const returnMatch = trimmed.match(/^(return|throw)\s+(.+)/);
  if (returnMatch) {
    const [, keyword, expression] = returnMatch;
    if (expression.trim() && !/^[A-Z]/.test(expression.trim())) {
      return true;
    }
  }
  
  // Semicolon-terminated statements with code-like content
  if (/;\s*$/.test(trimmed)) {
    const beforeSemicolon = trimmed.slice(0, -1).trim();
    if (beforeSemicolon && /[a-zA-Z_$][\w$]*\s*[=(]/.test(beforeSemicolon)) {
      return true;
    }
  }
  
  // JSON-like patterns
  if (/^\s*[\{\[]/.test(trimmed) && /[\}\]]\s*$/.test(trimmed)) {
    // Check if it has key-value pairs or array elements
    if (trimmed.includes(':') || trimmed.includes(',')) {
      return true;
    }
  }
  
  // Regex literal
  if (/^\/.+\/[gimsuyd]*$/.test(trimmed)) {
    return true;
  }
  
  // Number literals with operators
  if (/^[0-9]+\s*[\+\-\*/%]\s*[0-9]+/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Event handler detection with better filtering
 */
function isEventHandlerValue(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Skip English
  if (isEnglishWithParens(trimmed) || isLikelyEnglishWord(trimmed)) {
    return false;
  }
  
  // Arrow functions (explicit)
  if (/^[a-zA-Z_$][\w$]*(?:\s*,\s*[a-zA-Z_$][\w$]*)*\s*=>\s*(?:[^=]|=>).+$/.test(trimmed)) {
    return true;
  }
  
  // Event handler naming patterns
  const handlerPrefixes = ['handle', 'on', 'do', 'emit', 'dispatch', 'trigger', 'fire', 'call'];
  const hasHandlerPrefix = handlerPrefixes.some(prefix => 
    trimmed.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  if (hasHandlerPrefix) {
    // Check if it follows naming conventions
    if (/^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(trimmed) || 
        /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)+$/.test(trimmed)) {
      return true;
    }
  }
  
  // Inline function call with event parameter
  if (/^[a-zA-Z_$][\w$]*\s*\([^)]*\)$/.test(trimmed)) {
    const argsMatch = trimmed.match(/\(([^)]*)\)/);
    if (argsMatch) {
      const args = argsMatch[1].trim();
      // Common event parameter names
      const eventParams = ['e', 'event', 'evt', '$event', 'ev', 'arg', 'args'];
      if (!args || eventParams.some(param => args.includes(param))) {
        return true;
      }
    }
  }
  
  // Object method reference
  if (/^[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*$/.test(trimmed)) {
    const parts = trimmed.split('.');
    const methodName = parts[1];
    if (/^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(methodName)) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  JS_KEYWORDS,
  PROGRAMMING_IDENTIFIERS,
  LIBRARY_IDENTIFIERS,
  JS_DIRECTIVE_LITERALS,
  COMMON_ENGLISH_PATTERNS,
  LOGGING_FUNCTIONS,
  LOGGING_OBJECTS,
  LOGGING_LINE_PATTERNS,
  isJsExpression,
  isVueDirectiveExpression,
  isProgrammingIdentifier,
  isCodeContent,
  isEventHandlerValue,
  isEnglishWithParens,
  isLikelyEnglishWord,
  isLoggingCall,
};