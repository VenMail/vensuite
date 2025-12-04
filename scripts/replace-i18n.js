#!/usr/bin/env node
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

function inferPlaceholderNameFromExpression(expr, index) {
  if (!expr) return `value${index + 1}`;
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression' && !expr.computed) {
    const prop = expr.property;
    if (prop && prop.type === 'Identifier') return prop.name;
  }
  return `value${index + 1}`;
}

/**
 * Build pattern and placeholder info from template literal
 */
function buildPatternAndPlaceholders(tpl, code) {
  if (!tpl || !tpl.quasis) return { pattern: '', placeholders: [] };
  const parts = [];
  const placeholders = [];
  
  for (let i = 0; i < tpl.quasis.length; i++) {
    const quasi = tpl.quasis[i];
    const cooked = quasi.value?.cooked ?? quasi.cooked ?? '';
    parts.push(cooked);
    
    if (tpl.expressions && i < tpl.expressions.length) {
      const expr = tpl.expressions[i];
      const name = inferPlaceholderNameFromExpression(expr, i);
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
 */
function analyzeImports(ast, code) {
  let hasI18nImport = false;
  let hasTConflict = false;
  let lastImportEnd = 0;
  let firstImportStart = -1;

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

  return { hasI18nImport, hasTConflict, lastImportEnd, firstImportStart };
}

/**
 * Generate import statement string
 */
function generateImportStatement() {
  return "import { t } from '@/i18n';\n";
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
  const { hasI18nImport, hasTConflict, lastImportEnd, firstImportStart } = analyzeImports(ast, code);
  
  if (hasTConflict) {
    return { changed: false, skippedDueToConflict: true };
  }

  // Track replacements to avoid overlapping edits
  const replacements = [];
  let needsImport = false;

  // Helper to add a replacement
  const addReplacement = (start, end, newCode) => {
    // Check for overlaps
    for (const r of replacements) {
      if ((start >= r.start && start < r.end) || (end > r.start && end <= r.end)) {
        return false; // Overlapping, skip
      }
    }
    replacements.push({ start, end, newCode });
    needsImport = true;
    return true;
  };

  // Helper to build replacement for string/template
  const tryReplace = (node, kind) => {
    if (isStringLiteral(node)) {
      const text = normalizeText(getStringValue(node));
      if (!shouldTranslateText(text, ignorePatterns)) return false;
      
      const keyId = `${namespace}|${kind}|${text}`;
      const fullKey = keyMap.get(keyId);
      if (!fullKey) return false;
      
      return addReplacement(node.start, node.end, generateTCall(fullKey));
    }
    
    if (isTemplateLiteral(node)) {
      const { pattern, placeholders } = buildPatternAndPlaceholders(node, code);
      const text = normalizeText(pattern);
      if (!shouldTranslateText(text, ignorePatterns)) return false;
      
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

async function processVueFile(filePath, keyMap) {
  let code = await readFile(filePath, 'utf8');
  const namespace = getNamespaceFromFile(filePath, srcRoot);
  
  const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  if (!templateMatch) {
    return { changed: false };
  }
  
  const fullTemplate = templateMatch[0];
  let inner = templateMatch[1] || '';
  
  // Strip HTML comments
  inner = inner.replace(/<!--([\s\S]*?)-->/g, ' ');
  
  const tagRegex = /<([A-Za-z][A-Za-z0-9-_]*)\b([^>]*)>([^<]+)<\/\1>/g;
  let changed = false;
  
  inner = inner.replace(tagRegex, (whole, tagName, attrs, rawText) => {
    if (!rawText || typeof rawText !== 'string') return whole;
    // Skip if already has translation
    if (rawText.includes('$t(') || rawText.includes('{{$t')) return whole;
    
    const cleaned = normalizeText(rawText);
    if (!shouldTranslateText(cleaned, ignorePatterns)) return whole;
    
    const kind = inferKindFromJsxElementName(tagName);
    const keyId = `${namespace}|${kind}|${cleaned}`;
    const fullKey = keyMap.get(keyId);
    if (!fullKey) return whole;
    
    changed = true;
    
    const leadingSpaceMatch = rawText.match(/^\s*/);
    const trailingSpaceMatch = rawText.match(/\s*$/);
    const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
    const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';
    
    const escapedKey = String(fullKey).replace(/'/g, "\\'");
    const wrapped = `${leadingSpace}{{$t('${escapedKey}')}}${trailingSpace}`;
    return `<${tagName}${attrs}>${wrapped}</${tagName}>`;
  });
  
  if (!changed) {
    return { changed: false };
  }
  
  const newTemplate = fullTemplate.replace(templateMatch[1], inner);
  code = code.replace(fullTemplate, newTemplate);
  await writeFile(filePath, code, 'utf8');
  return { changed: true };
}

// ============================================================================
// Main
// ============================================================================

(async () => {
  try {
    // Load translations
    async function readJsonSafe(p) {
      try {
        const raw = await readFile(p, 'utf8');
        return JSON.parse(raw);
      } catch {
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
