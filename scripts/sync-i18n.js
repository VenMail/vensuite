#!/usr/bin/env node
const { readdir, readFile, writeFile, mkdir, rm } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const { getProjectLocales } = require('./lib/projectConfig');

const projectRoot = path.resolve(__dirname, '..');
const autoDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');
const baseLocale = 'en';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepFillFromBase(base, target) {
  const result = isPlainObject(target) ? { ...target } : {};
  if (!isPlainObject(base)) {
    return result;
  }
  for (const key of Object.keys(base)) {
    const baseVal = base[key];
    const hasKey = Object.prototype.hasOwnProperty.call(result, key);
    if (isPlainObject(baseVal)) {
      const targetVal = hasKey && isPlainObject(result[key]) ? result[key] : {};
      result[key] = deepFillFromBase(baseVal, targetVal);
    } else if (!hasKey) {
      result[key] = baseVal;
    }
  }
  return result;
}

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

async function readJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[i18n-sync] Failed to parse JSON for ${filePath}`);
    throw error;
  }
}

async function writeJson(filePath, data) {
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(filePath, payload, 'utf8');
}

(async () => {
  try {
    const baseGroupedDir = path.resolve(autoDir, baseLocale);

    function isJsonFile(name) {
      return /\.json$/i.test(name);
    }

    async function listJsonFiles(dir) {
      const out = [];
      const stack = [dir];
      while (stack.length) {
        const cur = stack.pop();
        const entries = await readdir(cur, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(cur, e.name);
          if (e.isDirectory()) stack.push(full);
          else if (e.isFile() && isJsonFile(e.name)) out.push(full);
        }
      }
      return out;
    }

    function maskPick(source, mask) {
      if (!isPlainObject(mask)) return {};
      const out = {};
      for (const key of Object.keys(mask)) {
        const mVal = mask[key];
        const sVal = isPlainObject(source) ? source[key] : undefined;
        if (isPlainObject(mVal)) {
          out[key] = maskPick(sVal, mVal);
        } else {
          out[key] = sVal !== undefined ? sVal : mVal;
        }
      }
      return out;
    }

    let updatedCount = 0;

    if (existsSync(baseGroupedDir)) {
      // Grouped base: mirror file structure into each locale without
      // overwriting existing translations.
      const baseFiles = await listJsonFiles(baseGroupedDir);

      // Determine locales primarily from configured project locales; fall back
      // to scanning the auto directory if none are configured.
      const configuredLocales = getProjectLocales(projectRoot).filter(
        (locale) => locale && locale !== baseLocale,
      );
      const locales = new Set(configuredLocales);

      if (locales.size === 0) {
        const topEntries = await readdir(autoDir, { withFileTypes: true });
        for (const e of topEntries) {
          if (e.isDirectory() && e.name !== baseLocale) locales.add(e.name);
          if (e.isFile() && isJsonFile(e.name)) {
            const name = e.name.replace(/\.json$/i, '');
            if (name !== baseLocale) locales.add(name);
          }
        }
      }

      for (const locale of locales) {
        const localeDir = path.resolve(autoDir, locale);

        const singleLocalePath = path.resolve(autoDir, `${locale}.json`);
        const singleLocaleData = (await readJson(singleLocalePath)) || {};

        for (const baseFile of baseFiles) {
          const rel = path.relative(baseGroupedDir, baseFile);
          const targetPath = path.resolve(localeDir, rel);
          const baseObj = await readJson(baseFile);
          if (!baseObj || typeof baseObj !== 'object') continue;

          const existingFileData = (existsSync(targetPath) ? await readJson(targetPath) : null) || {};
          const fromSingle = maskPick(singleLocaleData, baseObj) || {};
          const seededExisting = deepFillFromBase(fromSingle, existingFileData);
          const merged = deepFillFromBase(baseObj, seededExisting);
          const sorted = sortObjectDeep(merged);
          await mkdir(path.dirname(targetPath), { recursive: true });
          await writeJson(targetPath, sorted);
          updatedCount += 1;
          console.log(`[i18n-sync] Synced ${locale}/${rel}`);
        }
      }
    } else {
      // Single-file base fallback
      const basePath = path.resolve(autoDir, `${baseLocale}.json`);
      if (!existsSync(basePath)) {
        console.error(`[i18n-sync] Base locale file not found: ${basePath}`);
        process.exit(1);
      }
      const baseData = await readJson(basePath);
      if (!baseData || typeof baseData !== 'object') {
        console.error('[i18n-sync] Base locale JSON is empty or invalid.');
        process.exit(1);
      }

      const entries = await readdir(autoDir, { withFileTypes: true });
      const configuredLocales = getProjectLocales(projectRoot).filter(
        (locale) => locale && locale !== baseLocale,
      );

      if (configuredLocales.length > 0) {
        for (const localeName of configuredLocales) {
          const localePath = path.resolve(autoDir, `${localeName}.json`);
          const localeData = (await readJson(localePath)) || {};
          const merged = deepFillFromBase(baseData, localeData);
          const sorted = sortObjectDeep(merged);
          await writeJson(localePath, sorted);
          updatedCount += 1;
          console.log(`[i18n-sync] Synced keys into ${localeName}.json`);
        }
      } else {
        for (const entry of entries) {
          if (!entry.isFile() || !isJsonFile(entry.name)) continue;
          const localeName = entry.name.replace(/\.json$/i, '');
          if (localeName === baseLocale) continue;
          const localePath = path.resolve(autoDir, entry.name);
          const localeData = (await readJson(localePath)) || {};
          const merged = deepFillFromBase(baseData, localeData);
          const sorted = sortObjectDeep(merged);
          await writeJson(localePath, sorted);
          updatedCount += 1;
          console.log(`[i18n-sync] Synced keys into ${entry.name}`);
        }
      }
    }

    console.log(`[i18n-sync] Completed. Updated ${updatedCount} file(s).`);
  } catch (error) {
    console.error('[i18n-sync] Failed to sync locale files.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
