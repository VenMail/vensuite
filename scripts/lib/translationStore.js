/**
 * Shared translation store utilities for i18n scripts
 */

/**
 * Get namespace node from translation root
 */
function getNamespaceNode(root, namespace) {
  const segments = String(namespace).split('.').filter(Boolean);
  let node = root;
  for (const segment of segments) {
    if (!node || typeof node !== 'object') {
      return null;
    }
    node = node[segment];
    if (!node) {
      return null;
    }
  }
  return node;
}

/**
 * Ensure container exists in translation tree
 */
function ensureContainer(root, namespace, kind) {
  const segments = String(namespace).split('.').filter(Boolean);
  let node = root;
  for (const segment of segments) {
    if (!node[segment]) {
      node[segment] = Object.create(null);
    }
    node = node[segment];
  }
  if (!node[kind]) {
    node[kind] = Object.create(null);
  }
  return node[kind];
}

/**
 * Check if translation exists
 */
function hasTranslation(root, namespace, kind, slug) {
  const nsNode = getNamespaceNode(root, namespace);
  if (!nsNode || !nsNode[kind]) return false;
  return Object.prototype.hasOwnProperty.call(nsNode[kind], slug);
}

/**
 * Get translation value
 */
function getTranslation(root, namespace, kind, slug) {
  const nsNode = getNamespaceNode(root, namespace);
  if (!nsNode || !nsNode[kind]) return undefined;
  return nsNode[kind][slug];
}

/**
 * Set translation value
 */
function setTranslation(root, namespace, kind, slug, value) {
  const container = ensureContainer(root, namespace, kind);
  container[slug] = value;
}

/**
 * Prime text-to-key map from existing translations
 */
function primeTextKeyMap(node, textKeyMap, pathSegments = []) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return;
  }
  for (const key of Object.keys(node)) {
    const value = node[key];
    const nextPath = pathSegments.concat(key);
    if (typeof value === 'string') {
      if (nextPath.length >= 3) {
        const slug = nextPath[nextPath.length - 1];
        const kind = nextPath[nextPath.length - 2];
        const nsSegments = nextPath.slice(0, nextPath.length - 2);
        const namespace = nsSegments.join('.');
        const trimmed = String(value).trim();
        if (trimmed) {
          const keyId = `${namespace}|${kind}|${trimmed}`;
          const fullKey = nextPath.join('.');
          if (!textKeyMap.has(keyId)) {
            textKeyMap.set(keyId, fullKey);
          }
        }
      }
    } else if (value && typeof value === 'object') {
      primeTextKeyMap(value, textKeyMap, nextPath);
    }
  }
}

/**
 * Register a translation and return its key
 */
function registerTranslation(translations, textKeyMap, namespace, kind, text, slugifyFn) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const keyId = `${namespace}|${kind}|${trimmed}`;
  const existingKey = textKeyMap.get(keyId);
  if (existingKey) {
    return existingKey;
  }

  const baseSlug = slugifyFn(trimmed);
  let slug = baseSlug;
  let index = 2;
  
  while (
    hasTranslation(translations, namespace, kind, slug) &&
    getTranslation(translations, namespace, kind, slug) !== trimmed
  ) {
    slug = `${baseSlug}_${index}`;
    index += 1;
  }

  setTranslation(translations, namespace, kind, slug, trimmed);
  const fullKey = `${namespace}.${kind}.${slug}`;
  textKeyMap.set(keyId, fullKey);
  return fullKey;
}

/**
 * Ensure translation exists for a key (create fallback if missing)
 */
function ensureTranslationForKey(translations, fullKey) {
  if (!fullKey || typeof fullKey !== 'string') return;
  const segments = fullKey.split('.').filter(Boolean);
  if (segments.length < 3) return;
  
  const slug = segments[segments.length - 1];
  const kind = segments[segments.length - 2];
  const namespace = segments.slice(0, segments.length - 2).join('.');

  const existing = getTranslation(translations, namespace, kind, slug);
  if (typeof existing === 'string') {
    return;
  }

  // Create fallback from slug
  let fallback = slug.replace(/_/g, ' ');
  if (fallback) {
    fallback = fallback.charAt(0).toUpperCase() + fallback.slice(1);
  } else {
    fallback = fullKey;
  }

  setTranslation(translations, namespace, kind, slug, fallback);
}

module.exports = {
  getNamespaceNode,
  ensureContainer,
  hasTranslation,
  getTranslation,
  setTranslation,
  primeTextKeyMap,
  registerTranslation,
  ensureTranslationForKey,
  // Alias for compatibility with babel-extract-i18n.js
  ensureTranslation: ensureTranslationForKey,
};
