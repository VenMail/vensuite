const { readdir } = require('node:fs/promises');
const { existsSync } = require('node:fs');

async function listLocales(autoDir, options = {}) {
  const { includeJsonFiles = true } = options;
  const locales = [];
  if (!autoDir || !existsSync(autoDir)) return locales;

  const entries = await readdir(autoDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      locales.push(entry.name);
    } else if (
      includeJsonFiles &&
      entry.isFile() &&
      entry.name.endsWith('.json')
    ) {
      const name = entry.name.replace(/\.json$/i, '');
      if (!locales.includes(name)) {
        locales.push(name);
      }
    }
  }

  return locales;
}

function deleteKeyPathInObject(obj, keyPath) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const segments = String(keyPath).split('.');
  if (!segments.length) return false;

  let deleted = false;

  function helper(target, index) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      return false;
    }
    const key = segments[index];
    if (index === segments.length - 1) {
      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        return false;
      }
      delete target[key];
      deleted = true;
      return Object.keys(target).length === 0;
    }
    if (!Object.prototype.hasOwnProperty.call(target, key)) {
      return false;
    }
    const child = target[key];
    const shouldDeleteChild = helper(child, index + 1);
    if (shouldDeleteChild) {
      delete target[key];
    }
    return Object.keys(target).length === 0;
  }

  helper(obj, 0);
  return deleted;
}

module.exports = {
  listLocales,
  deleteKeyPathInObject,
};
