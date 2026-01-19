#!/usr/bin/env node
// Version: 0.1.15
const { readdir, readFile, writeFile, stat } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// Import shared utilities
const { getIgnorePatterns, shouldIgnoreText } = require('./lib/ignorePatterns');

const projectRoot = path.resolve(__dirname, '..');
const autoDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');
const baseLocale = 'en';
const MAX_FILE_SIZE_BYTES = Number(process.env.AI_I18N_MAX_FILE_SIZE || 2 * 1024 * 1024);
const CONCURRENCY = Number(process.env.AI_I18N_CONCURRENCY || 8);

// Initialize ignore patterns from shared utility
getIgnorePatterns(projectRoot);

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function shouldTranslateText(text) {
  const trimmed = normalizeText(text);
  return trimmed && !shouldIgnoreText(trimmed);
}

function buildKeyMapFromTranslations(translations) {
  const map = new Map();

  function walk(node, pathSegments) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const nextPath = [...pathSegments, key];
      if (typeof value === 'string') {
        if (nextPath.length < 3) continue;
        const normalized = normalizeText(value);
        if (!shouldTranslateText(normalized)) continue;
        const slug = nextPath[nextPath.length - 1];
        const kind = nextPath[nextPath.length - 2];
        const nsSegments = nextPath.slice(0, -2);
        const namespace = nsSegments.join('.');
        const keyId = `${namespace}|${kind}|${normalized}`;
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

async function listBladeFiles(root) {
  const out = [];
  async function walkDir(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public'].includes(entry.name)) {
          continue;
        }
        await walkDir(entryPath);
      } else if (entry.isFile()) {
        if (/\.(blade\.php|php)$/i.test(entry.name)) {
          out.push(entryPath);
        }
      }
    }
  }
  if (existsSync(root)) {
    await walkDir(root);
  }
  return out;
}

async function runConcurrent(items, worker, limit = CONCURRENCY) {
  const total = Array.isArray(items) ? items.length : 0;
  if (total === 0) return;
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, total) }, () => (async () => {
    while (true) {
      const i = index;
      index += 1;
      if (i >= total) break;
      const item = items[i];
      try {
        await worker(item);
      } catch (err) {
        console.error('[i18n-rewrite-blade] Worker failed for', item, '-', err && err.message ? err.message : err);
      }
    }
  })());
  await Promise.all(runners);
}

function getNamespaceFromBladeFile(filePath) {
  const viewsRoot = path.resolve(projectRoot, 'resources', 'views');
  let rel = path.relative(viewsRoot, filePath);
  rel = rel.replace(/\.blade\.php$/i, '').replace(/\.php$/i, '');
  const rawSegments = rel.split(path.sep).filter(Boolean);
  const segments = rawSegments
    .map((segment) => segment.replace(/[_\-]+/g, ' '))
    .map((segment) =>
      segment
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(''),
    )
    .filter(Boolean);
  if (segments.length === 0) return 'Views';
  return segments.join('.');
}

function inferKindFromTagName(name) {
  if (!name) return 'text';
  const lower = name.toLowerCase();
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(lower)) return 'heading';
  if (lower === 'label') return 'label';
  if (lower === 'button') return 'button';
  if (lower === 'a' || lower === 'link') return 'link';
  if (lower === 'input' || lower === 'textarea' || lower === 'select') return 'placeholder';
  return 'text';
}

async function processBladeFile(filePath, keyMap) {
  try {
    const s = await stat(filePath);
    if (s && s.size > MAX_FILE_SIZE_BYTES) {
      return false;
    }
  } catch {}
  let code = await readFile(filePath, 'utf8');
  const namespace = getNamespaceFromBladeFile(filePath);

  let template = code.replace(/{{--[\s\S]*?--}}/g, ' ');

  const tagRegex = /<([A-Za-z][A-Za-z0-9-_]*)\b([^>]*)>([^<]+)<\/\1>/g;
  let changed = false;

  template = template.replace(tagRegex, (whole, tagName, attrs, rawText) => {
    if (!rawText || typeof rawText !== 'string') return whole;
    if (rawText.includes("__('") || rawText.includes('__("') || rawText.includes('@lang') || rawText.includes('trans(')) {
      return whole;
    }
    if (rawText.includes('{{')) {
      return whole;
    }
    const normalized = normalizeText(rawText);
    if (!shouldTranslateText(normalized)) return whole;

    const kind = inferKindFromTagName(tagName);
    const keyId = `${namespace}|${kind}|${normalized}`;
    const fullKey = keyMap.get(keyId);
    if (!fullKey) return whole;

    changed = true;

    const leadingSpaceMatch = rawText.match(/^\s*/);
    const trailingSpaceMatch = rawText.match(/\s*$/);
    const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
    const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';

    const escapedKey = String(fullKey).replace(/"/g, '\\"');
    const wrapped = `${leadingSpace}{{ __("${escapedKey}") }}${trailingSpace}`;
    return `<${tagName}${attrs}>${wrapped}</${tagName}>`;
  });

  if (!changed) {
    return false;
  }

  const viewsRoot = path.resolve(projectRoot, 'resources', 'views');
  const rel = path.relative(viewsRoot, filePath);
  // We operate on the full file content (with Blade comments stripped), so
  // simply write the transformed template back.
  code = template;
  await writeFile(filePath, code, 'utf8');
  console.log(`[i18n-rewrite-blade] Updated ${rel}`);
  return true;
}

async function loadTranslations() {
  const groupedDir = path.resolve(autoDir, baseLocale);
  let hadLocaleReadErrors = false;
  async function readJsonSafe(p) {
    try {
      const raw = await readFile(p, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      hadLocaleReadErrors = true;
      console.error(`[i18n-rewrite-blade] Failed to read/parse JSON: ${p}`);
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

  let translations = {};
  if (existsSync(groupedDir)) {
    const fsSync = await import('node:fs');
    const stack = [groupedDir];
    while (stack.length) {
      const dir = stack.pop();
      const entries = fsSync.readdirSync(dir, { withFileTypes: true });
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
    const basePath = path.resolve(autoDir, `${baseLocale}.json`);
    if (!existsSync(basePath)) {
      return null;
    }
    const obj = await readJsonSafe(basePath);
    if (obj && typeof obj === 'object') translations = obj;
  }

  if (hadLocaleReadErrors) {
    console.error('[i18n-rewrite-blade] Aborting: one or more locale JSON files could not be parsed. No source files were modified.');
    return null;
  }

  return translations;
}

async function main() {
  if (!existsSync(autoDir)) {
    console.error('[i18n-rewrite-blade] Auto locale directory not found:', autoDir);
    process.exit(1);
  }

  const translations = await loadTranslations();
  if (!translations || typeof translations !== 'object') {
    console.error('[i18n-rewrite-blade] No translations available for base locale. Run extract first.');
    process.exit(1);
  }

  const keyMap = buildKeyMapFromTranslations(translations);
  if (keyMap.size === 0) {
    console.log('[i18n-rewrite-blade] No candidate translations found. Nothing to rewrite.');
    process.exit(0);
  }

  const viewsRoot = path.resolve(projectRoot, 'resources', 'views');
  if (!existsSync(viewsRoot)) {
    console.log('[i18n-rewrite-blade] resources/views not found. Nothing to rewrite.');
    process.exit(0);
  }

  const files = await listBladeFiles(viewsRoot);
  if (!files.length) {
    console.log('[i18n-rewrite-blade] No Blade/PHP view files found to rewrite.');
    process.exit(0);
  }

  let changedCount = 0;
  await runConcurrent(files, async (file) => {
    const changed = await processBladeFile(file, keyMap);
    if (changed) changedCount += 1;
  }, CONCURRENCY);

  console.log(`[i18n-rewrite-blade] Completed. Updated ${changedCount} file(s).`);
}

main().catch((err) => {
  const msg = err && err.message ? err.message : err;
  console.error('[i18n-rewrite-blade] Failed:', msg);
  process.exit(1);
});
