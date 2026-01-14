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
 * Handles Unicode characters, emojis, and various scripts
 */
function slugifyForKey(text, maxWords = 4, maxLength = 48) {
  let normalized = String(text || '')
    // Normalize Unicode to decomposed form
    .normalize('NFKD')
    // Remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    // Remove emojis and other symbols (Unicode blocks)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    // Remove other non-ASCII characters that aren't letters
    .replace(/[^\x00-\x7F]/g, '');
  
  const words = normalized.toLowerCase().match(/[a-z0-9]+/g) || [];
  const sliced = words.slice(0, maxWords);
  let slug = sliced.join('_');
  
  if (!slug) {
    // Fallback: generate a hash-based slug for pure emoji/unicode strings
    const hash = simpleHash(text);
    slug = `text_${hash}`;
  }
  
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    // Ensure we don't cut in the middle of an underscore sequence
    slug = slug.replace(/_+$/, '');
  }
  
  return slug;
}

/**
 * Simple hash function for generating unique slugs
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Get namespace from file path
 * Preserves full folder hierarchy for fidelity:
 * components/Auth/xxx/yyy -> components.Auth.xxx.yyy
 * 
 * IMPORTANT: Excludes component file names from namespace to prevent duplication
 * when component names appear in both file path and component structure
 */
function getNamespaceFromFile(filePath, srcRoot) {
  const path = require('node:path');
  const rel = path.relative(srcRoot, filePath);
  const withoutExt = rel.replace(path.extname(rel), '');
  const rawSegments = withoutExt.split(path.sep).filter(Boolean);

  // CRITICAL FIX: Filter out component file names to prevent duplication
  // Component files (PascalCase) should not be part of the namespace
  // since they already appear in the component structure
  const filteredSegments = rawSegments.filter((segment, index) => {
    // Keep the segment if it's not a component file name (not PascalCase at the end)
    // or if it's not the last segment (which would be the component file)
    const isLastSegment = index === rawSegments.length - 1;
    const isComponentFile = isLastSegment && /^[A-Z][a-zA-Z0-9]*$/.test(segment);
    return !isComponentFile;
  });

  // Preserve all path segments to maintain folder hierarchy fidelity
  // Convert each segment to PascalCase while keeping the structure
  const segments = filteredSegments
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
