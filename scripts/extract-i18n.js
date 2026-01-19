#!/usr/bin/env node
// Version: 0.1.15
/**
 * i18n Extract Script - Unified Extraction Engine
 * 
 * This is the main extraction script.
 * It uses a modular parser system supporting multiple frameworks:
 * 
 * - React, Next.js, Gatsby, Remix (JSX/TSX)
 * - Vue 2/3, Nuxt 2/3, Quasar (Vue SFC)
 * - Laravel, Inertia, Livewire (Blade)
 * - Svelte, SvelteKit (Svelte)
 * - Python, Go, C#, Java, Ruby, PHP, Rust, Swift, Kotlin (Generic)
 * 
 * Key features:
 * - Modular parser architecture for easy framework additions
 * - Comprehensive validation to prevent false positives
 * - Proper template parsing (state-machine)
 * - CSS, code expression, and technical content detection
 */

const { readdir, readFile, writeFile, mkdir, stat, rm } = require('node:fs/promises');
const { existsSync, readdirSync } = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// Import shared utilities
const { detectSrcRoot } = require('./lib/projectConfig');
const { slugifyForKey, getNamespaceFromFile, getNamespaceFromBladeFile } = require('./lib/stringUtils');
const { loadIgnorePatterns } = require('./lib/ignorePatterns');
const { primeTextKeyMap, getTranslation, setTranslation, getNamespaceNode } = require('./lib/translationStore');

// Import parser system
const { parseFile, isSupported, getFrameworkInfo } = require('./lib/parsers');

// Import validators
const { validateText } = require('./lib/validators');

const projectRoot = path.resolve(__dirname, '..');
const MAX_FILE_SIZE_BYTES = Number(process.env.AI_I18N_MAX_FILE_SIZE || 2 * 1024 * 1024);
const CONCURRENCY = Number(process.env.AI_I18N_CONCURRENCY || 8);

const srcRoot = detectSrcRoot(projectRoot);
const outputDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');

// Parse command-line arguments for specific files
const args = process.argv.slice(2);
const specificFiles = args.filter(arg => !arg.startsWith('--')).map(f => path.resolve(projectRoot, f));

// Load ignore patterns
const ignorePatterns = loadIgnorePatterns(projectRoot);

// Translation store
const translations = Object.create(null);
const textKeyMap = new Map();
const namespaceRoots = new Map();
const lockedNamespaceRoots = new Set();
const groupRootLeafCounts = new Map();
const groupRootsSeen = new Map();

// Simple mutex for thread-safe registration
// JavaScript is single-threaded but async operations can interleave
// let registrationLock = Promise.resolve();

// Statistics
const stats = {
  filesProcessed: 0,
  filesSkipped: 0,
  textsExtracted: 0,
  textsRejected: 0,
  rejectionReasons: {},
  byFramework: {},
};

function isCommonShortText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  const cleaned = trimmed.replace(/\s+/g, ' ').trim();

  if (/[.!?]/.test(cleaned)) return false;

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 2) return false;

  if (cleaned.length > 24) return false;

  if (/[/]/.test(cleaned)) return false;

  return true;
}

const cleanupExistingTranslations = (existing, silent = false) => {
  const cleanMode = String(process.env.AI_I18N_CLEAN_EXISTING || 'css').trim().toLowerCase();
  if (!cleanMode || cleanMode === '0' || cleanMode === 'false' || cleanMode === 'off' || cleanMode === 'none') {
    return;
  }

  let allowedReasons = null;
  if (cleanMode === 'css') {
    allowedReasons = new Set(['css_content']);
  } else if (cleanMode === 'safe') {
    allowedReasons = new Set([
      'css_content',
      'spreadsheet_reference',
      'code_content',
      'event_handler',
      'html_content',
      'vue_binding',
    ]);
  } else if (cleanMode === 'all') {
    allowedReasons = null;
  }

  let removed = 0;
  const root = existing && typeof existing === 'object' ? existing : {};
  for (const [namespace, kinds] of Object.entries(root)) {
    if (!kinds || typeof kinds !== 'object') continue;
    for (const [kind, entries] of Object.entries(kinds)) {
      if (!entries || typeof entries !== 'object') continue;
      for (const [slug, value] of Object.entries(entries)) {
        const text = typeof value === 'string' ? value : null;
        if (!text) continue;
        const validation = validateText(String(text).trim(), { ignorePatterns });
        if (!validation.valid && (!allowedReasons || allowedReasons.has(validation.reason))) {
          delete entries[slug];
          removed += 1;
        }
      }
      if (Object.keys(entries).length === 0) {
        delete kinds[kind];
      }
    }
    if (Object.keys(kinds).length === 0) {
      delete root[namespace];
    }
  }
  if (removed > 0 && !silent) {
    console.log(`[i18n-extract] Cleaned ${removed} invalid existing translations with updated validators.`);
  }
}

function getRootFromFilePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/resources/views/')) {
    return 'views';
  }
  const relFromSrc = path.relative(srcRoot, filePath).replace(/\\/g, '/');
  const parts = relFromSrc.split('/').filter(Boolean);
  if (parts.length && parts[0] !== '..') {
    return parts[0].toLowerCase();
  }
  const relFromProject = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  const projectParts = relFromProject.split('/').filter(Boolean);
  if (projectParts.length) {
    return projectParts[0].toLowerCase();
  }
  return 'common';
}

function pickPreferredRoot(a, b) {
  const rank = (name) => {
    const n = String(name || '').toLowerCase();
    if (n === 'pages') return 0;
    if (n === 'views') return 1;
    if (n === 'components') return 2;
    if (n === 'src') return 3;
    if (n === 'resources') return 4;
    if (n === 'common') return 99;
    if (!n) return 100;
    return 10;
  };
  return rank(a) <= rank(b) ? a : b;
}

function primeNamespaceRootsFromGroupedFile(obj, rootName) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  const rn = String(rootName || '').toLowerCase();
  if (!rn) return;
  for (const group of Object.keys(obj)) {
    if (!group || group === 'Commons') continue;
    const seen = groupRootsSeen.get(group) || new Set();
    seen.add(rn);
    groupRootsSeen.set(group, seen);
    const subtree = obj[group];
    const leafCount = countStringLeaves(subtree);
    const prev = groupRootLeafCounts.get(group);
    if (!prev || leafCount > prev.leafCount) {
      groupRootLeafCounts.set(group, { rootName: rn, leafCount });
      namespaceRoots.set(group, rn);
      lockedNamespaceRoots.add(group);
    } else if (!namespaceRoots.get(group)) {
      namespaceRoots.set(group, prev.rootName);
      lockedNamespaceRoots.add(group);
    }
  }
}

// ============================================================================
// Translation Registration
// ============================================================================

function registerTranslation(namespace, kind, text) {
  const trimmed = String(text || '').trim();
  
  // Validate using validators
  const validation = validateText(trimmed, { ignorePatterns });
  if (!validation.valid) {
    stats.textsRejected++;
    stats.rejectionReasons[validation.reason] = (stats.rejectionReasons[validation.reason] || 0) + 1;
    return null;
  }

  let effectiveNamespace = namespace;
  if (isCommonShortText(trimmed)) {
    effectiveNamespace = 'Commons';
  }

  const keyId = `${effectiveNamespace}|${kind}|${trimmed}`;
  const existingKey = textKeyMap.get(keyId);
  if (existingKey) {
    return existingKey;
  }

  const baseSlug = slugifyForKey(trimmed);
  let slug = baseSlug;
  let index = 2;

  const hasTranslation = (root, ns, k, s) => {
    const nsNode = getNamespaceNode(root, ns);
    if (!nsNode || !nsNode[k]) return false;
    return Object.prototype.hasOwnProperty.call(nsNode[k], s);
  };

  while (hasTranslation(translations, effectiveNamespace, kind, slug) && 
         getTranslation(translations, effectiveNamespace, kind, slug) !== trimmed) {
    slug = `${baseSlug}_${index}`;
    index += 1;
  }

  setTranslation(translations, effectiveNamespace, kind, slug, trimmed);
  const fullKey = `${effectiveNamespace}.${kind}.${slug}`;
  textKeyMap.set(keyId, fullKey);
  stats.textsExtracted++;
  return fullKey;
}

// ============================================================================
// File Collection
// ============================================================================

const IGNORE_DIRS = new Set([
  'node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public',
  'dist', 'build', '.nuxt', '.next', '.svelte-kit', '__pycache__',
  'bin', 'obj', 'target', '.idea', '.vscode',
]);

async function collectFiles(dir, out, extensions) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        await collectFiles(entryPath, out, extensions);
      } else if (entry.isFile()) {
        // Check if file is supported
        if (isSupported(entryPath)) {
          out.push(entryPath);
        }
      }
    }
  } catch (err) {
    console.error(`[i18n-extract] Error reading directory ${dir}:`, err.message);
  }
}

// ============================================================================
// File Processing
// ============================================================================

async function processFile(filePath) {
  try {
    const s = await stat(filePath);
    if (s && s.size > MAX_FILE_SIZE_BYTES) {
      stats.filesSkipped++;
      return;
    }
  } catch {
    return;
  }

  const content = await readFile(filePath, 'utf8');
  
  // Determine namespace
  let namespace;
  if (filePath.endsWith('.blade.php')) {
    namespace = getNamespaceFromBladeFile(filePath, projectRoot);
  } else {
    namespace = getNamespaceFromFile(filePath, srcRoot);
  }

  const rootSegment = getRootFromFilePath(filePath);
  const topNamespace = String(namespace || '').split('.')[0] || 'Common';
  if (topNamespace !== 'Commons' && !lockedNamespaceRoots.has(topNamespace)) {
    const existingRoot = namespaceRoots.get(topNamespace);
    if (!existingRoot) {
      namespaceRoots.set(topNamespace, rootSegment);
    } else if (existingRoot !== rootSegment) {
      namespaceRoots.set(topNamespace, pickPreferredRoot(existingRoot, rootSegment));
    }
  }

  // Parse the file
  const result = parseFile(content, filePath, { ignorePatterns });

  // Track framework stats
  const ext = filePath.split('.').pop().toLowerCase();
  stats.byFramework[ext] = (stats.byFramework[ext] || 0) + 1;

  // Register extracted items
  for (const item of result.items) {
    registerTranslation(namespace, item.kind, item.text);
  }

  stats.filesProcessed++;

  // Log errors if any
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`[i18n-extract] ${filePath}: ${err}`);
    }
  }
}

// ============================================================================
// Utilities
// ============================================================================

function sortObjectDeep(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const sortedKeys = Object.keys(input).sort();
  const result = {};
  for (const key of sortedKeys) {
    result[key] = sortObjectDeep(input[key]);
  }
  return result;
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
        console.error('[i18n-extract] Worker failed for', item, '-', err?.message || err);
      }
    }
  })());
  await Promise.all(runners);
}

function countStringLeaves(node) {
  if (typeof node === 'string') return 1;
  if (!node || typeof node !== 'object' || Array.isArray(node)) return 0;
  let sum = 0;
  for (const v of Object.values(node)) sum += countStringLeaves(v);
  return sum;
}

function countLeavesByTopKey(obj) {
  const out = Object.create(null);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const k of Object.keys(obj)) {
    out[k] = countStringLeaves(obj[k]);
  }
  return out;
}

// ============================================================================
// Main
// ============================================================================

(async () => {
  try {
    console.log('[i18n-extract] Starting extraction...');
    console.log(`[i18n-extract] Source root: ${srcRoot}`);
    
    // Show supported frameworks
    console.log('[i18n-extract] Supported frameworks:');
    for (const info of getFrameworkInfo()) {
      console.log(`  - ${info.name}: .${info.extensions.join(', .')}`);
    }
    
    if (!existsSync(srcRoot)) {
      console.error(`[i18n-extract] Source root not found: ${srcRoot}`);
      process.exit(1);
    }

    // Load existing translations
    let existingTranslations = null;
    const groupedDir = path.resolve(outputDir, 'en');

    let hadExistingLocaleReadErrors = false;

    const readJsonSafe = async (p) => {
      try {
        const raw = await readFile(p, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        hadExistingLocaleReadErrors = true;
        console.error(`[i18n-extract] Failed to read/parse JSON: ${p}`);
        console.error(err?.message || err);
        return null;
      }
    };

    const deepMerge = (target, source) => {
      if (!source || typeof source !== 'object') return target;
      for (const [k, v] of Object.entries(source)) {
        if (typeof v === 'object' && v && !Array.isArray(v)) {
          if (!target[k] || typeof target[k] !== 'object') target[k] = {};
          deepMerge(target[k], v);
        } else {
          target[k] = v;
        }
      }
      return target;
    };

    if (existsSync(groupedDir)) {
      existingTranslations = {};
      const stack = [groupedDir];
      while (stack.length) {
        const dir = stack.pop();
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (entry.isFile() && entry.name.endsWith('.json')) {
            const obj = await readJsonSafe(full);
            if (obj && typeof obj === 'object') {
              const inferredRoot = path.basename(entry.name, '.json');
              primeNamespaceRootsFromGroupedFile(obj, inferredRoot);
              deepMerge(existingTranslations, obj);
            }
          }
        }
      }
    } else {
      // Legacy auto single-file layout: resources/js/i18n/auto/en.json
      const autoSingleFile = path.resolve(outputDir, 'en.json');
      if (existsSync(autoSingleFile)) {
        const parsed = await readJsonSafe(autoSingleFile);
        if (parsed && typeof parsed === 'object') {
          existingTranslations = parsed;
        }
      } else {
        // Older projects may only have a runtime base file at resources/js/i18n/en.json
        const legacyRuntimeFile = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'en.json');
        if (existsSync(legacyRuntimeFile)) {
          const parsed = await readJsonSafe(legacyRuntimeFile);
          if (parsed && typeof parsed === 'object') {
            existingTranslations = parsed;
          }
        }
      }
    }

    if (existingTranslations) {
      cleanupExistingTranslations(existingTranslations);
      Object.assign(translations, existingTranslations);
      primeTextKeyMap(existingTranslations, textKeyMap);
    }

    if (hadExistingLocaleReadErrors) {
      console.error('[i18n-extract] Aborting: one or more existing locale JSON files could not be parsed. No files were modified.');
      process.exit(1);
    }

    // Collect files to process
    let files = [];
    
    if (specificFiles.length > 0) {
      // Process only specified files
      console.log(`[i18n-extract] Processing ${specificFiles.length} specific file(s)`);
      for (const filePath of specificFiles) {
        if (existsSync(filePath) && isSupported(filePath)) {
          files.push(filePath);
        } else if (existsSync(filePath)) {
          console.warn(`[i18n-extract] Skipping unsupported file: ${filePath}`);
        } else {
          console.warn(`[i18n-extract] File not found: ${filePath}`);
        }
      }
    } else {
      // Process all supported files (full project scan)
      console.log('[i18n-extract] Processing entire project (no specific files provided)');
      await collectFiles(srcRoot, files);
      
      // Also check Laravel views directory
      const viewsRoot = path.resolve(projectRoot, 'resources', 'views');
      if (existsSync(viewsRoot)) {
        await collectFiles(viewsRoot, files);
      }
    }

    console.log(`[i18n-extract] Found ${files.length} files to process`);

    // Process files
    await runConcurrent(files, processFile, CONCURRENCY);

    // Write output
    const sorted = sortObjectDeep(translations);
    const localeDir = path.resolve(outputDir, 'en');
    await mkdir(localeDir, { recursive: true });

    const existingTotal = existingTranslations ? countStringLeaves(existingTranslations) : 0;
    const nextTotal = countStringLeaves(sorted);
    const minKeepRatio = Number(process.env.AI_I18N_MIN_KEEP_RATIO || 0.9);
    const allowDestructive = String(process.env.AI_I18N_ALLOW_DESTRUCTIVE || '').trim() === '1';

    if (!allowDestructive && existingTotal > 0 && nextTotal < Math.floor(existingTotal * minKeepRatio)) {
      console.error(
        `[i18n-extract] Aborting: extraction would reduce stored strings from ${existingTotal} to ${nextTotal} (< ${(minKeepRatio * 100).toFixed(0)}% of previous). ` +
        'Set AI_I18N_ALLOW_DESTRUCTIVE=1 to override if you really intend this.'
      );
      process.exit(1);
    }
    let existingPerRootCounts = null;
    let existingPerRootObjects = null;
    if (existsSync(localeDir)) {
      try {
        existingPerRootCounts = {};
        existingPerRootObjects = {};
        const entries = readdirSync(localeDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
          const p = path.resolve(localeDir, entry.name);
          const obj = await readJsonSafe(p);
          if (!obj || typeof obj !== 'object') continue;
          const rootName = path.basename(entry.name, '.json').toLowerCase();
          let cleaned = null;
          try {
            cleaned = JSON.parse(JSON.stringify(obj));
          } catch {
            cleaned = obj;
          }
          if (cleaned && typeof cleaned === 'object') {
            cleanupExistingTranslations(cleaned, true);
          }
          existingPerRootCounts[rootName] = countStringLeaves(cleaned);
          existingPerRootObjects[rootName] = cleaned;
        }
      } catch (err) {
        console.error('[i18n-extract] Failed to read existing grouped files for shrink guard.');
        console.error(err?.message || err);
      }
    }

    const groups = Object.keys(sorted).sort();
    const perRoot = {};
    for (const group of groups) {
      const subtree = sorted[group];
      if (!subtree || typeof subtree !== 'object') continue;
      let rootName;
      if (group === 'Commons') {
        rootName = 'commons';
      } else {
        rootName = namespaceRoots.get(group) || 'common';
      }
      
      // FIX: Only write to the preferred root, not all seen roots
      // This prevents duplicate keys appearing in multiple files
      const rootTree = perRoot[rootName] || (perRoot[rootName] = {});
      rootTree[group] = subtree;
    }

    if (!allowDestructive && existingPerRootCounts) {
      const shrinkViolations = [];
      const minRatioCount = Number(process.env.AI_I18N_MIN_PER_FILE_RATIO_COUNT || 120);
      const maxSmallFileDrop = Number(process.env.AI_I18N_MAX_SMALL_FILE_DROP || 10);
      for (const [rootName, prevCount] of Object.entries(existingPerRootCounts)) {
        const nextTree = perRoot[rootName];
        const nextCount = nextTree ? countStringLeaves(nextTree) : 0;
        if (prevCount <= 0) continue;
        if (nextCount >= prevCount) continue;
        const delta = prevCount - nextCount;
        if (prevCount >= minRatioCount) {
          if (nextCount < Math.floor(prevCount * minKeepRatio)) {
            shrinkViolations.push({ rootName, prevCount, nextCount });
          }
        } else {
          if (delta > maxSmallFileDrop) {
            shrinkViolations.push({ rootName, prevCount, nextCount });
          }
        }
      }

      if (shrinkViolations.length > 0) {
        for (const v of shrinkViolations) {
          const prevObj = existingPerRootObjects ? existingPerRootObjects[v.rootName] : null;
          const nextObj = perRoot[v.rootName] || null;
          if (!prevObj || !nextObj) continue;

          const prevByGroup = countLeavesByTopKey(prevObj);
          const nextByGroup = countLeavesByTopKey(nextObj);

          const deltas = [];
          for (const k of Object.keys(prevByGroup)) {
            const prevCount = prevByGroup[k] || 0;
            const nextCount = nextByGroup[k] || 0;
            const delta = nextCount - prevCount;
            if (delta < 0) deltas.push({ k, prevCount, nextCount, delta });
          }

          deltas.sort((a, b) => a.delta - b.delta);
          const top = deltas.slice(0, 12).map(d => `${d.k} ${d.prevCount} -> ${d.nextCount}`).join(', ');
          if (top) {
            console.error(`[i18n-extract] Largest decreases in ${v.rootName}.json: ${top}`);
          }
        }
        const detail = shrinkViolations
          .sort((a, b) => b.prevCount - a.prevCount)
          .slice(0, 8)
          .map(v => `${v.rootName}.json ${v.prevCount} -> ${v.nextCount}`)
          .join(', ');
        console.error(
          `[i18n-extract] Aborting: extraction would shrink one or more grouped locale files below ${(minKeepRatio * 100).toFixed(0)}% of previous. ` +
          `Examples: ${detail}. ` +
          'Set AI_I18N_ALLOW_DESTRUCTIVE=1 to override if you really intend this.'
        );
        process.exit(1);
      }
    }

    try {
      const existingEntries = await readdir(localeDir, { withFileTypes: true });
      for (const entry of existingEntries) {
        const full = path.join(localeDir, entry.name);
        await rm(full, { recursive: true, force: true });
      }
    } catch {}

    let fileCount = 0;
    for (const [rootName, tree] of Object.entries(perRoot)) {
      const outPath = path.resolve(localeDir, `${String(rootName).toLowerCase()}.json`);
      await writeFile(outPath, JSON.stringify(tree, null, 2) + '\n', 'utf8');
      fileCount += 1;
    }

    // Print statistics
    console.log('\n[i18n-extract] Extraction complete!');
    console.log(`  Files processed: ${stats.filesProcessed}`);
    console.log(`  Files skipped: ${stats.filesSkipped}`);
    console.log(`  Texts extracted: ${stats.textsExtracted}`);
    console.log(`  Texts rejected: ${stats.textsRejected}`);
    
    if (Object.keys(stats.byFramework).length > 0) {
      console.log('  By file type:');
      for (const [ext, count] of Object.entries(stats.byFramework).sort((a, b) => b[1] - a[1])) {
        console.log(`    - .${ext}: ${count} files`);
      }
    }
    
    if (Object.keys(stats.rejectionReasons).length > 0) {
      console.log('  Rejection reasons:');
      for (const [reason, count] of Object.entries(stats.rejectionReasons).sort((a, b) => b[1] - a[1])) {
        console.log(`    - ${reason}: ${count}`);
      }
    }
    
    console.log(`\n[i18n-extract] Wrote ${fileCount} grouped files under ${path.relative(projectRoot, localeDir)}`);
  } catch (error) {
    console.error('[i18n-extract] Failed to extract translations.');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
})();
