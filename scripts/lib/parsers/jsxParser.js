/**
 * JSX/TSX Parser
 * 
 * Handles React, Next.js, and other JSX-based frameworks.
 * Supports: .js, .jsx, .ts, .tsx files with JSX syntax
 * 
 * Frameworks: React, Next.js, Gatsby, Remix, React Native
 */

const { BaseParser } = require('./baseParser');

// Try to load parsers
let parseSync; // oxc-parser
let babelParse; // @babel/parser

try {
  parseSync = require('oxc-parser').parseSync;
} catch (e) {}

try {
  babelParse = require('@babel/parser').parse;
} catch (e) {}

class JsxParser extends BaseParser {
  static getExtensions() {
    return ['js', 'jsx', 'ts', 'tsx', 'mjs', 'mts'];
  }

  static getName() {
    return 'JSX/TSX (React, Next.js, Gatsby, Remix)';
  }

  static canHandle(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    // Skip declaration files
    if (filePath.endsWith('.d.ts')) return false;
    return this.getExtensions().includes(ext);
  }

  /**
   * Parse JSX/TSX content
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

    const { shouldTranslate } = require('../validators');
    const filePath = options.filePath || 'unknown.jsx';
    const ext = filePath.split('.').pop().toLowerCase();

    // Ensure ignore patterns from options are available to helpers
    this.ignorePatterns = options.ignorePatterns || this.ignorePatterns || {};

    let ast;

    // Try oxc-parser first (faster)
    if (parseSync) {
      try {
        const result = parseSync(filePath, content, {
          sourceType: 'module',
          lang: ext === 'tsx' ? 'tsx' : ext === 'ts' ? 'ts' : ext === 'jsx' ? 'jsx' : 'js',
        });
        if (result && result.program) {
          ast = result.program;
        }
      } catch (err) {
        results.errors.push(`oxc-parser error: ${err.message}`);
      }
    }

    // Fall back to babel
    if (!ast && babelParse) {
      try {
        const result = babelParse(content, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx', 'decorators-legacy'],
        });
        if (result) {
          ast = result;
        }
      } catch (err) {
        results.errors.push(`babel error: ${err.message}`);
      }
    }

    if (!ast) {
      // Fallback to regex extraction
      return this.parseWithRegex(content, options);
    }

    results.stats.processed = 1;

    // Walk the AST
    const self = this;
    let currentJsxElement = null;

    const visitors = {
      JSXElement(node) {
        currentJsxElement = node;
      },

      JSXText(node, parent) {
        const raw = node.value || '';
        
        // Skip whitespace-only nodes (common in JSX formatting)
        if (/^\s*$/.test(raw)) return;
        
        // Normalize whitespace but preserve meaning
        const text = raw.replace(/\s+/g, ' ').trim();
        if (!text) return;
        
        // Skip if it's just punctuation or single characters
        if (/^[.,;:!?'"()[\]{}<>\/\\|@#$%^&*+=~`-]+$/.test(text)) return;

        const jsxParent = parent?.type === 'JSXElement' ? parent : currentJsxElement;
        if (!jsxParent?.openingElement) return;

        const elementName = self.getJsxElementName(jsxParent.openingElement.name);
        const kind = self.inferKindFromTag(elementName);

        if (shouldTranslate(text, { ignorePatterns: self.ignorePatterns })) {
          results.items.push({ type: 'text', text, kind, parentTag: elementName });
          results.stats.extracted++;
        }
      },

      JSXExpressionContainer(node, parent) {
        const expr = node.expression;
        if (!expr || expr.type === 'JSXEmptyExpression') return;

        const jsxParent = parent?.type === 'JSXElement' ? parent : currentJsxElement;
        if (!jsxParent?.openingElement) return;

        const elementName = self.getJsxElementName(jsxParent.openingElement.name);
        const kind = self.inferKindFromTag(elementName);

        self.processExpression(expr, kind, elementName, results, shouldTranslate);
      },

      JSXAttribute(node) {
        const nameNode = node.name;
        if (!nameNode || nameNode.type !== 'JSXIdentifier') return;

        const attrName = nameNode.name;
        const valueNode = node.value;
        if (!valueNode) return;

        const { isNonTranslatableAttribute, isTranslatableAttribute } = require('../validators/htmlValidator');
        if (isNonTranslatableAttribute(attrName)) return;
        if (!isTranslatableAttribute(attrName)) return;

        const kind = self.inferKindFromAttr(attrName);
        self.processAttributeValue(valueNode, attrName, kind, results, shouldTranslate);
      },

      // Object properties (for config objects, labels, etc.)
      Property(node, parent) {
        self.processObjectProperty(node, parent, results, shouldTranslate);
      },
      ObjectProperty(node, parent) {
        self.processObjectProperty(node, parent, results, shouldTranslate);
      },

      // Variable declarations with string values
      VariableDeclarator(node) {
        self.processVariableDeclarator(node, results, shouldTranslate);
      },

      // Return statements that directly return string/templated text
      ReturnStatement(node, parent) {
        self.processReturnStatement(node, parent, results, shouldTranslate);
      },

      // Toast/notification calls
      CallExpression(node) {
        self.processCallExpression(node, results, shouldTranslate);
      },
    };

    this.walk(ast, visitors);

    // As a safety net, also perform a lightweight line-based scan for
    // human-facing string literals (e.g. in computed() blocks) even when
    // AST parsing succeeds.
    this.scanForPlainStrings(content, results, shouldTranslate);
    return results;
  }

  /**
   * Walk AST recursively
   */
  walk(node, visitors, parent = null) {
    if (!node || typeof node !== 'object') return;

    const visitor = visitors[node.type];
    if (visitor) {
      visitor(node, parent);
    }

    for (const key of Object.keys(node)) {
      if (['type', 'loc', 'range', 'start', 'end'].includes(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          this.walk(item, visitors, node);
        }
      } else if (child && typeof child === 'object' && child.type) {
        this.walk(child, visitors, node);
      }
    }
  }

  /**
   * Get JSX element name from AST node
   */
  getJsxElementName(node) {
    if (!node) return null;
    if (node.type === 'JSXIdentifier') return node.name;
    if (node.type === 'JSXMemberExpression') {
      const objectName = this.getJsxElementName(node.object);
      const propName = this.getJsxElementName(node.property);
      if (objectName && propName) return `${objectName}.${propName}`;
      return propName || objectName;
    }
    return null;
  }

  /**
   * Check if node is a string literal
   */
  isStringLiteral(node) {
    if (!node) return false;
    if (node.type === 'StringLiteral') return true;
    if (node.type === 'Literal' && typeof node.value === 'string') return true;
    return false;
  }

  /**
   * Get string value from literal node
   */
  getStringValue(node) {
    if (!node) return null;
    if (node.type === 'StringLiteral') return node.value;
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
    return null;
  }

  /**
   * Build pattern from template literal
   */
  buildPatternFromTemplateLiteral(tpl) {
    if (!tpl || !tpl.quasis) return '';
    const parts = [];
    for (let i = 0; i < tpl.quasis.length; i++) {
      const quasi = tpl.quasis[i];
      const cooked = quasi.value?.cooked ?? quasi.cooked ?? '';
      parts.push(cooked);
      if (tpl.expressions && i < tpl.expressions.length) {
        const expr = tpl.expressions[i];
        const name = this.inferPlaceholderName(expr, i);
        parts.push(`{${name}}`);
      }
    }
    return parts.join('');
  }

  /**
   * Infer placeholder name from expression
   */
  inferPlaceholderName(expr, index) {
    if (!expr) return `value${index + 1}`;
    if (expr.type === 'Identifier') return expr.name;
    if (expr.type === 'MemberExpression' && !expr.computed) {
      const prop = expr.property;
      if (prop?.type === 'Identifier') return prop.name;
    }
    return `value${index + 1}`;
  }

  /**
   * Get text pattern from node
   */
  getTextPattern(node) {
    if (!node) return null;
    if (this.isStringLiteral(node)) return this.getStringValue(node);
    if (node.type === 'TemplateLiteral') {
      if (!node.expressions || node.expressions.length === 0) {
        return node.quasis.map(q => q.value?.cooked ?? q.cooked ?? '').join('');
      }
      return this.buildPatternFromTemplateLiteral(node);
    }
    return null;
  }

  /**
   * Process JSX expression - handles nested ternaries and logical expressions
   */
  processExpression(expr, kind, parentTag, results, shouldTranslate, depth = 0) {
    if (!expr || depth > 10) return; // Prevent infinite recursion

    const pattern = this.getTextPattern(expr);
    if (pattern) {
      const text = pattern.replace(/\s+/g, ' ').trim();
      if (text && shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        results.items.push({ type: 'text', text, kind, parentTag });
        results.stats.extracted++;
      }
    } else if (expr.type === 'ConditionalExpression') {
      // Handle nested ternaries: condition ? a : b ? c : d
      this.processExpression(expr.consequent, kind, parentTag, results, shouldTranslate, depth + 1);
      this.processExpression(expr.alternate, kind, parentTag, results, shouldTranslate, depth + 1);
    } else if (expr.type === 'LogicalExpression') {
      // Handle logical expressions: condition && "text" || "fallback"
      this.processExpression(expr.left, kind, parentTag, results, shouldTranslate, depth + 1);
      this.processExpression(expr.right, kind, parentTag, results, shouldTranslate, depth + 1);
    } else if (expr.type === 'ParenthesizedExpression' || expr.type === 'TSAsExpression') {
      // Handle parenthesized or TypeScript casted expressions
      this.processExpression(expr.expression, kind, parentTag, results, shouldTranslate, depth + 1);
    } else if (expr.type === 'SequenceExpression' && expr.expressions) {
      // Handle comma expressions: (a, b, "text")
      for (const subExpr of expr.expressions) {
        this.processExpression(subExpr, kind, parentTag, results, shouldTranslate, depth + 1);
      }
    }
  }

  /**
   * Process attribute value
   */
  processAttributeValue(valueNode, attrName, kind, results, shouldTranslate) {
    if (!valueNode) return;
    
    // Skip numeric literals
    if (valueNode.type === 'NumericLiteral' || 
        (valueNode.type === 'Literal' && typeof valueNode.value === 'number')) {
      return;
    }
    
    // Skip boolean literals
    if (valueNode.type === 'BooleanLiteral' || 
        (valueNode.type === 'Literal' && typeof valueNode.value === 'boolean')) {
      return;
    }
    
    // Skip null/undefined
    if (valueNode.type === 'NullLiteral' || 
        (valueNode.type === 'Identifier' && valueNode.name === 'undefined')) {
      return;
    }

    const pattern = this.getTextPattern(valueNode);
    if (pattern) {
      const text = pattern.replace(/\s+/g, ' ').trim();
      if (text && shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        results.items.push({ type: 'attribute', text, kind, attributeName: attrName });
        results.stats.extracted++;
      }
    } else if (valueNode.type === 'JSXExpressionContainer') {
      this.processAttributeValue(valueNode.expression, attrName, kind, results, shouldTranslate);
    } else if (valueNode.type === 'ConditionalExpression') {
      this.processAttributeValue(valueNode.consequent, attrName, kind, results, shouldTranslate);
      this.processAttributeValue(valueNode.alternate, attrName, kind, results, shouldTranslate);
    }
  }

  /**
   * Process object property
   */
  processObjectProperty(node, parent, results, shouldTranslate) {
    const keyNode = node.key;
    const valueNode = node.value;
    if (!valueNode) return;

    let propName = null;
    if (keyNode.type === 'Identifier') {
      propName = keyNode.name;
    } else if (this.isStringLiteral(keyNode)) {
      propName = this.getStringValue(keyNode);
    }
    if (!propName) return;

    let kind = null;
    if (propName === 'title') kind = 'heading';
    else if (propName === 'description') kind = 'text';
    else if (propName === 'cta') kind = 'button';
    else if (propName === 'message') kind = 'text';
    else if (propName === 'label' && this.isStringLiteral(valueNode)) {
      const valueText = this.getStringValue(valueNode) || '';
      if (/\s/.test(valueText.trim()) && parent?.type === 'ArrayExpression') {
        kind = 'label';
      }
    }

    if (!kind) return;

    const pattern = this.getTextPattern(valueNode);
    if (!pattern) return;

    const text = pattern.replace(/\s+/g, ' ').trim();
    if (text && shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
      results.items.push({ type: 'string', text, kind });
      results.stats.extracted++;
    }
  }

  /**
   * Process variable declarator
   */
  processVariableDeclarator(node, results, shouldTranslate) {
    const id = node.id;
    const init = node.init;
    if (!id || id.type !== 'Identifier' || !init) return;

    const pattern = this.getTextPattern(init);
    if (!pattern) return;

    const text = pattern.replace(/\s+/g, ' ').trim();
    if (!text) return;

    const varName = id.name || '';
    let kind = 'text';
    if (/title/i.test(varName)) kind = 'heading';
    else if (/label/i.test(varName)) kind = 'label';
    else if (/placeholder/i.test(varName)) kind = 'placeholder';
    else if (/message/i.test(varName)) kind = 'text';

    if (shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
      results.items.push({ type: 'string', text, kind });
      results.stats.extracted++;
    }
  }

  /**
   * Process return statement that yields a string/templated value
   * This is useful for patterns like:
   *   const subtitle = computed(() => { return "Financial spreadsheets"; })
   */
  processReturnStatement(node, parent, results, shouldTranslate) {
    if (!node || !node.argument) return;

    const pattern = this.getTextPattern(node.argument);
    if (!pattern) return;

    const text = pattern.replace(/\s+/g, ' ').trim();
    if (!text) return;

    if (!shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
      return;
    }

    // For now, treat these as generic text. If needed, we can refine kind
    // based on surrounding variable/function names.
    const kind = 'text';
    results.items.push({ type: 'string', text, kind });
    results.stats.extracted++;
  }

  /**
   * Process call expression (toast, notifications, etc.)
   * Skips logging/debug calls to avoid extracting debug messages
   */
  processCallExpression(node, results, shouldTranslate) {
    const callee = node.callee;
    const args = node.arguments || [];

    // Skip logging/debug calls - these are not user-facing
    const { isLoggingCall } = require('../validators');
    const calleeName = this.getCalleeName(callee);
    if (calleeName && isLoggingCall(calleeName)) {
      return; // Skip all logging calls
    }

    // Toast calls: toast.success(), toast.error(), etc.
    if (callee?.type === 'MemberExpression' &&
        callee.object?.type === 'Identifier' && 
        callee.object.name === 'toast') {
      if (args.length > 0) {
        this.collectPatternsFromArg(args[0], 'toast', results, shouldTranslate);
      }
    }

    // Notification calls
    if (callee?.type === 'Identifier' && 
        ['notify', 'notification', 'alert', 'showMessage'].includes(callee.name)) {
      if (args.length > 0) {
        this.collectPatternsFromArg(args[0], 'toast', results, shouldTranslate);
      }
    }
  }

  /**
   * Get callee name from AST node (handles object.method and simple calls)
   */
  getCalleeName(callee) {
    if (!callee) return null;
    if (callee.type === 'Identifier') return callee.name;
    if (callee.type === 'MemberExpression') {
      const obj = callee.object;
      const prop = callee.property;
      let objName = null;
      let propName = null;
      if (obj?.type === 'Identifier') objName = obj.name;
      if (prop?.type === 'Identifier') propName = prop.name;
      if (objName && propName) return `${objName}.${propName}`;
    }
    return null;
  }

  /**
   * Collect patterns from call argument
   */
  collectPatternsFromArg(arg, kind, results, shouldTranslate) {
    const pattern = this.getTextPattern(arg);
    if (pattern) {
      const text = pattern.replace(/\s+/g, ' ').trim();
      if (text && shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
        results.items.push({ type: 'string', text, kind });
        results.stats.extracted++;
      }
    } else if (arg.type === 'ConditionalExpression') {
      this.collectPatternsFromArg(arg.consequent, kind, results, shouldTranslate);
      this.collectPatternsFromArg(arg.alternate, kind, results, shouldTranslate);
    }
  }

  /**
   * Fallback regex-based extraction
   */
  parseWithRegex(content, options = {}) {
    const results = {
      items: [],
      stats: { processed: 1, extracted: 0, errors: 0 },
      errors: ['Using regex fallback - AST parsers not available'],
    };

    const { shouldTranslate } = require('../validators');

    // Make sure ignore patterns from options are respected here as well
    this.ignorePatterns = options.ignorePatterns || this.ignorePatterns || {};

    this.scanForPlainStrings(content, results, shouldTranslate);
    return results;
  }

  /**
   * Generic line-based string scan as a safety net.
   * This helps catch human-facing literals in plain TS/JS files
   * (e.g. computed() return strings) even when they are not reached
   * via JSX/AST visitors.
   */
  scanForPlainStrings(content, results, shouldTranslate) {
    if (!content || typeof content !== 'string') return;

    const { LOGGING_LINE_PATTERNS } = require('../validators');
    const lines = content.split('\n');

    // Mark lines that contain explicit i18n lookups so their literals are
    // not treated as user-facing text.
    const skipLineIndexes = new Set();
    const i18nLinePatterns = [
      /\$?t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /i18n\.t\s*\(\s*['"][^'"]+['"]\s*\)/,
      /useI18n\(\)\.t\s*\(\s*['"][^'"]+['"]\s*\)/,
    ];

    // Skip module specifier strings (import/export from/require/import())
    // These are almost never user-facing text and cause noisy false positives.
    const moduleSpecifierLinePatterns = [
      /^\s*import\s+[\s\S]*?from\s*['"][^'"]+['"]/,
      /^\s*import\s*\(\s*['"][^'"]+['"]\s*\)/,
      /^\s*export\s+[\s\S]*?from\s*['"][^'"]+['"]/,
      /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for i18n patterns
      for (const pattern of i18nLinePatterns) {
        if (pattern.test(line)) {
          skipLineIndexes.add(i);
          break;
        }
      }
      
      // Check for logging/debug patterns - skip these lines entirely
      if (!skipLineIndexes.has(i)) {
        for (const pattern of LOGGING_LINE_PATTERNS) {
          if (pattern.test(line)) {
            skipLineIndexes.add(i);
            break;
          }
        }
      }

      // Skip module import/export specifier lines
      if (!skipLineIndexes.has(i)) {
        for (const pattern of moduleSpecifierLinePatterns) {
          if (pattern.test(line)) {
            skipLineIndexes.add(i);
            break;
          }
        }
      }
    }

    const stringPatterns = [
      /'([^'\\\n]{3,200})'/g,
      /"([^"\\\n]{3,200})"/g,
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line || !line.trim()) continue;

      // Skip lines with i18n lookups or logging calls
      if (skipLineIndexes.has(lineIndex)) {
        continue;
      }

      for (const pattern of stringPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const candidate = (match[1] || '').trim();
          if (!candidate) continue;

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
}

module.exports = { JsxParser };
