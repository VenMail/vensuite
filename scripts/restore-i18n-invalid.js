#!/usr/bin/env node
// Version: 0.1.15
const { readdir, readFile, writeFile } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');

const { detectSrcRoot } = require('./lib/projectConfig');
const { isCssUtilityString } = require('./lib/ignorePatterns');
const { listLocales, deleteKeyPathInObject } = require('./lib/localeUtils');
const { validateText } = require('./lib/validators');

const projectRoot = path.resolve(__dirname, '..');
const autoDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');
const baseLocale = 'en';
const srcRoot = detectSrcRoot(projectRoot);

let hadLocaleReadErrors = false;
const srcRoots = (() => {
  const roots = new Set();
  if (srcRoot && existsSync(srcRoot)) roots.add(srcRoot);
  const resourcesJs = path.resolve(projectRoot, 'resources', 'js');
  if (existsSync(resourcesJs)) roots.add(resourcesJs);
  const srcDir = path.resolve(projectRoot, 'src');
  if (existsSync(srcDir)) roots.add(srcDir);
  // Fallback: include project root so we don't miss unconventional layouts
  roots.add(projectRoot);
  return Array.from(roots);
})();

async function readJsonSafe(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[restore-i18n-invalid] Failed to read/parse JSON: ${filePath}`);
    console.error(err?.message || err);
    return null;
  }
}

async function collectJsonFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsonFiles(entryPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(entryPath);
    }
  }
}

function collectKeysFromObject(obj, prefix, localeFileRel, outMap) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const [key, value] of Object.entries(obj)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (!outMap.has(nextPath)) {
        outMap.set(nextPath, { value, localeFileRel });
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectKeysFromObject(value, nextPath, localeFileRel, outMap);
    }
  }
}

async function loadBaseLocaleKeys() {
  const keys = new Map();
  if (!existsSync(autoDir)) {
    return keys;
  }

  const groupedDir = path.resolve(autoDir, baseLocale);

  if (existsSync(groupedDir)) {
    const files = [];
    await collectJsonFiles(groupedDir, files);
    for (const file of files) {
      const json = await readJsonSafe(file);
      if (!json || typeof json !== 'object') {
        hadLocaleReadErrors = true;
        continue;
      }
      const rel = path.relative(autoDir, file).replace(/\\/g, '/');
      collectKeysFromObject(json, '', rel, keys);
    }
  } else {
    const singlePath = path.resolve(autoDir, `${baseLocale}.json`);
    if (!existsSync(singlePath)) {
      return keys;
    }
    const json = await readJsonSafe(singlePath);
    if (!json || typeof json !== 'object') {
      hadLocaleReadErrors = true;
      return keys;
    }
    const rel = path.relative(autoDir, singlePath).replace(/\\/g, '/');
    collectKeysFromObject(json, '', rel, keys);
  }

  return keys;
}

async function collectSourceFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([
        'node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public',
        'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.vite', '.turbo',
      ].includes(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      await collectSourceFiles(entryPath, out);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.d.ts')) continue;
      if (/\.(tsx|ts|jsx|js|mjs|mts|vue|svelte)$/i.test(entry.name)) {
        out.push(entryPath);
      }
    }
  }
}

let cachedUsageIndex = null;

async function buildUsageIndex() {
  const index = Object.create(null);
  if (!srcRoots.length) return index;

  const files = [];
  for (const root of srcRoots) {
    // eslint-disable-next-line no-await-in-loop
    await collectSourceFiles(root, files);
  }

  const uniqueFiles = Array.from(new Set(files));

  console.log(`[restore-i18n-invalid] Scanning ${uniqueFiles.length} source files for key usage...`);

  function getLineNumberFromIndex(text, idx) {
    let line = 1;
    for (let i = 0; i < idx && i < text.length; i += 1) {
      if (text.charCodeAt(i) === 10) line += 1;
    }
    return line;
  }

  for (const file of uniqueFiles) {
    const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
    const code = await readFile(file, 'utf8');

    const tCallRegex = /(?:^|[^a-zA-Z0-9_$])\$?t\s*\(\s*(['"`])([A-Za-z0-9_\.\-]+)\1\s*(?:,|\))/g;

    tCallRegex.lastIndex = 0;
    let match;
    while ((match = tCallRegex.exec(code)) !== null) {
      const key = match[2];
      if (!key || key.includes('${')) continue;

      if (!index[key]) {
        index[key] = [];
      }
      const line = getLineNumberFromIndex(code, match.index);
      index[key].push({ file: rel, line });
    }
  }

  console.log('[restore-i18n-invalid] Finished building source usage index.');
  return index;
}

async function indexKeyUsage(fullKey) {
  if (!fullKey) return [];
  if (!cachedUsageIndex) {
    cachedUsageIndex = await buildUsageIndex();
  }
  return cachedUsageIndex[fullKey] || [];
}

// Expose buildUsageIndex for use in collectInvalidBaseKeys
// (keeping the cached version for backward compatibility)

function classifyBaseValue(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    // Reuse shared non-translatable heuristics (CSS, code, placeholders, domains, etc.).
    return { invalid: false, reason: 'empty' };
  }

  if (isCssUtilityString(trimmed)) {
    return { invalid: true, reason: 'css_utility' };
  }

  let result;
  try {
    result = validateText(trimmed);
  } catch {
    return { invalid: false, reason: 'validator_error' };
  }

  if (!result) {
    return { invalid: false, reason: 'unknown' };
  }

  if (!result.valid) {
    return { invalid: true, reason: result.reason || 'non_translatable' };
  }

  return { invalid: false, reason: null };
}

function isInvalidBaseValue(text) {
  const result = classifyBaseValue(text);
  return result.invalid;
}

async function collectInvalidBaseKeys() {
  const baseKeys = await loadBaseLocaleKeys();
  const invalid = [];

  // Build usage index once for all keys (more efficient)
  const usageIndex = await buildUsageIndex();

  let skippedCount = 0;
  
  for (const [keyPath, info] of baseKeys.entries()) {
    const classification = classifyBaseValue(info.value);
    if (!classification.invalid) continue;
    
    // Check if key is actually used in code
    const usages = usageIndex[keyPath] || [];
    const isCssLike =
      classification.reason === 'css_utility' ||
      classification.reason === 'css_content';
    
    // Only mark as invalid if:
    // 1. The base value is non-translatable AND
    // 2. The key is NOT used in code (unused keys can be safely removed)
    // OR the key has very few usages that can be safely restored
    // 
    // CRITICAL: If a key is actively being used in code, we should NOT remove it
    // even if the base value looks non-translatable, because:
    // - The value might be valid in other locales
    // - The key might be used correctly in code
    // - Removing it would break the application
    if (usages.length === 0 || isCssLike) {
      // Unused key with invalid base value - safe to remove
      console.log(`[restore-i18n-invalid] Flagging unused invalid key: "${keyPath}" = "${info.value}"`);
      invalid.push({
        keyPath,
        baseValue: info.value,
        baseFileRel: info.localeFileRel,
        usages: [],
      });
    } else {
      // Key is used in code, skip it even though value looks non-translatable
      console.log(`[restore-i18n-invalid] Skipping used key: "${keyPath}" (${usages.length} usage(s)) = "${info.value}"`);
      skippedCount++;
    }
  }
  
  if (skippedCount > 0) {
    console.log(`[restore-i18n-invalid] Skipped ${skippedCount} key(s) that are still in use (even though values look non-translatable).`);
  }

  return invalid;
}

// === Code restore helpers using oxc-parser + magic-string ===
let parseSync;
let MagicString;

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

function walkAst(node, visitors, parent = null, parentKey = null) {
  if (!node || typeof node !== 'object') return;
  const visitor = visitors[node.type];
  if (visitor) {
    visitor(node, parent, parentKey);
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'range' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === 'object' && c.type) {
          walkAst(c, visitors, node, key);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      walkAst(child, visitors, node, key);
    }
  }
}

function buildInlineFromCall(node, code, invalidByKey) {
  const args = node.arguments || [];
  if (!args.length || !isStringLiteral(args[0])) return null;
  const keyPath = getStringValue(args[0]);
  if (!keyPath) return null;
  const meta = invalidByKey.get(keyPath);
  if (!meta) return null;

  const baseValue = String(meta.baseValue || '');
  const placeholderRegex = /\{([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?)\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Collect placeholder parts
  while ((match = placeholderRegex.exec(baseValue)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: baseValue.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'placeholder', name: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < baseValue.length) {
    parts.push({ type: 'text', value: baseValue.slice(lastIndex) });
  }

  // If no placeholders, just return a string literal
  if (!parts.some((p) => p.type === 'placeholder')) {
    const escaped = baseValue
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, '\\n');
    return `'${escaped}'`;
  }

  // Map placeholder -> expression from second arg object
  const placeholdersArg = args[1];
  if (!placeholdersArg || placeholdersArg.type !== 'ObjectExpression') {
    return null;
  }

  const exprByName = new Map();
  for (const prop of placeholdersArg.properties || []) {
    if (!prop || prop.type !== 'Property') continue;
    if (prop.computed) continue;
    const keyNode = prop.key;
    let name = null;
    if (keyNode.type === 'Identifier') name = keyNode.name;
    else if (isStringLiteral(keyNode)) name = getStringValue(keyNode);
    if (!name) continue;
    const valueNode = prop.value;
    if (!valueNode) continue;
    const exprCode = code.slice(valueNode.start, valueNode.end);
    exprByName.set(name, exprCode);
  }

  // Build template literal
  let out = '`';
  for (const part of parts) {
    if (part.type === 'text') {
      const safe = part.value
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
      out += safe;
    } else {
      const expr = exprByName.get(part.name);
      if (!expr) {
        return null; // missing expression mapping; safer to skip
      }
      out += '${' + expr + '}';
    }
  }
  out += '`';
  return out;
}

async function applyCodeRestores(invalid) {
  if (!invalid.length) return { filesChanged: 0 };
  if (!srcRoot || !existsSync(srcRoot)) return { filesChanged: 0 };

  // Lazy-load parser dependencies so that report generation and locale cleanup
  // can still run even when oxc-parser or magic-string are unavailable.
  if (!parseSync || !MagicString) {
    try {
      // eslint-disable-next-line global-require
      parseSync = require('oxc-parser').parseSync;
    } catch (err) {
      console.error('[restore-i18n-invalid] Warning: oxc-parser is not installed or is incompatible with this Node version.');
      console.error('[restore-i18n-invalid] Skipping code restores. Invalid report and locale JSON cleanup can still be applied.');
      console.error('[restore-i18n-invalid] To enable code-side restores, install a compatible oxc-parser (e.g. npm install -D oxc-parser).');
      return { filesChanged: 0 };
    }

    try {
      // eslint-disable-next-line global-require
      MagicString = require('magic-string');
    } catch (err) {
      console.error('[restore-i18n-invalid] Warning: magic-string is not installed.');
      console.error('[restore-i18n-invalid] Skipping code restores. Invalid report and locale JSON cleanup can still be applied.');
      console.error('[restore-i18n-invalid] To enable code-side restores, install magic-string (e.g. npm install -D magic-string).');
      return { filesChanged: 0 };
    }
  }

  // Group invalid keys by file based on usage info
  const byFile = new Map(); // absPath -> Set<keyPath>
  const invalidByKey = new Map();

  for (const item of invalid) {
    invalidByKey.set(item.keyPath, { baseValue: item.baseValue });
    for (const u of item.usages || []) {
      const abs = path.resolve(projectRoot, u.file);
      let set = byFile.get(abs);
      if (!set) {
        set = new Set();
        byFile.set(abs, set);
      }
      set.add(item.keyPath);
    }
  }

  let filesChanged = 0;

  for (const [filePath, keySet] of byFile.entries()) {
    if (!existsSync(filePath)) continue;
    const code = await readFile(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    const sourceFilename = path.basename(filePath);

    let parsed;
    try {
      parsed = parseSync(sourceFilename, code, {
        sourceType: 'module',
        lang:
          ext === '.tsx' ? 'tsx' :
          ext === '.ts' ? 'ts' :
          ext === '.jsx' ? 'jsx' :
          'js',
      });
    } catch (err) {
      console.error('[restore-i18n-invalid] Parse error in', filePath, '-', err && err.message ? err.message : err);
      continue;
    }

    if (!parsed || !parsed.program) continue;

    const ast = parsed.program;
    const s = new MagicString(code);
    const replacements = [];

    const addReplacement = (start, end, newCode) => {
      for (const r of replacements) {
        if ((start >= r.start && start < r.end) || (end > r.start && end <= r.end)) {
          return;
        }
      }
      replacements.push({ start, end, newCode });
    };

    const visitors = {
      CallExpression(node) {
        const callee = node.callee;
        const args = node.arguments || [];
        if (!callee || callee.type !== 'Identifier' || callee.name !== 't') return;
        if (!args.length || !isStringLiteral(args[0])) return;
        const keyPath = getStringValue(args[0]);
        if (!keyPath || !keySet.has(keyPath)) return;

        const inline = buildInlineFromCall(node, code, invalidByKey);
        if (!inline) return;
        addReplacement(node.start, node.end, inline);
      },
    };

    walkAst(ast, visitors);

    if (!replacements.length) continue;

    replacements.sort((a, b) => b.start - a.start);
    for (const r of replacements) {
      s.overwrite(r.start, r.end, r.newCode);
    }

    await writeFile(filePath, s.toString(), 'utf8');
    filesChanged += 1;
    console.log('[restore-i18n-invalid] Restored original strings in', path.relative(projectRoot, filePath));
  }

  return { filesChanged };
}

async function applyKeyDeletions(invalid) {
  const locales = await listLocales(autoDir);
  if (!locales.length) return { filesChanged: 0 };

  const fileCache = new Map(); // absPath -> { json, changed }

  for (const entry of invalid) {
    const { keyPath, baseFileRel } = entry;
    for (const locale of locales) {
      const rel = baseFileRel.startsWith(baseLocale)
        ? path.join(locale, path.relative(baseLocale, baseFileRel))
        : baseFileRel;
      const abs = path.resolve(autoDir, rel);
      if (!existsSync(abs)) continue;

      let cached = fileCache.get(abs);
      if (!cached) {
        const json = await readJsonSafe(abs);
        if (!json || typeof json !== 'object') continue;
        cached = { json, changed: false };
        fileCache.set(abs, cached);
      }

      if (deleteKeyPathInObject(cached.json, keyPath)) {
        cached.changed = true;
      }
    }
  }

  let filesChanged = 0;
  for (const [filePath, { json, changed }] of fileCache.entries()) {
    if (!changed) continue;
    await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    filesChanged += 1;
    console.log('[restore-i18n-invalid] Removed invalid keys from', path.relative(projectRoot, filePath));
  }

  return { filesChanged };
}

async function main() {
  if (!existsSync(autoDir)) {
    console.error('[restore-i18n-invalid] i18n auto directory not found:', autoDir);
    process.exit(1);
  }

  hadLocaleReadErrors = false;

  const apply = process.argv.includes('--apply');

  const invalid = await collectInvalidBaseKeys();
  if (hadLocaleReadErrors) {
    console.error('[restore-i18n-invalid] Aborting: one or more locale JSON files could not be parsed. No locale files were modified.');
    process.exit(1);
  }
  if (!invalid.length) {
    console.log('[restore-i18n-invalid] No invalid/non-translatable base keys detected.');
    return;
  }

  // Enrich usages if not already present
  for (const item of invalid) {
    if (!item.usages || !item.usages.length) {
      // eslint-disable-next-line no-await-in-loop
      item.usages = await indexKeyUsage(item.keyPath);
    }
  }

  const reportPath = path.resolve(projectRoot, 'scripts', '.i18n-invalid-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    baseLocale,
    autoDir: path.relative(projectRoot, autoDir).replace(/\\/g, '/'),
    invalid,
  };
  await writeFile(reportPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[restore-i18n-invalid] Found ${invalid.length} invalid/non-translatable base key(s). Report written to`, path.relative(projectRoot, reportPath));

  if (!apply) {
    console.log('[restore-i18n-invalid] Dry run only. Re-run with --apply to restore code and delete keys from locale files.');
    return;
  }

  const { filesChanged: codeFilesChanged } = await applyCodeRestores(invalid);
  const { filesChanged: localeFilesChanged } = await applyKeyDeletions(invalid);

  console.log(`[restore-i18n-invalid] Restored code in ${codeFilesChanged} source file(s) and cleaned up ${localeFilesChanged} locale file(s).`);
}

main().catch((err) => {
  console.error('[restore-i18n-invalid] Failed:', err && err.message ? err.message : err);
  process.exit(1);
});
