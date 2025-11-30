/**
 * Shared string utility functions for i18n scripts
 */

/**
 * Convert string to PascalCase
 */
function toPascalCase(input) {
  const words = String(input || '')
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Slugify text for use as translation key
 */
function slugifyForKey(text, maxWords = 4, maxLength = 48) {
  const normalized = String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  const words = normalized.toLowerCase().match(/[a-z0-9]+/g) || [];
  const sliced = words.slice(0, maxWords);
  let slug = sliced.join('_');
  if (!slug) {
    slug = 'text';
  }
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
  }
  return slug;
}

/**
 * Get namespace from file path
 */
function getNamespaceFromFile(filePath, srcRoot) {
  const path = require('node:path');
  const rel = path.relative(srcRoot, filePath);
  const withoutExt = rel.replace(path.extname(rel), '');
  const rawSegments = withoutExt.split(path.sep).filter(Boolean);

  // Filter out generic top-level buckets like "Pages" or "Components"
  const filteredSegments = rawSegments.filter((segment, index) => {
    const lower = segment.toLowerCase();
    if (index === 0 && (lower === 'pages' || lower === 'components')) {
      return false;
    }
    return true;
  });

  const segments = (filteredSegments.length ? filteredSegments : rawSegments)
    .map((segment) => toPascalCase(segment))
    .filter(Boolean);

  if (segments.length === 0) return 'Common';
  return segments.join('.');
}

/**
 * Get namespace from Blade file path
 */
function getNamespaceFromBladeFile(filePath, projectRoot) {
  const path = require('node:path');
  const viewsRoot = path.resolve(projectRoot, 'resources', 'views');
  let rel = path.relative(viewsRoot, filePath);
  rel = rel.replace(/\.blade\.php$/i, '').replace(/\.php$/i, '');
  const rawSegments = rel.split(path.sep).filter(Boolean);

  const segments = rawSegments
    .map((segment) => toPascalCase(segment))
    .filter(Boolean);

  if (segments.length === 0) return 'Views';
  return segments.join('.');
}

module.exports = {
  toPascalCase,
  slugifyForKey,
  getNamespaceFromFile,
  getNamespaceFromBladeFile,
};
