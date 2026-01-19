#!/usr/bin/env node
// Version: 0.1.15
const { readdir, readFile, writeFile } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');

const { detectSrcRoot } = require('./lib/projectConfig');
const { listLocales, deleteKeyPathInObject } = require('./lib/localeUtils');

const projectRoot = path.resolve(__dirname, '..');
const autoDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');
const baseLocale = 'en';
const srcRoot = detectSrcRoot(projectRoot);

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

let hadLocaleReadErrors = false;

async function readJsonSafe(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[cleanup-i18n-unused] Failed to read/parse JSON: ${filePath}`);
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

async function loadLocaleKeys(locale) {
  const keys = new Map();
  if (!existsSync(autoDir)) {
    return keys;
  }

  const groupedDir = path.resolve(autoDir, locale);

  if (existsSync(groupedDir)) {
    const files = [];
    await collectJsonFiles(groupedDir, files);
    for (const file of files) {
      const json = await readJsonSafe(file);
      if (!json || typeof json !== 'object') {
        continue;
      }
      const rel = path.relative(autoDir, file).replace(/\\/g, '/');
      collectKeysFromObject(json, '', rel, keys);
    }
  } else {
    const singlePath = path.resolve(autoDir, `${locale}.json`);
    if (!existsSync(singlePath)) {
      return keys;
    }
    const json = await readJsonSafe(singlePath);
    if (!json || typeof json !== 'object') {
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
      if (/\.(tsx|ts|jsx|js|vue|svelte|mjs|cjs|mts|cts)$/i.test(entry.name)) {
        out.push(entryPath);
      }
    }
  }
}

let cachedUsageIndex = null;
let cachedUsageKeySet = null;

async function buildUsageIndex(candidateKeys) {
  const index = Object.create(null);
  if (!srcRoots.length) return index;

  const keySet = candidateKeys instanceof Set ? candidateKeys : null;

  const files = [];
  for (const root of srcRoots) {
    // eslint-disable-next-line no-await-in-loop
    await collectSourceFiles(root, files);
  }

  const uniqueFiles = Array.from(new Set(files));

  console.log(`[cleanup-i18n-unused] Scanning ${uniqueFiles.length} source files for key usage...`);

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
    const tCallRegex = /(?:^|[^a-zA-Z0-9_$])\$?t\s*(?:<[^>]+>\s*)?\(\s*(['"`])([A-Za-z0-9_.\-:]+)\1\s*(?:,|\))/g;
    let match;
    while ((match = tCallRegex.exec(code)) !== null) {
      const key = match[2];
      if (keySet && !keySet.has(key)) {
        continue;
      }
      if (!index[key]) {
        index[key] = [];
      }
      const line = getLineNumberFromIndex(code, match.index);
      index[key].push({ file: rel, line });
    }
    if (keySet) {
      const keyLiteralRegex = /(['"`])([A-Za-z0-9_.\-:]+)\1/g;
      while ((match = keyLiteralRegex.exec(code)) !== null) {
        const key = match[2];
        if (!keySet.has(key)) {
          continue;
        }
        if (!index[key]) {
          index[key] = [];
        }
        const line = getLineNumberFromIndex(code, match.index);
        index[key].push({ file: rel, line });
      }
    }
  }

  console.log('[cleanup-i18n-unused] Finished building source usage index.');
  return index;
}

async function indexKeyUsage(fullKey) {
  if (!fullKey) return [];
  if (!cachedUsageIndex) {
    cachedUsageIndex = await buildUsageIndex(cachedUsageKeySet);
  }
  return cachedUsageIndex[fullKey] || [];
}
async function applyDeletions(unusedKeys) {
  const locales = await listLocales(autoDir);
  if (!locales.length) return { filesChanged: 0 };

  // Map of absolute file path -> { json, changed }
  const fileCache = new Map();

  for (const entry of unusedKeys) {
    const { keyPath, baseFileRel } = entry;
    // Safety guard: skip deletion if key is still referenced in source
    const usage = await indexKeyUsage(keyPath);
    if (usage && usage.length > 0) {
      console.log(`[cleanup-i18n-unused] Skipping "${keyPath}" because it is still referenced in source (${usage.length} usage(s)).`);
      continue;
    }
    for (const locale of locales) {
      // Map base file path to target locale file
      // If baseFileRel is "en/common.json", map to "fr/common.json"
      // If baseFileRel is already locale-specific, use as-is
      let rel;
      if (baseFileRel.startsWith(`${baseLocale}/`) || baseFileRel.startsWith(`${baseLocale}\\`)) {
        // Replace base locale with target locale
        rel = baseFileRel.replace(new RegExp(`^${baseLocale}[\\\\/]`), `${locale}/`);
      } else {
        // File is not locale-specific, use as-is
        rel = baseFileRel;
      }
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
    console.log(`[cleanup-i18n-unused] Removed unused keys from ${path.relative(projectRoot, filePath)}`);
  }

  return { filesChanged };
}

async function applyOrphanedDeletions(orphanedKeys) {
  // Map of absolute file path -> { json, changed }
  const fileCache = new Map();

  for (const entry of orphanedKeys) {
    const { keyPath, baseFileRel, locale } = entry;
    
    // Only delete from the specific locale where the orphaned key exists
    // baseFileRel is already the correct path for this locale
    const abs = path.resolve(autoDir, baseFileRel);
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
      console.log(`[cleanup-i18n-unused] Removing orphaned key "${keyPath}" from ${locale} locale`);
    }
  }

  let filesChanged = 0;
  for (const [filePath, { json, changed }] of fileCache.entries()) {
    if (!changed) continue;
    await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    filesChanged += 1;
    console.log(`[cleanup-i18n-unused] Removed orphaned keys from ${path.relative(projectRoot, filePath)}`);
  }

  return filesChanged;
}

async function main() {
  if (!existsSync(autoDir)) {
    console.error('[cleanup-i18n-unused] i18n auto directory not found:', autoDir);
    process.exit(1);
  }

  hadLocaleReadErrors = false;

  const apply = process.argv.includes('--apply');
  const cleanOrphaned = process.argv.includes('--clean-orphaned');

  const baseKeys = await loadBaseLocaleKeys();
  if (hadLocaleReadErrors) {
    console.error('[cleanup-i18n-unused] Aborting: one or more locale JSON files could not be parsed. No locale files were modified.');
    process.exit(1);
  }
  if (baseKeys.size === 0) {
    console.log('[cleanup-i18n-unused] No base locale keys found. Nothing to do.');
    return;
  }
  cachedUsageKeySet = new Set(baseKeys.keys());
  cachedUsageIndex = await buildUsageIndex(cachedUsageKeySet);

  const unused = [];

  for (const [keyPath, info] of baseKeys.entries()) {
    const usage = await indexKeyUsage(keyPath);
    if (!usage || usage.length === 0) {
      unused.push({ keyPath, baseFileRel: info.localeFileRel });
    }
  }

  // Find orphaned keys (keys in non-default locales but missing from default locale)
  let orphaned = [];
  if (cleanOrphaned) {
    const locales = await listLocales(autoDir);
    for (const locale of locales) {
      if (locale === baseLocale) continue; // Skip default locale
      
      const localeKeys = await loadLocaleKeys(locale);
      for (const keyPath of localeKeys.keys()) {
        // Check if key exists in default locale
        if (!baseKeys.has(keyPath)) {
          // Key exists in this locale but not in default locale - it's orphaned
          const info = localeKeys.get(keyPath);
          orphaned.push({ keyPath, baseFileRel: info.localeFileRel, locale });
        }
      }
    }
  }

  if (unused.length === 0 && orphaned.length === 0) {
    console.log('[cleanup-i18n-unused] No unused or orphaned keys detected.');
    return;
  }

  const reportPath = path.resolve(projectRoot, 'scripts', '.i18n-unused-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    baseLocale,
    autoDir: path.relative(projectRoot, autoDir).replace(/\\/g, '/'),
    unused,
    orphaned: cleanOrphaned ? orphaned : undefined,
  };
  await writeFile(reportPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  
  console.log(`[cleanup-i18n-unused] Found ${unused.length} unused key(s).`);
  if (cleanOrphaned) {
    console.log(`[cleanup-i18n-unused] Found ${orphaned.length} orphaned key(s) (missing from default locale).`);
  }
  console.log(`[cleanup-i18n-unused] Report written to`, path.relative(projectRoot, reportPath));

  if (!apply) {
    console.log('[cleanup-i18n-unused] Dry run only. Re-run with --apply to delete unused/orphaned keys from locale files.');
    if (cleanOrphaned) {
      console.log('[cleanup-i18n-unused] Use --clean-orphaned to also remove keys that exist in non-default locales but are missing from the default locale.');
    }
    return;
  }

  const { filesChanged } = await applyDeletions(unused);
  let orphanedFilesChanged = 0;
  if (cleanOrphaned && orphaned.length > 0) {
    orphanedFilesChanged = await applyOrphanedDeletions(orphaned);
  }
  
  console.log(`[cleanup-i18n-unused] Deleted unused keys from ${filesChanged} locale file(s).`);
  if (cleanOrphaned) {
    console.log(`[cleanup-i18n-unused] Deleted orphaned keys from ${orphanedFilesChanged} locale file(s).`);
  }
}

main().catch((err) => {
  console.error('[cleanup-i18n-unused] Failed:', err && err.message ? err.message : err);
  process.exit(1);
});
