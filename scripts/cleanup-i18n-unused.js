#!/usr/bin/env node
const { readdir, readFile, writeFile } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');

const { detectSrcRoot } = require('./lib/projectConfig');
const { listLocales, deleteKeyPathInObject } = require('./lib/localeUtils');

const projectRoot = path.resolve(__dirname, '..');
const autoDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');
const baseLocale = 'en';
const srcRoot = detectSrcRoot(projectRoot);

async function readJsonSafe(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
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
      if (!json || typeof json !== 'object') continue;
      const rel = path.relative(autoDir, file).replace(/\\/g, '/');
      collectKeysFromObject(json, '', rel, keys);
    }
  } else {
    const singlePath = path.resolve(autoDir, `${baseLocale}.json`);
    if (!existsSync(singlePath)) {
      return keys;
    }
    const json = await readJsonSafe(singlePath);
    if (!json || typeof json !== 'object') return keys;
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

let cachedUsageIndex = null;

async function buildUsageIndex() {
  const index = Object.create(null);
  if (!srcRoot || !existsSync(srcRoot)) return index;

  const files = [];
  await collectSourceFiles(srcRoot, files);

  console.log(`[cleanup-i18n-unused] Scanning ${files.length} source files for key usage...`);

  for (const file of files) {
    const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
    const code = await readFile(file, 'utf8');
    const lines = code.split(/\r?\n/);
    const regex = /t\(\s*['"]([^'\"]+)['"]\s*\)/g;

    for (let i = 0; i < lines.length; i += 1) {
      const lineText = lines[i];
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const key = match[1];
        if (!index[key]) {
          index[key] = [];
        }
        index[key].push({ file: rel, line: i + 1 });
      }
    }
  }

  console.log('[cleanup-i18n-unused] Finished building source usage index.');
  return index;
}

async function indexKeyUsage(fullKey) {
  if (!fullKey) return [];
  if (!cachedUsageIndex) {
    cachedUsageIndex = await buildUsageIndex();
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
    console.log(`[cleanup-i18n-unused] Removed unused keys from ${path.relative(projectRoot, filePath)}`);
  }

  return { filesChanged };
}

async function main() {
  if (!existsSync(autoDir)) {
    console.error('[cleanup-i18n-unused] i18n auto directory not found:', autoDir);
    process.exit(1);
  }

  const apply = process.argv.includes('--apply');

  const baseKeys = await loadBaseLocaleKeys();
  if (baseKeys.size === 0) {
    console.log('[cleanup-i18n-unused] No base locale keys found. Nothing to do.');
    return;
  }

  const unused = [];

  for (const [keyPath, info] of baseKeys.entries()) {
    const usage = await indexKeyUsage(keyPath);
    if (!usage || usage.length === 0) {
      unused.push({ keyPath, baseFileRel: info.localeFileRel });
    }
  }

  if (unused.length === 0) {
    console.log('[cleanup-i18n-unused] No unused keys detected.');
    return;
  }

  const reportPath = path.resolve(projectRoot, 'scripts', '.i18n-unused-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    baseLocale,
    autoDir: path.relative(projectRoot, autoDir).replace(/\\/g, '/'),
    unused,
  };
  await writeFile(reportPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[cleanup-i18n-unused] Found ${unused.length} unused key(s). Report written to`, path.relative(projectRoot, reportPath));

  if (!apply) {
    console.log('[cleanup-i18n-unused] Dry run only. Re-run with --apply to delete unused keys from locale files.');
    return;
  }

  const { filesChanged } = await applyDeletions(unused);
  console.log(`[cleanup-i18n-unused] Deleted unused keys from ${filesChanged} locale file(s).`);
}

main().catch((err) => {
  console.error('[cleanup-i18n-unused] Failed:', err && err.message ? err.message : err);
  process.exit(1);
});
