/**
 * Shared project configuration utilities for i18n scripts
 */
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

/**
 * Get configured source root from package.json
 */
function getConfiguredSrcRoot(projectRoot) {
  try {
    const pkgPath = path.resolve(projectRoot, 'package.json');
    if (!existsSync(pkgPath)) return null;
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    if (!pkg || typeof pkg !== 'object') return null;
    const cfg = pkg.aiI18n;
    if (!cfg || typeof cfg !== 'object') return null;
    const rel = cfg.srcRoot;
    if (!rel || typeof rel !== 'string') return null;
    const full = path.resolve(projectRoot, rel);
    if (!existsSync(full)) return null;
    return full;
  } catch {
    return null;
  }
}

/**
 * Detect source root directory
 */
function detectSrcRoot(projectRoot) {
  const configured = getConfiguredSrcRoot(projectRoot);
  if (configured) return configured;
  
  // Prefer Laravel/Inertia-style resources/js when present, otherwise fall
  // back to src for React/Next/Vue/Nuxt-style projects
  const candidates = ['resources/js', 'src'];

  const existing = candidates
    .map((rel) => ({ rel, full: path.resolve(projectRoot, rel) }))
    .filter((c) => existsSync(c.full));

  if (existing.length === 1) {
    return existing[0].full;
  }

  if (existing.length > 1) {
    const IGNORE_DIRS = new Set([
      'node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public',
      'dist', 'build', '.nuxt', '.next', '.svelte-kit', '__pycache__',
      'bin', 'obj', 'target', '.idea', '.vscode',
    ]);

    const isSourceFile = (name) => {
      if (!name) return false;
      if (name.endsWith('.d.ts')) return false;
      return /\.(tsx|ts|jsx|js|vue|svelte|mjs|mts)$/i.test(name);
    };

    const countSourceFiles = (root, maxCount = 400) => {
      let count = 0;
      const stack = [root];
      while (stack.length && count < maxCount) {
        const dir = stack.pop();
        let entries;
        try {
          entries = readdirSync(dir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const entry of entries) {
          if (count >= maxCount) break;
          const name = entry.name;
          if (entry.isDirectory()) {
            if (name.startsWith('.') || IGNORE_DIRS.has(name)) continue;
            stack.push(path.join(dir, name));
          } else if (entry.isFile()) {
            if (isSourceFile(name)) count += 1;
          }
        }
      }
      return count;
    };

    const ranked = existing
      .map((c) => ({ ...c, count: countSourceFiles(c.full) }))
      .sort((a, b) => b.count - a.count);

    if (ranked[0].count !== ranked[1].count) {
      return ranked[0].full;
    }

    // Stable fallback for backwards compatibility
    const resources = ranked.find((c) => c.rel === 'resources/js');
    if (resources) return resources.full;
    return ranked[0].full;
  }
  
  return path.resolve(projectRoot, 'resources', 'js');
}

/**
 * Get project locales from package.json
 */
function getProjectLocales(projectRoot) {
  try {
    const pkgPath = path.resolve(projectRoot, 'package.json');
    if (!existsSync(pkgPath)) return ['en'];
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    if (pkg?.aiI18n?.locales && Array.isArray(pkg.aiI18n.locales)) {
      return pkg.aiI18n.locales.filter(l => typeof l === 'string' && l.length > 0);
    }
    return ['en'];
  } catch {
    return ['en'];
  }
}

module.exports = {
  getConfiguredSrcRoot,
  detectSrcRoot,
  getProjectLocales,
};
