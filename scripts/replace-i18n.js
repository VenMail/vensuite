#!/usr/bin/env node
// Version: 0.1.15
/**
 * i18n Replace Script - oxc-parser based
 * 
 * This script uses oxc-parser (Rust-based, ESTree-compatible) for fast AST parsing
 * and magic-string for efficient source code manipulation.
 * 
 * Required dependencies: oxc-parser, magic-string (auto-installed by AI Localizer extension)
 */
const { readdir, readFile, writeFile } = require('node:fs/promises');
const { existsSync, readdirSync } = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// oxc-parser for fast Rust-based parsing
let parseSync;
try {
  parseSync = require('oxc-parser').parseSync;
} catch (err) {
  console.error('[i18n-replace] Warning: oxc-parser is not installed or is incompatible with this Node version.');
  console.error('[i18n-replace] Skipping rewrite. No source files were modified.');
  console.error('[i18n-replace] To enable oxc-based rewrite, install a compatible oxc-parser (e.g. npm install -D oxc-parser)');
  console.error('[i18n-replace] or re-run the AI i18n "Configure Project i18n" command to switch to the Babel-based rewrite script.');
  process.exit(0);
}

// magic-string for efficient source manipulation
let MagicString;
try {
  MagicString = require('magic-string');
} catch (err) {
  console.error('[i18n-replace] Warning: magic-string is not installed.');
  console.error('[i18n-replace] Skipping rewrite. No source files were modified.');
  console.error('[i18n-replace] To enable oxc-based rewrite, install magic-string (e.g. npm install -D magic-string)');
  console.error('[i18n-replace] or re-run the AI i18n "Configure Project i18n" command to switch to the Babel-based rewrite script.');
  process.exit(0);
}

// Import shared utilities
const { detectSrcRoot } = require('./lib/projectConfig');
const { getNamespaceFromFile } = require('./lib/stringUtils');
const { loadIgnorePatterns, shouldIgnoreAttribute, shouldTranslateText } = require('./lib/ignorePatterns');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = detectSrcRoot(projectRoot);
const outputDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');

let hasVueI18n = false;
try {
  const pkgPath = path.resolve(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = require(pkgPath);
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    if (deps['vue-i18n'] || deps['@intlify/vue-i18n']) {
      hasVueI18n = true;
    }
  }
} catch {
}

// Load ignore patterns
const ignorePatterns = loadIgnorePatterns(projectRoot);

// ============================================================================
// AST Node Type Helpers
// ============================================================================

function isStringLiteral(node) {
  if (!node) return false;
  if (node.type === 'StringLiteral') return true;
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  return false;
}

function getStringValue(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function isTemplateLiteral(node) {
  return node && node.type === 'TemplateLiteral';
}

function getJsxElementName(node) {
  if (!node) return null;
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') {
    const objectName = getJsxElementName(node.object);
    const propName = getJsxElementName(node.property);
    if (objectName && propName) return `${objectName}.${propName}`;
    return propName || objectName;
  }
  return null;
}

function inferKindFromJsxElementName(name) {
  if (!name) return 'text';
  const lower = name.toLowerCase();
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(lower)) return 'heading';
  if (lower === 'label') return 'label';
  if (lower === 'button' || name.endsWith('Button')) return 'button';
  if (lower === 'a' || lower === 'link') return 'link';
  if (lower === 'input' || lower === 'textarea' || lower === 'select') return 'placeholder';
  return 'text';
}

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function isCommonShortText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  const cleaned = trimmed.replace(/\s+/g, ' ').trim();

  if (/[.!?]/.test(cleaned)) return false;

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 2) return false;

  if (cleaned.length > 24) return false;

  if (/[\/_]/.test(cleaned)) return false;

  return true;
}

function inferPlaceholderNameFromExpression(expr, index, usedNames = new Set()) {
  if (!expr) return getUniqueName(`value${index + 1}`, usedNames);
  
  let baseName;
  if (expr.type === 'Identifier') {
    baseName = expr.name;
  } else if (expr.type === 'MemberExpression' && !expr.computed) {
    const prop = expr.property;
    if (prop && prop.type === 'Identifier') {
      // For member expressions, include object name to avoid collisions
      // e.g., user.firstName and profile.firstName -> userFirstName, profileFirstName
      const objName = expr.object?.type === 'Identifier' ? expr.object.name : '';
      baseName = objName ? `${objName}${prop.name.charAt(0).toUpperCase()}${prop.name.slice(1)}` : prop.name;
    } else {
      baseName = `value${index + 1}`;
    }
  } else if (expr.type === 'CallExpression') {
    // For function calls like formatDate(date), use the function name
    const callee = expr.callee;
    if (callee?.type === 'Identifier') {
      baseName = callee.name;
    } else if (callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
      baseName = callee.property.name;
    } else {
      baseName = `value${index + 1}`;
    }
  } else {
    baseName = `value${index + 1}`;
  }
  
  return getUniqueName(baseName, usedNames);
}

/**
 * Get a unique name by appending a number if the name is already used
 */
function getUniqueName(baseName, usedNames) {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  
  let counter = 2;
  let uniqueName = `${baseName}${counter}`;
  while (usedNames.has(uniqueName)) {
    counter++;
    uniqueName = `${baseName}${counter}`;
  }
  usedNames.add(uniqueName);
  return uniqueName;
}

/**
 * Build pattern and placeholder info from template literal
 */
function buildPatternAndPlaceholders(tpl, code) {
  if (!tpl || !tpl.quasis) return { pattern: '', placeholders: [] };
  const parts = [];
  const placeholders = [];
  const usedNames = new Set();
  
  for (let i = 0; i < tpl.quasis.length; i++) {
    const quasi = tpl.quasis[i];
    const cooked = quasi.value?.cooked ?? quasi.cooked ?? '';
    parts.push(cooked);
    
    if (tpl.expressions && i < tpl.expressions.length) {
      const expr = tpl.expressions[i];
      const name = inferPlaceholderNameFromExpression(expr, i, usedNames);
      // Get the original expression code
      const exprCode = code.slice(expr.start, expr.end);
      placeholders.push({ name, code: exprCode });
      parts.push(`{${name}}`);
    }
  }
  
  return { pattern: parts.join(''), placeholders };
}

/**
 * Get text pattern from node
 */
function getTextPattern(node, code) {
  if (!node) return null;
  if (isStringLiteral(node)) return getStringValue(node);
  if (isTemplateLiteral(node)) {
    if (!node.expressions || node.expressions.length === 0) {
      return node.quasis.map(q => q.value?.cooked ?? q.cooked ?? '').join('');
    }
    return buildPatternAndPlaceholders(node, code).pattern;
  }
  return null;
}

// ============================================================================
// Translation Key Map
// ============================================================================

function buildKeyMapFromTranslations(translations) {
  const map = new Map();

  function walk(node, pathSegments) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    
    for (const [key, value] of Object.entries(node)) {
      const nextPath = [...pathSegments, key];
      if (typeof value === 'string') {
        if (!shouldTranslateText(value, ignorePatterns)) continue;
        if (nextPath.length < 3) continue;
        
        const namespace = nextPath.slice(0, -2).join('.');
        const kind = nextPath[nextPath.length - 2];
        const keyId = `${namespace}|${kind}|${value}`;
        const fullKey = nextPath.join('.');
        
        if (!map.has(keyId)) {
          map.set(keyId, fullKey);
        }

        // Also register a generic "text" alias so that minor kind
        // mismatches (e.g. button vs text) during rewrite don't prevent
        // us from finding an existing translation. This only affects the
        // internal keyMap used by the rewrite script; the actual
        // translation JSON structure (namespace.kind.slug) is unchanged.
        if (kind !== 'text') {
          const textAliasId = `${namespace}|text|${value}`;
          if (!map.has(textAliasId)) {
            map.set(textAliasId, fullKey);
          }
        }
      } else {
        walk(value, nextPath);
      }
    }
  }

  walk(translations, []);
  return map;
}

// ============================================================================
// AST Walker with Parent Tracking
// ============================================================================

function walk(node, visitors, parent = null, parentKey = null, ancestors = []) {
  if (!node || typeof node !== 'object') return;

  const visitor = visitors[node.type];
  if (visitor) {
    visitor(node, parent, parentKey, ancestors);
  }

  const newAncestors = [...ancestors, node];
  
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (let i = 0; i < child.length; i++) {
        walk(child[i], visitors, node, key, newAncestors);
      }
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, visitors, node, key, newAncestors);
    }
  }
}

// ============================================================================
// File Collection
// ============================================================================

async function collectSourceFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public'].includes(entry.name)) {
        continue;
      }
      await collectSourceFiles(entryPath, out);
    } else if (entry.isFile()) {
      if (/\.(tsx|ts|jsx|js)$/i.test(entry.name)) {
        out.push(entryPath);
      }
    }
  }
}

async function collectVueFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public'].includes(entry.name)) {
        continue;
      }
      await collectVueFiles(entryPath, out);
    } else if (entry.isFile()) {
      if (/\.vue$/i.test(entry.name)) {
        out.push(entryPath);
      }
    }
  }
}

// ============================================================================
// Import Management
// ============================================================================

/**
 * Check if file has i18n import and find position to insert if needed
 * Also detects directive strings like "use client", "use strict", "use server"
 */
function analyzeImports(ast, code) {
  let hasI18nImport = false;
  let hasTConflict = false;
  let lastImportEnd = 0;
  let firstImportStart = -1;
  let directiveEnd = 0;

  // Check for directive prologue (must be at the very start of the file)
  const body = ast.body || [];
  for (const node of body) {
    // Directive strings are ExpressionStatements with string literals
    if (node.type === 'ExpressionStatement') {
      const expr = node.expression;
      if (expr && (expr.type === 'StringLiteral' || 
          (expr.type === 'Literal' && typeof expr.value === 'string'))) {
        const value = expr.value || '';
        // Common directive strings
        if (['use strict', 'use client', 'use server'].includes(value)) {
          directiveEnd = Math.max(directiveEnd, node.end);
          continue;
        }
      }
    }
    // Once we hit a non-directive statement, stop checking
    break;
  }

  walk(ast, {
    ImportDeclaration(node) {
      if (firstImportStart === -1) {
        firstImportStart = node.start;
      }
      lastImportEnd = node.end;
      
      const source = node.source?.value;
      for (const spec of (node.specifiers || [])) {
        if (spec.type === 'ImportSpecifier' && spec.local?.name === 't') {
          if (source === '@/i18n') {
            hasI18nImport = true;
          } else {
            hasTConflict = true;
          }
        }
      }
    }
  });

  return { hasI18nImport, hasTConflict, lastImportEnd, firstImportStart, directiveEnd };
}

/**
 * Generate import statement string for regular JS/TS files
 */
function generateImportStatement() {
  return "import { t } from '@/i18n';\n";
}

/**
 * Generate import statement for Vue script sections
 * Uses useI18n if vue-i18n is detected, otherwise falls back to @/i18n
 */
function generateVueImportStatement() {
  if (hasVueI18n) {
    return "import { useI18n } from 'vue-i18n';\n";
  }
  return "import { t } from '@/i18n';\n";
}

/**
 * Check if script section already has useI18n import or t function setup
 */
function hasVueI18nSetup(scriptContent) {
  // Check for useI18n import
  if (/import\s*\{[^}]*useI18n[^}]*\}\s*from\s*['"]vue-i18n['"]/.test(scriptContent)) {
    return true;
  }
  // Check for const { t } = useI18n() pattern
  if (/const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\s*\(\s*\)/.test(scriptContent)) {
    return true;
  }
  // Check for existing t import from @/i18n
  if (/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"]@\/i18n['"]/.test(scriptContent)) {
    return true;
  }
  return false;
}

// ============================================================================
// Replacement Generation
// ============================================================================

/**
 * Generate t() call code for a simple string
 */
function generateTCall(fullKey) {
  return `t('${fullKey}')`;
}

/**
 * Generate t() call code with placeholders
 */
function generateTCallWithPlaceholders(fullKey, placeholders) {
  if (!placeholders || placeholders.length === 0) {
    return generateTCall(fullKey);
  }
  const params = placeholders.map(p => `${p.name}: ${p.code}`).join(', ');
  return `t('${fullKey}', { ${params} })`;
}

// ============================================================================
// File Processing
// ============================================================================

// Simple state machine states for Vue template rewriting
const VUE_STATE = {
  TEXT: 'TEXT',
  TAG_NAME: 'TAG_NAME',
  TAG_SPACE: 'TAG_SPACE',
  ATTR_NAME: 'ATTR_NAME',
  ATTR_VALUE_START: 'ATTR_VALUE_START',
  ATTR_VALUE: 'ATTR_VALUE',
  TAG_CLOSE: 'TAG_CLOSE',
  COMMENT: 'COMMENT',
  SCRIPT: 'SCRIPT',
  STYLE: 'STYLE',
};

/**
 * Extract the main <template> section from a Vue SFC, handling nested
 * <template> slots by tracking depth instead of relying on a single
 * non-greedy regex.
 */
function extractVueTemplateRange(code) {
  if (!code || typeof code !== 'string') return null;

  const openMatch = code.match(/^[\s\S]*?<template(\s[^>]*)?>|<template(\s[^>]*)?>/i);
  if (!openMatch) return null;

  const fullStart = openMatch.index;
  const innerStart = fullStart + openMatch[0].length;
  let depth = 1;
  let pos = innerStart;
  const len = code.length;

  while (pos < len && depth > 0) {
    const nextOpen = code.indexOf('<template', pos);
    const nextClose = code.indexOf('</template>', pos);

    if (nextClose === -1) {
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const afterOpen = code[nextOpen + 9];
      if (!afterOpen || /[\s>\/]/.test(afterOpen)) {
        depth += 1;
      }
      pos = nextOpen + 9;
    } else {
      depth -= 1;
      if (depth === 0) {
        const innerEnd = nextClose;
        const fullEnd = nextClose + 11; // '</template>'.length
        return { fullStart, fullEnd, innerStart, innerEnd };
      }
      pos = nextClose + 11;
    }
  }

  // Fallback: greedy match for last </template>
  const greedy = code.match(/<template[^>]*>([\s\S]*)<\/template>/i);
  if (!greedy || typeof greedy.index !== 'number') return null;

  const gFullStart = greedy.index;
  const gInnerStart = gFullStart + greedy[0].length - greedy[1].length - 11;
  const gInnerEnd = gInnerStart + greedy[1].length;
  const gFullEnd = gInnerEnd + 11;
  return { fullStart: gFullStart, fullEnd: gFullEnd, innerStart: gInnerStart, innerEnd: gInnerEnd };
}

/**
 * Rewrite the inner Vue template content by walking tags/text with a
 * lightweight state machine. For each plain-text node, look up the
 * corresponding translation key and, if found, wrap it in {{$t('key')}}.
 */
function rewriteVueTemplate(template, namespace, keyMap) {
  if (!template || typeof template !== 'string') return template;

  let state = VUE_STATE.TEXT;
  let pos = 0;
  let textStart = 0;
  let tagName = '';
  let currentTag = '';
  let attrName = '';
  let attrValue = '';
  let attrQuote = '';
  const tagStack = [];
  const len = template.length;
  let out = '';
  let lastEmitPos = 0;

  const getCurrentParentTag = () =>
    (tagStack.length > 0 ? tagStack[tagStack.length - 1] : null);

  function maybeRewriteTextSegment(start, end) {
    if (end <= start) return;
    const rawText = template.slice(start, end);
    if (!rawText || !rawText.trim()) return;
    const parentTag = getCurrentParentTag();
    const kind = inferKindFromJsxElementName(parentTag || 'div');

    function rewritePlainTextFragment(fragment) {
      if (!fragment || !fragment.trim()) return fragment;

      // Idempotency guard: skip if already contains $t() or t() calls
      if (/\{\{\s*\$?t\s*\(/.test(fragment)) return fragment;
      
      const cleaned = normalizeText(fragment);
      if (!cleaned) return fragment;
      
      // Skip if text looks like a translation key (dot-separated path starting with capital)
      if (/^[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(cleaned)) return fragment;

      const nsForKey = isCommonShortText(cleaned) ? 'Commons' : namespace;
      let keyId = `${nsForKey}|${kind}|${cleaned}`;
      let fullKey = keyMap.get(keyId);

      // Fallback: allow generic "text" alias if kind-specific key is missing.
      if (!fullKey && kind !== 'text') {
        keyId = `${nsForKey}|text|${cleaned}`;
        fullKey = keyMap.get(keyId);
      }

      if (!fullKey) return fragment;

      const leadingSpaceMatch = fragment.match(/^\s*/);
      const trailingSpaceMatch = fragment.match(/\s*$/);
      const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
      const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';

      const escapedKey = String(fullKey).replace(/'/g, "\\'");
      return `${leadingSpace}{{$t('${escapedKey}')}}${trailingSpace}`;
    }

    // Handle Vue mustache expressions specially so we can rewrite
    // string literals inside expressions (e.g. ternaries) to $t() calls.
    if (rawText.includes('{{') && rawText.includes('}}')) {
      const mustacheRegex = /\{\{([^}]+)\}\}/g;
      let resultText = '';
      let lastIndex = 0;
      let hasChange = false;

      let match;
      while ((match = mustacheRegex.exec(rawText)) !== null) {
        const before = rawText.slice(lastIndex, match.index);
        if (before) {
          resultText += rewritePlainTextFragment(before);
        }

        const expr = match[1] || '';
        let exprChanged = false;
        const stringRegex = /(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\1/g;

        const rewrittenExpr = expr.replace(stringRegex, (m, quote, body, offset) => {
          const candidate = (body || '').trim();
          if (!candidate) return m;

          // Idempotency guard: skip if this string is the argument of an existing $t() or t() call
          // Check if there's a $t( or t( immediately before this match position
          const beforeMatch = expr.slice(0, offset);
          if (/\$?t\s*\(\s*$/.test(beforeMatch)) return m;
          
          // Skip if text looks like a translation key (dot-separated path starting with capital)
          if (/^[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(candidate)) return m;

          const cleaned = normalizeText(candidate);
          if (!cleaned) return m;

          const nsForKey = isCommonShortText(cleaned) ? 'Commons' : namespace;
          let keyId = `${nsForKey}|${kind}|${cleaned}`;
          let fullKey = keyMap.get(keyId);

          if (!fullKey && kind !== 'text') {
            keyId = `${nsForKey}|text|${cleaned}`;
            fullKey = keyMap.get(keyId);
          }

          if (!fullKey) return m;

          const escapedKey = String(fullKey).replace(/'/g, "\\'");
          exprChanged = true;
          return `$t('${escapedKey}')`;
        });

        if (exprChanged) {
          hasChange = true;
        }

        resultText += `{{${rewrittenExpr}}}`;
        lastIndex = match.index + match[0].length;
      }

      const tail = rawText.slice(lastIndex);
      if (tail) {
        resultText += rewritePlainTextFragment(tail);
      }

      if (!hasChange) return;

      out += template.slice(lastEmitPos, start);
      out += resultText;
      lastEmitPos = end;
      return;
    }

    const rewritten = rewritePlainTextFragment(rawText);
    if (rewritten === rawText) return;

    out += template.slice(lastEmitPos, start);
    out += rewritten;
    lastEmitPos = end;
  }

  while (pos < len) {
    const char = template[pos];
    const nextChar = pos + 1 < len ? template[pos + 1] : '';

    switch (state) {
      case VUE_STATE.TEXT: {
        if (char === '<' && template.slice(pos, pos + 4) === '<!--') {
          maybeRewriteTextSegment(textStart, pos);
          state = VUE_STATE.COMMENT;
          pos += 4;
          continue;
        }

        if (char === '<') {
          maybeRewriteTextSegment(textStart, pos);
          if (nextChar === '/') {
            state = VUE_STATE.TAG_CLOSE;
            pos += 2;
            tagName = '';
          } else if (/[a-zA-Z]/.test(nextChar)) {
            state = VUE_STATE.TAG_NAME;
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

      case VUE_STATE.COMMENT: {
        if (char === '-' && template.slice(pos, pos + 3) === '-->') {
          pos += 3;
          state = VUE_STATE.TEXT;
          textStart = pos;
          continue;
        }
        pos += 1;
        break;
      }

      case VUE_STATE.TAG_NAME: {
        if (/[a-zA-Z0-9_:-]/.test(char)) {
          tagName += char;
          pos += 1;
        } else if (char === '>' || char === '/') {
          currentTag = tagName;
          const lowerTag = tagName.toLowerCase();

          if (lowerTag === 'script') {
            state = VUE_STATE.SCRIPT;
          } else if (lowerTag === 'style') {
            state = VUE_STATE.STYLE;
          } else if (char === '/') {
            if (template[pos + 1] === '>') pos += 2; else pos += 1;
            state = VUE_STATE.TEXT;
            textStart = pos;
          } else {
            tagStack.push(tagName);
            pos += 1;
            state = VUE_STATE.TEXT;
            textStart = pos;
          }
        } else if (/\s/.test(char)) {
          currentTag = tagName;
          state = VUE_STATE.TAG_SPACE;
          pos += 1;
        } else {
          pos += 1;
        }
        break;
      }

      case VUE_STATE.TAG_SPACE: {
        if (/\s/.test(char)) {
          pos += 1;
        } else if (char === '>') {
          const lowerTag = currentTag.toLowerCase();
          if (lowerTag === 'script') {
            state = VUE_STATE.SCRIPT;
            pos += 1;
          } else if (lowerTag === 'style') {
            state = VUE_STATE.STYLE;
            pos += 1;
          } else {
            tagStack.push(currentTag);
            pos += 1;
            state = VUE_STATE.TEXT;
            textStart = pos;
          }
        } else if (char === '/') {
          if (template[pos + 1] === '>') pos += 2; else pos += 1;
          state = VUE_STATE.TEXT;
          textStart = pos;
        } else if (/[a-zA-Z@:#v]/.test(char)) {
          state = VUE_STATE.ATTR_NAME;
          attrName = char;
          pos += 1;
        } else {
          pos += 1;
        }
        break;
      }

      case VUE_STATE.ATTR_NAME: {
        if (/[a-zA-Z0-9_:@#.\-\[\]]/.test(char)) {
          attrName += char;
          pos += 1;
        } else if (char === '=') {
          state = VUE_STATE.ATTR_VALUE_START;
          pos += 1;
        } else if (/\s/.test(char)) {
          state = VUE_STATE.TAG_SPACE;
          pos += 1;
        } else if (char === '>' || char === '/') {
          if (char === '/') {
            if (template[pos + 1] === '>') pos += 2; else pos += 1;
            state = VUE_STATE.TEXT;
            textStart = pos;
          } else {
            tagStack.push(currentTag);
            pos += 1;
            state = VUE_STATE.TEXT;
            textStart = pos;
          }
        } else {
          pos += 1;
        }
        break;
      }

      case VUE_STATE.ATTR_VALUE_START: {
        if (char === '"' || char === "'") {
          attrQuote = char;
          attrValue = '';
          state = VUE_STATE.ATTR_VALUE;
          pos += 1;
        } else if (/\s/.test(char)) {
          pos += 1;
        } else {
          attrQuote = '';
          attrValue = char;
          state = VUE_STATE.ATTR_VALUE;
          pos += 1;
        }
        break;
      }

      case VUE_STATE.ATTR_VALUE: {
        if (attrQuote) {
          if (char === attrQuote) {
            // Vue attributes are rewritten via JS/TS rewrite; we only
            // consume the value here.
            state = VUE_STATE.TAG_SPACE;
            pos += 1;
          } else {
            attrValue += char;
            pos += 1;
          }
        } else {
          if (/[\s>\/]/.test(char)) {
            state = VUE_STATE.TAG_SPACE;
            if (char === '>') {
              tagStack.push(currentTag);
              state = VUE_STATE.TEXT;
              textStart = pos + 1;
            }
            pos += 1;
          } else {
            attrValue += char;
            pos += 1;
          }
        }
        break;
      }

      case VUE_STATE.TAG_CLOSE: {
        if (char === '>') {
          const closingTag = tagName.toLowerCase();
          while (tagStack.length > 0) {
            const top = tagStack.pop();
            if (top.toLowerCase() === closingTag) break;
          }
          pos += 1;
          state = VUE_STATE.TEXT;
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

      case VUE_STATE.SCRIPT: {
        if (char === '<' && template.slice(pos, pos + 9).toLowerCase() === '</script>') {
          pos += 9;
          state = VUE_STATE.TEXT;
          textStart = pos;
          continue;
        }
        pos += 1;
        break;
      }

      case VUE_STATE.STYLE: {
        if (char === '<' && template.slice(pos, pos + 8).toLowerCase() === '</style>') {
          pos += 8;
          state = VUE_STATE.TEXT;
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

  if (state === VUE_STATE.TEXT && textStart < len) {
    maybeRewriteTextSegment(textStart, len);
  }

  if (lastEmitPos === 0) {
    return template;
  }

  if (lastEmitPos < len) {
    out += template.slice(lastEmitPos);
  }

  return out;
}

async function processFile(filePath, keyMap) {
  const code = await readFile(filePath, 'utf8');
  const namespace = getNamespaceFromFile(filePath, srcRoot);
  
  const ext = path.extname(filePath).toLowerCase();
  const sourceFilename = path.basename(filePath);

  let result;
  try {
    result = parseSync(sourceFilename, code, {
      sourceType: 'module',
      lang: ext === '.tsx' ? 'tsx' : ext === '.ts' ? 'ts' : ext === '.jsx' ? 'jsx' : 'js',
    });
  } catch (err) {
    console.error(`[i18n-replace] Parse error in ${filePath}:`, err.message);
    return { changed: false, skippedDueToConflict: false };
  }

  if (!result || !result.program) {
    return { changed: false, skippedDueToConflict: false };
  }

  const ast = result.program;
  const s = new MagicString(code);
  
  // Analyze imports
  const { hasI18nImport, hasTConflict, lastImportEnd, firstImportStart, directiveEnd } = analyzeImports(ast, code);
  
  if (hasTConflict) {
    return { changed: false, skippedDueToConflict: true };
  }

  // Track replacements to avoid overlapping edits
  const replacements = [];
  let needsImport = false;

  // Helper to add a replacement
  // Strategy: Allow nested replacements where one is fully contained in another
  // When applying, only apply the innermost (smallest) replacements
  const addReplacement = (start, end, newCode) => {
    // Check for partial overlaps (but allow full containment)
    for (const r of replacements) {
      const isFullyContained = (start >= r.start && end <= r.end) || (r.start >= start && r.end <= end);
      const hasOverlap = (start >= r.start && start < r.end) || (end > r.start && end <= r.end) ||
                         (r.start >= start && r.start < end) || (r.end > start && r.end <= end);
      
      if (hasOverlap && !isFullyContained) {
        return false; // Partial overlap, skip
      }
      
      // If the new range fully contains an existing one, keep the smaller one
      if (r.start >= start && r.end <= end) {
        // Existing range is inside new range - skip the new (larger) one
        return false;
      }
      
      // If existing range fully contains the new one, we'll add it and filter later
    }
    replacements.push({ start, end, newCode });
    needsImport = true;
    return true;
  };
  
  // Helper to filter replacements to only keep innermost (smallest) ones
  const filterToInnermostReplacements = () => {
    // Sort by start position, then by size (smallest first)
    replacements.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (a.end - a.start) - (b.end - b.start);
    });
    
    // Remove any replacement that fully contains another
    const filtered = [];
    for (const r of replacements) {
      const isContainer = replacements.some(other => 
        other !== r && other.start >= r.start && other.end <= r.end
      );
      if (!isContainer) {
        filtered.push(r);
      }
    }
    
    // Replace the array contents
    replacements.length = 0;
    replacements.push(...filtered);
  };

  // Helper to build replacement for string/template
  const tryReplace = (node, kind) => {
    if (isStringLiteral(node)) {
      const text = normalizeText(getStringValue(node));
      if (!shouldTranslateText(text, ignorePatterns)) return false;
      
      // Idempotency guard: skip if text looks like a translation key
      if (/^[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(text)) return false;
      
      const keyId = `${namespace}|${kind}|${text}`;
      const fullKey = keyMap.get(keyId);
      if (!fullKey) return false;
      
      return addReplacement(node.start, node.end, generateTCall(fullKey));
    }
    
    if (isTemplateLiteral(node)) {
      const { pattern, placeholders } = buildPatternAndPlaceholders(node, code);
      const text = normalizeText(pattern);
      if (!shouldTranslateText(text, ignorePatterns)) return false;
      
      // Idempotency guard: skip if text looks like a translation key
      if (/^[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(text)) return false;
      
      const keyId = `${namespace}|${kind}|${text}`;
      const fullKey = keyMap.get(keyId);
      if (!fullKey) return false;
      
      return addReplacement(node.start, node.end, generateTCallWithPlaceholders(fullKey, placeholders));
    }
    
    return false;
  };

  // Process conditionals recursively
  const processConditional = (node, kind) => {
    if (!node) return false;
    
    if (isStringLiteral(node) || isTemplateLiteral(node)) {
      return tryReplace(node, kind);
    }
    
    if (node.type === 'ConditionalExpression') {
      const a = processConditional(node.consequent, kind);
      const b = processConditional(node.alternate, kind);
      return a || b;
    }
    
    return false;
  };

  // Track current JSX element
  let currentJsxElement = null;

  const visitors = {
    JSXElement(node) {
      currentJsxElement = node;
    },

    JSXText(node, parent) {
      const raw = node.value || '';
      const hasLeadingSpace = /^\s/.test(raw);
      const hasTrailingSpace = /\s$/.test(raw);
      const text = normalizeText(raw);
      
      if (!shouldTranslateText(text, ignorePatterns)) return;
      
      const jsxParent = parent?.type === 'JSXElement' ? parent : currentJsxElement;
      if (!jsxParent?.openingElement) return;
      
      const elementName = getJsxElementName(jsxParent.openingElement.name);
      const kind = inferKindFromJsxElementName(elementName);
      
      const nsForKey = isCommonShortText(text) ? 'Commons' : namespace;
      const keyId = `${nsForKey}|${kind}|${text}`;
      const fullKey = keyMap.get(keyId);
      if (!fullKey) return;
      
      // Build replacement with preserved spacing
      let replacement = `{${generateTCall(fullKey)}}`;
      if (hasLeadingSpace) replacement = ' ' + replacement;
      if (hasTrailingSpace) replacement = replacement + ' ';
      
      addReplacement(node.start, node.end, replacement);
    },

    JSXExpressionContainer(node, parent) {
      const expr = node.expression;
      if (!expr || expr.type === 'JSXEmptyExpression') return;
      
      const jsxParent = parent?.type === 'JSXElement' ? parent : currentJsxElement;
      if (!jsxParent?.openingElement) return;
      
      const elementName = getJsxElementName(jsxParent.openingElement.name);
      const kind = inferKindFromJsxElementName(elementName);
      
      // Only replace the expression inside the container, not the container itself
      if (isStringLiteral(expr) || isTemplateLiteral(expr)) {
        tryReplace(expr, kind);
      } else if (expr.type === 'ConditionalExpression') {
        processConditional(expr, kind);
      }
    },

    JSXAttribute(node) {
      const nameNode = node.name;
      if (!nameNode || nameNode.type !== 'JSXIdentifier') return;
      
      const attrName = nameNode.name;
      const valueNode = node.value;
      if (!valueNode) return;
      if (shouldIgnoreAttribute(attrName, ignorePatterns)) return;
      
      let kind = null;
      if (attrName === 'placeholder') kind = 'placeholder';
      else if (attrName === 'title') kind = 'title';
      else if (attrName === 'alt') kind = 'alt';
      else if (attrName === 'aria-label') kind = 'aria_label';
      else if (attrName === 'label') kind = 'label';
      if (!kind) return;
      
      // Handle string literal value: placeholder="text" -> placeholder={t('key')}
      if (isStringLiteral(valueNode)) {
        const text = normalizeText(getStringValue(valueNode));
        if (!shouldTranslateText(text, ignorePatterns)) return;
        
        const nsForKey = isCommonShortText(text) ? 'Commons' : namespace;
        const keyId = `${nsForKey}|${kind}|${text}`;
        const fullKey = keyMap.get(keyId);
        if (!fullKey) return;
        
        addReplacement(valueNode.start, valueNode.end, `{${generateTCall(fullKey)}}`);
        return;
      }
      
      // Handle expression container: placeholder={"text"} or placeholder={`text`}
      if (valueNode.type === 'JSXExpressionContainer') {
        const expr = valueNode.expression;
        if (isStringLiteral(expr) || isTemplateLiteral(expr)) {
          tryReplace(expr, kind);
        } else if (expr?.type === 'ConditionalExpression') {
          processConditional(expr, kind);
        }
      }
    },

    // Handle object properties (Property in ESTree, ObjectProperty in Babel)
    Property(node) {
      processObjectProperty(node, namespace, keyMap, code, tryReplace);
    },
    ObjectProperty(node) {
      processObjectProperty(node, namespace, keyMap, code, tryReplace);
    },

    VariableDeclarator(node) {
      const id = node.id;
      const init = node.init;
      if (!id || id.type !== 'Identifier' || !init) return;
      
      const varName = id.name || '';
      let kind = 'text';
      if (/title/i.test(varName)) kind = 'heading';
      else if (/label/i.test(varName)) kind = 'label';
      else if (/placeholder/i.test(varName)) kind = 'placeholder';
      
      tryReplace(init, kind);
    },

    AssignmentExpression(node) {
      const left = node.left;
      const right = node.right;
      
      // document.title = ...
      if (left?.type === 'MemberExpression' && !left.computed) {
        if (left.object?.type === 'Identifier' && left.object.name === 'document' &&
            left.property?.type === 'Identifier' && left.property.name === 'title') {
          tryReplace(right, 'title');
          return;
        }
      }
      
      // Variable assignment
      if (left?.type === 'Identifier') {
        const varName = left.name || '';
        let kind = 'text';
        if (/title/i.test(varName)) kind = 'heading';
        else if (/label/i.test(varName)) kind = 'label';
        else if (/placeholder/i.test(varName)) kind = 'placeholder';
        
        tryReplace(right, kind);
      }
    },

    CallExpression(node) {
      const callee = node.callee;
      const args = node.arguments || [];
      
      // toast.xxx(...) calls
      if (callee?.type === 'MemberExpression' &&
          callee.object?.type === 'Identifier' && callee.object.name === 'toast') {
        if (args.length > 0) {
          const first = args[0];
          if (isStringLiteral(first) || isTemplateLiteral(first)) {
            tryReplace(first, 'toast');
          } else if (first?.type === 'ConditionalExpression') {
            processConditional(first, 'toast');
          }
        }
      }
    },
  };

  walk(ast, visitors);

  // Filter to only innermost replacements (for nested structures)
  filterToInnermostReplacements();
  
  // Apply replacements (sort by position descending to avoid offset issues)
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    s.overwrite(r.start, r.end, r.newCode);
  }

  // Add import if needed
  if (needsImport && !hasI18nImport) {
    const importStmt = generateImportStatement();
    if (lastImportEnd > 0) {
      // Insert after last import
      s.appendRight(lastImportEnd, '\n' + importStmt.trim());
    } else if (firstImportStart >= 0) {
      // Insert before first import
      s.prependLeft(firstImportStart, importStmt);
    } else if (directiveEnd > 0) {
      // Insert after directive string ("use client", "use strict", etc.)
      s.appendRight(directiveEnd, '\n' + importStmt.trim());
    } else {
      // No imports, add at beginning
      s.prepend(importStmt);
    }
  }

  const changed = replacements.length > 0;
  if (changed) {
    await writeFile(filePath, s.toString(), 'utf8');
  }

  return { changed, skippedDueToConflict: false };
}

function processObjectProperty(node, namespace, keyMap, code, tryReplace) {
  const keyNode = node.key;
  const valueNode = node.value;
  if (!valueNode) return;
  
  let propName = null;
  if (keyNode?.type === 'Identifier') {
    propName = keyNode.name;
  } else if (isStringLiteral(keyNode)) {
    propName = getStringValue(keyNode);
  }
  if (!propName) return;
  
  let kind = null;
  if (propName === 'title') kind = 'heading';
  else if (propName === 'description') kind = 'text';
  else if (propName === 'cta') kind = 'button';
  
  // Heuristic for label property
  if (!kind && propName === 'label' && isStringLiteral(valueNode)) {
    const valueText = getStringValue(valueNode) || '';
    if (/\s/.test(valueText.trim())) {
      kind = 'label';
    }
  }
  
  if (!kind) return;
  
  tryReplace(valueNode, kind);
}

function rewriteVueScriptSections(code, namespace, keyMap) {
  const scriptRegex = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;

  while ((match = scriptRegex.exec(code)) !== null) {
    const fullMatch = match[0];
    const openTagEnd = fullMatch.indexOf('>');
    if (openTagEnd === -1) {
      continue;
    }

    const contentStart = match.index + openTagEnd + 1;
    const contentEnd = match.index + fullMatch.length - '</script>'.length;
    const scriptContent = code.slice(contentStart, contentEnd);
    if (!scriptContent.trim()) {
      continue;
    }

    let result;
    try {
      result = parseSync('vue-script.ts', scriptContent, {
        sourceType: 'module',
        lang: 'ts',
      });
    } catch {
      continue;
    }

    if (!result || !result.program) {
      continue;
    }

    const ast = result.program;
    const s = new MagicString(scriptContent);

    const { hasI18nImport, hasTConflict, lastImportEnd, firstImportStart, directiveEnd } = analyzeImports(ast, scriptContent);
    if (hasTConflict) {
      continue;
    }

    const replacements = [];
    let needsImport = false;

    const addReplacement = (start, end, newCode) => {
      for (const r of replacements) {
        if ((start >= r.start && start < r.end) || (end > r.start && end <= r.end)) {
          return false;
        }
      }
      replacements.push({ start, end, newCode });
      needsImport = true;
      return true;
    };

    const tryReplace = (node, kind) => {
      if (isStringLiteral(node)) {
        const text = normalizeText(getStringValue(node));
        if (!shouldTranslateText(text, ignorePatterns)) return false;
        
        // Idempotency guard: skip if text looks like a translation key
        if (/^[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(text)) return false;

        const nsForKey = isCommonShortText(text) ? 'Commons' : namespace;
        const keyId = `${nsForKey}|${kind}|${text}`;
        const fullKey = keyMap.get(keyId);
        if (!fullKey) return false;

        return addReplacement(node.start, node.end, generateTCall(fullKey));
      }

      if (isTemplateLiteral(node)) {
        const { pattern, placeholders } = buildPatternAndPlaceholders(node, scriptContent);
        const text = normalizeText(pattern);
        if (!shouldTranslateText(text, ignorePatterns)) return false;
        
        // Idempotency guard: skip if text looks like a translation key
        if (/^[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(text)) return false;

        const nsForKey = isCommonShortText(text) ? 'Commons' : namespace;
        const keyId = `${nsForKey}|${kind}|${text}`;
        const fullKey = keyMap.get(keyId);
        if (!fullKey) return false;

        return addReplacement(node.start, node.end, generateTCallWithPlaceholders(fullKey, placeholders));
      }

      return false;
    };

    const processConditional = (node, kind) => {
      if (!node) return false;

      if (isStringLiteral(node) || isTemplateLiteral(node)) {
        return tryReplace(node, kind);
      }

      if (node.type === 'ConditionalExpression') {
        const a = processConditional(node.consequent, kind);
        const b = processConditional(node.alternate, kind);
        return a || b;
      }

      return false;
    };

    const visitors = {
      Property(node) {
        processObjectProperty(node, namespace, keyMap, scriptContent, tryReplace);
      },
      ObjectProperty(node) {
        processObjectProperty(node, namespace, keyMap, scriptContent, tryReplace);
      },
      VariableDeclarator(node) {
        const id = node.id;
        const init = node.init;
        if (!id || id.type !== 'Identifier' || !init) return;

        const varName = id.name || '';
        let kind = 'text';
        if (/title/i.test(varName)) kind = 'heading';
        else if (/label/i.test(varName)) kind = 'label';
        else if (/placeholder/i.test(varName)) kind = 'placeholder';

        tryReplace(init, kind);
      },
      AssignmentExpression(node) {
        const left = node.left;
        const right = node.right;

        if (left?.type === 'MemberExpression' && !left.computed) {
          if (left.object?.type === 'Identifier' && left.object.name === 'document' &&
              left.property?.type === 'Identifier' && left.property.name === 'title') {
            tryReplace(right, 'title');
            return;
          }
        }

        if (left?.type === 'Identifier') {
          const varName = left.name || '';
          let kind = 'text';
          if (/title/i.test(varName)) kind = 'heading';
          else if (/label/i.test(varName)) kind = 'label';
          else if (/placeholder/i.test(varName)) kind = 'placeholder';

          tryReplace(right, kind);
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        const args = node.arguments || [];

        if (callee?.type === 'MemberExpression' &&
            callee.object?.type === 'Identifier' && callee.object.name === 'toast') {
          if (args.length > 0) {
            const first = args[0];
            if (isStringLiteral(first) || isTemplateLiteral(first)) {
              tryReplace(first, 'toast');
            } else if (first?.type === 'ConditionalExpression') {
              processConditional(first, 'toast');
            }
          }
        }
      },
    };

    walk(ast, visitors);

    replacements.sort((a, b) => b.start - a.start);
    for (const r of replacements) {
      s.overwrite(r.start, r.end, r.newCode);
    }

    if (needsImport && !hasI18nImport) {
      const importStmt = generateImportStatement();
      if (lastImportEnd > 0) {
        s.appendRight(lastImportEnd, '\n' + importStmt.trim());
      } else if (firstImportStart >= 0) {
        s.prependLeft(firstImportStart, importStmt);
      } else if (directiveEnd > 0) {
        s.appendRight(directiveEnd, '\n' + importStmt.trim());
      } else {
        s.prepend(importStmt);
      }
    }

    if (replacements.length > 0) {
      blocks.push({ start: contentStart, end: contentEnd, newCode: s.toString() });
    }
  }

  if (blocks.length === 0) {
    return { code, changed: false };
  }

  blocks.sort((a, b) => b.start - a.start);
  let out = code;
  for (const b of blocks) {
    out = out.slice(0, b.start) + b.newCode + out.slice(b.end);
  }

  return { code: out, changed: true };
}

async function processVueFile(filePath, keyMap) {
  let code = await readFile(filePath, 'utf8');
  const namespace = getNamespaceFromFile(filePath, srcRoot);
  let changed = false;

  const scriptResult = rewriteVueScriptSections(code, namespace, keyMap);
  code = scriptResult.code;
  if (scriptResult.changed) {
    changed = true;
  }

  const range = extractVueTemplateRange(code);
  if (range) {
    const { innerStart, innerEnd } = range;
    const inner = code.slice(innerStart, innerEnd);
    const rewritten = rewriteVueTemplate(inner, namespace, keyMap);

    if (rewritten !== inner) {
      code = code.slice(0, innerStart) + rewritten + code.slice(innerEnd);
      changed = true;
    }
  }

  if (!changed) {
    return { changed: false };
  }

  await writeFile(filePath, code, 'utf8');
  return { changed: true };
}

// ============================================================================
// Main
// ============================================================================

(async () => {
  try {
    // Load translations
    let hadLocaleReadErrors = false;
    async function readJsonSafe(p) {
      try {
        const raw = await readFile(p, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        hadLocaleReadErrors = true;
        console.error(`[i18n-replace] Failed to read/parse JSON: ${p}`);
        console.error(err?.message || err);
        return null;
      }
    }

    function deepMerge(target, source) {
      if (!source || typeof source !== 'object') return target;
      for (const [k, v] of Object.entries(source)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (!target[k] || typeof target[k] !== 'object') target[k] = {};
          deepMerge(target[k], v);
        } else {
          target[k] = v;
        }
      }
      return target;
    }

    const groupedDir = path.resolve(outputDir, 'en');
    let translations = {};
    
    if (existsSync(groupedDir)) {
      const stack = [groupedDir];
      while (stack.length) {
        const dir = stack.pop();
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (entry.isFile() && entry.name.endsWith('.json')) {
            const obj = await readJsonSafe(full);
            if (obj && typeof obj === 'object') deepMerge(translations, obj);
          }
        }
      }
    } else {
      const translationsPath = path.resolve(outputDir, 'en.json');
      if (existsSync(translationsPath)) {
        const parsed = await readJsonSafe(translationsPath);
        if (parsed && typeof parsed === 'object') translations = parsed;
      } else {
        console.error(`[i18n-replace] No translations found at ${translationsPath} or ${groupedDir}`);
        process.exit(1);
      }
    }

    if (hadLocaleReadErrors) {
      console.error('[i18n-replace] Aborting: one or more locale JSON files could not be parsed. No source files were modified.');
      process.exit(1);
    }

    const keyMap = buildKeyMapFromTranslations(translations);

    if (!existsSync(srcRoot)) {
      console.error(`[i18n-replace] Source root not found: ${srcRoot}`);
      process.exit(1);
    }

    // Collect files
    const files = [];
    await collectSourceFiles(srcRoot, files);
    const vueFiles = [];
    await collectVueFiles(srcRoot, vueFiles);

    let changedCount = 0;
    let conflictCount = 0;

    // Process JS/TS files
    for (const file of files) {
      const rel = path.relative(projectRoot, file);
      const { changed, skippedDueToConflict } = await processFile(file, keyMap);
      if (changed) {
        changedCount += 1;
        console.log(`[i18n-replace] Updated ${rel}`);
      } else if (skippedDueToConflict) {
        conflictCount += 1;
        console.warn(`[i18n-replace] Skipped ${rel} due to existing 't' import conflict.`);
      }
    }

    // Process Vue files only when vue-i18n is present, since the rewrite uses $t(...) in templates.
    if (hasVueI18n) {
      for (const file of vueFiles) {
        const rel = path.relative(projectRoot, file);
        const { changed } = await processVueFile(file, keyMap);
        if (changed) {
          changedCount += 1;
          console.log(`[i18n-replace] Updated Vue template ${rel}`);
        }
      }
    } else if (vueFiles.length > 0) {
      console.log('[i18n-replace] vue-i18n not detected; skipping Vue template rewrite to avoid inserting $t(...) without a global helper.');
    }

    console.log(`[i18n-replace] Completed. Updated ${changedCount} files. Skipped ${conflictCount} files due to conflicts.`);
  } catch (error) {
    console.error('[i18n-replace] Failed to replace translations.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
