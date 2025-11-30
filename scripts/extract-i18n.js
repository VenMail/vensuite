#!/usr/bin/env node
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

const { readdir, readFile, writeFile, mkdir, stat } = require('node:fs/promises');
const { existsSync, readdirSync } = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// Import shared utilities
const { detectSrcRoot, getProjectLocales } = require('./lib/projectConfig');
const { slugifyForKey, getNamespaceFromFile, getNamespaceFromBladeFile } = require('./lib/stringUtils');
const { loadIgnorePatterns } = require('./lib/ignorePatterns');
const { primeTextKeyMap, getTranslation, setTranslation, ensureTranslationForKey, getNamespaceNode } = require('./lib/translationStore');

// Import parser system
const { parseFile, isSupported, getFrameworkInfo } = require('./lib/parsers');

// Import validators
const { validateText } = require('./lib/validators');

const projectRoot = path.resolve(__dirname, '..');
const MAX_FILE_SIZE_BYTES = Number(process.env.AI_I18N_MAX_FILE_SIZE || 2 * 1024 * 1024);
const CONCURRENCY = Number(process.env.AI_I18N_CONCURRENCY || 8);

const srcRoot = detectSrcRoot(projectRoot);
const outputDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');

// Load ignore patterns
const ignorePatterns = loadIgnorePatterns(projectRoot);

// Translation store
const translations = Object.create(null);
const textKeyMap = new Map();

// Statistics
const stats = {
  filesProcessed: 0,
  filesSkipped: 0,
  textsExtracted: 0,
  textsRejected: 0,
  rejectionReasons: {},
  byFramework: {},
};

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

  const keyId = `${namespace}|${kind}|${trimmed}`;
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

  while (hasTranslation(translations, namespace, kind, slug) && 
         getTranslation(translations, namespace, kind, slug) !== trimmed) {
    slug = `${baseSlug}_${index}`;
    index += 1;
  }

  setTranslation(translations, namespace, kind, slug, trimmed);
  const fullKey = `${namespace}.${kind}.${slug}`;
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
        if (typeof v === 'object' && v && !Array.isArray(v)) {
          if (!target[k] || typeof target[k] !== 'object') target[k] = {};
          deepMerge(target[k], v);
        } else {
          target[k] = v;
        }
      }
      return target;
    }

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
            if (obj && typeof obj === 'object') deepMerge(existingTranslations, obj);
          }
        }
      }
    } else {
      const outputFile = path.resolve(outputDir, 'en.json');
      if (existsSync(outputFile)) {
        const parsed = await readJsonSafe(outputFile);
        if (parsed && typeof parsed === 'object') existingTranslations = parsed;
      }
    }

    if (existingTranslations) {
      Object.assign(translations, existingTranslations);
      primeTextKeyMap(existingTranslations, textKeyMap);
    }

    // Collect all supported files
    const files = [];
    await collectFiles(srcRoot, files);
    
    // Also check Laravel views directory
    const viewsRoot = path.resolve(projectRoot, 'resources', 'views');
    if (existsSync(viewsRoot)) {
      await collectFiles(viewsRoot, files);
    }

    console.log(`[i18n-extract] Found ${files.length} files to process`);

    // Process files
    await runConcurrent(files, processFile, CONCURRENCY);

    // Write output
    const sorted = sortObjectDeep(translations);
    const localeDir = path.resolve(outputDir, 'en');
    await mkdir(localeDir, { recursive: true });

    function countLeafStrings(node) {
      let count = 0;
      function walkCount(n) {
        if (!n || typeof n !== 'object') return;
        for (const [, v] of Object.entries(n)) {
          if (typeof v === 'string') count += 1;
          else if (v && typeof v === 'object') walkCount(v);
        }
      }
      walkCount(node);
      return count;
    }

    const groups = Object.keys(sorted).sort();
    let fileCount = 0;
    for (const group of groups) {
      const subtree = sorted[group];
      if (!subtree || typeof subtree !== 'object') continue;
      const leafCount = countLeafStrings(subtree);
      if (leafCount <= 400) {
        const outPath = path.resolve(localeDir, `${group.toLowerCase()}.json`);
        const content = { [group]: subtree };
        await writeFile(outPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
        fileCount += 1;
      } else {
        const groupDir = path.resolve(localeDir, group.toLowerCase());
        await mkdir(groupDir, { recursive: true });
        const secondKeys = Object.keys(subtree).sort();
        for (const second of secondKeys) {
          const secondSub = subtree[second];
          if (!secondSub || typeof secondSub !== 'object') continue;
          const outPath = path.resolve(groupDir, `${String(second).toLowerCase()}.json`);
          const content = { [group]: { [second]: secondSub } };
          await writeFile(outPath, JSON.stringify(content, null, 2) + '\n', 'utf8');
          fileCount += 1;
        }
      }
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
