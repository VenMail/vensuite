/**
 * Shared project configuration utilities for i18n scripts
 */
const { existsSync, readFileSync } = require('node:fs');
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
  for (const rel of candidates) {
    const full = path.resolve(projectRoot, rel);
    if (existsSync(full)) return full;
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
