/**
 * Code/Expression Validator
 * Detects JavaScript/TypeScript code expressions, function calls,
 * and programming constructs that should NOT be translated.
 */

// JavaScript keywords
const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while',
  'with', 'yield', 'implements', 'interface', 'package', 'private',
  'protected', 'public', 'abstract', 'as', 'from', 'get', 'set', 'of',
]);

// Common programming identifiers that shouldn't be translated
const PROGRAMMING_IDENTIFIERS = new Set([
  'console', 'window', 'document', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'fetch', 'Promise', 'Array', 'Object',
  'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'RegExp', 'Error',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
  'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'requestAnimationFrame',
  'addEventListener', 'removeEventListener', 'querySelector', 'querySelectorAll',
  'getElementById', 'getElementsByClassName', 'getElementsByTagName',
  'createElement', 'createTextNode', 'appendChild', 'removeChild',
  'insertBefore', 'replaceChild', 'cloneNode', 'getAttribute', 'setAttribute',
  'removeAttribute', 'classList', 'style', 'innerHTML', 'textContent',
  'value', 'checked', 'selected', 'disabled', 'readonly', 'required',
  'length', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'concat',
  'join', 'reverse', 'sort', 'filter', 'map', 'reduce', 'forEach', 'find',
  'findIndex', 'includes', 'indexOf', 'lastIndexOf', 'every', 'some',
  'keys', 'values', 'entries', 'hasOwnProperty', 'toString', 'valueOf',
  'toUpperCase', 'toLowerCase', 'trim', 'split', 'replace', 'match', 'search',
  'substring', 'substr', 'charAt', 'charCodeAt', 'startsWith', 'endsWith',
  'padStart', 'padEnd', 'repeat', 'localeCompare',
]);

/**
 * Check if text is a JavaScript expression
 * e.g., "value ? null : closeShareModal()", "items.length > 0"
 */
function isJsExpression(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Ternary expressions
  if (/\?\s*[^:]+\s*:/.test(trimmed)) {
    return true;
  }
  
  // Function calls with parentheses
  // Must be anchored to start/end to avoid matching text like "Contact us (required)"
  // Allows optional prefixes: !, await, new, void
  if (/^(!|await\s+|new\s+|void\s+)?[a-zA-Z_$][a-zA-Z0-9_$.]*\s*\([^)]*\)$/.test(trimmed)) {
    // But not if it's just a simple word followed by parentheses with text
    // e.g., "Click (here)" should not match
    if (/^[A-Z][a-z]+\s+\([^)]+\)$/.test(trimmed)) {
      return false;
    }
    return true;
  }
  
  // Arrow functions
  if (/=>\s*/.test(trimmed)) {
    return true;
  }
  
  // Comparison operators
  if (/[<>=!]=?=?/.test(trimmed) && !/^[^<>=!]+$/.test(trimmed)) {
    // Make sure it's not just text with punctuation
    if (/\b(if|else|while|for|return|const|let|var|function)\b/.test(trimmed) ||
        /[a-zA-Z_$][a-zA-Z0-9_$]*\s*[<>=!]=/.test(trimmed)) {
      return true;
    }
  }
  
  // Logical operators
  if (/\s(&&|\|\|)\s/.test(trimmed)) {
    return true;
  }
  
  // Property access chains
  if (/[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*){2,}/.test(trimmed)) {
    return true;
  }
  
  // Array/object access
  if (/\[[^\]]+\]/.test(trimmed) && /[a-zA-Z_$]/.test(trimmed)) {
    // But not if it's a simple bracketed word like "[Optional]"
    if (/^\[[A-Z][a-z]+\]$/.test(trimmed)) {
      return false;
    }
    return true;
  }
  
  // Assignment expressions
  if (/[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*[^=]/.test(trimmed) && 
      !/^[A-Z][a-z]+\s*=\s*[A-Z][a-z]+$/.test(trimmed)) {
    return true;
  }
  
  // Template literals with expressions
  if (/\$\{[^}]+\}/.test(trimmed)) {
    return true;
  }
  
  // Spread operator
  if (/\.{3}[a-zA-Z_$]/.test(trimmed)) {
    return true;
  }
  
  // Destructuring patterns
  if (/^\s*\{[^}]+\}\s*$/.test(trimmed) && /[a-zA-Z_$]:\s*[a-zA-Z_$]/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a Vue directive expression
 * e.g., "showModal", "items.length > 0", "handleClick($event)"
 */
function isVueDirectiveExpression(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for common Vue patterns
  
  // Event handlers: handleClick, onClick, onSubmit, etc.
  if (/^(handle|on)[A-Z][a-zA-Z0-9]*(\([^)]*\))?$/.test(trimmed)) {
    return true;
  }
  
  // Boolean expressions for v-if/v-show
  if (/^!?[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(trimmed)) {
    // Simple property access like "isVisible", "user.isAdmin"
    // But not single capitalized words that might be labels
    if (/^[A-Z][a-z]+$/.test(trimmed)) {
      return false;
    }
    return true;
  }
  
  // Computed expressions
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[<>=!&|]+/.test(trimmed)) {
    return true;
  }
  
  // Method calls
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(trimmed)) {
    return true;
  }
  
  // Object/array literals
  if (/^\s*[\[{]/.test(trimmed) && /[\]}]\s*$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a programming identifier (variable/function name)
 * e.g., "closeShareModal", "handleSubmit", "isLoading"
 */
function isProgrammingIdentifier(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for camelCase or PascalCase identifiers
  // But exclude simple capitalized words that might be labels
  
  // camelCase: starts with lowercase, has uppercase letters
  if (/^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
    return true;
  }
  
  // snake_case with multiple parts
  if (/^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)+$/.test(trimmed)) {
    return true;
  }
  
  // SCREAMING_SNAKE_CASE (constants)
  if (/^[A-Z][A-Z0-9]*(_[A-Z][A-Z0-9]*)+$/.test(trimmed)) {
    return true;
  }
  
  // Check against known programming identifiers
  if (PROGRAMMING_IDENTIFIERS.has(trimmed)) {
    return true;
  }
  
  // Check against JS keywords
  if (JS_KEYWORDS.has(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text contains code-like patterns
 * This is the main entry point for code validation
 */
function isCodeContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for JS expression
  if (isJsExpression(trimmed)) {
    return true;
  }
  
  // Check for Vue directive expression
  if (isVueDirectiveExpression(trimmed)) {
    return true;
  }
  
  // Check for programming identifier
  if (isProgrammingIdentifier(trimmed)) {
    return true;
  }
  
  // Check for code blocks
  // Control flow with parentheses
  if (/^(if|for|while|switch|catch)\s*\(/.test(trimmed)) {
    return true;
  }
  
  // Declarations
  if (/^(const|let|var|function|class|import|export)\s+[a-zA-Z_$]/.test(trimmed)) {
    return true;
  }

  // Other keywords
  if (/^(try|else|do)\s*\{/.test(trimmed)) {
    return true;
  }
  
  // Return/throw statements - careful not to match "return to home" (imperative usually capitalized, but maybe not)
  // We assume code returns are usually lower case 'return' followed by expression
  if (/^(return|throw)\s+[^A-Z]/.test(trimmed)) {
    return true;
  }
  
  // Check for semicolon-terminated statements
  if (/;\s*$/.test(trimmed) && /[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=(]/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is an event handler attribute value
 * e.g., "value => value ? null : closeShareModal()"
 */
function isEventHandlerValue(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Arrow function patterns
  if (/^[a-zA-Z_$][a-zA-Z0-9_$,\s]*\s*=>\s*.+$/.test(trimmed)) {
    return true;
  }
  
  // Function reference patterns
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(trimmed) &&
      /^(handle|on|do|emit|dispatch|trigger|fire|call|invoke|execute|run|process)/i.test(trimmed)) {
    return true;
  }
  
  // Inline function call
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

module.exports = {
  JS_KEYWORDS,
  PROGRAMMING_IDENTIFIERS,
  isJsExpression,
  isVueDirectiveExpression,
  isProgrammingIdentifier,
  isCodeContent,
  isEventHandlerValue,
};
