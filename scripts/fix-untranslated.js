#!/usr/bin/env node
// Version: 0.1.15
const { readdir, readFile, writeFile } = require('node:fs/promises');
const { existsSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// Import shared utilities
const { detectSrcRoot } = require('./lib/projectConfig');
const { getIgnorePatterns, isPlaceholderOnlyText } = require('./lib/ignorePatterns');
const { listLocales } = require('./lib/localeUtils');

const projectRoot = path.resolve(__dirname, '..');
const autoDir = path.resolve(projectRoot, 'resources', 'js', 'i18n', 'auto');
const srcRoot = detectSrcRoot(projectRoot);
const ignorePatternsPath = path.resolve(projectRoot, 'scripts', 'i18n-ignore-patterns.json');

// Initialize ignore patterns from shared utility
getIgnorePatterns(projectRoot);

function shouldPersistIgnorePattern(normalized) {
  const value = String(normalized || '').trim();
  if (!value) return false;

  const isLower = value === value.toLowerCase();
  const isKeyLike = isLower && /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(value);
  if (!isKeyLike) return true;

  const lastSegment = value.split('.').pop();
  const tlds = new Set(['com', 'net', 'org', 'io', 'dev', 'app', 'co', 'edu', 'gov', 'info']);
  if (lastSegment && tlds.has(lastSegment)) {
    return true;
  }

  return false;
}

function addExactIgnorePattern(value) {
  if (!value) return;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return;
  if (!shouldPersistIgnorePattern(normalized)) return;
  const patterns = getIgnorePatterns(projectRoot);
  if (!patterns.exact) {
    patterns.exact = [];
  }
  if (patterns.exact.includes(normalized)) {
    return;
  }
  patterns.exact.push(normalized);
  try {
    writeFileSync(ignorePatternsPath, JSON.stringify(patterns, null, 2) + '\n', 'utf8');
  } catch {
    // ignore write errors to avoid breaking the main flow
  }
}

async function collectJsonFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsonFiles(entryPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(entryPath);
    }
  }
}

async function readJsonSafe(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[fix-untranslated] Failed to read/parse JSON: ${filePath}`);
    console.error(err?.message || err);
    return null;
  }
}

async function collectSourceFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'vendor', '.git', 'storage', 'bootstrap', 'public'].includes(entry.name)) {
        continue;
      }
      await collectSourceFiles(entryPath, out);
    } else if (entry.isFile()) {
      if (/\.(tsx|ts|jsx|js)$/i.test(entry.name)) {
        out.push(entryPath);
      }
    }
  }
}
let cachedUsageIndex = null;

async function buildUsageIndex() {
  const index = Object.create(null);
  if (!existsSync(srcRoot)) return index;

  const files = [];
  await collectSourceFiles(srcRoot, files);

  console.log(`[fix-untranslated] Scanning ${files.length} source files for key usage...`);

  for (const file of files) {
    const rel = path.relative(projectRoot, file);
    const code = await readFile(file, 'utf8');
    const lines = code.split(/\r?\n/);
    const regex = /(?:^|[^a-zA-Z0-9_$])\$?t\s*\(\s*(['"`])([A-Za-z0-9_\.\-]+)\1\s*(?:,|\))/g;

    for (let i = 0; i < lines.length; i += 1) {
      const lineText = lines[i];
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const key = match[2];
        if (!index[key]) {
          index[key] = [];
        }
        index[key].push({ file: rel, line: i + 1 });
      }
    }
  }

  console.log('[fix-untranslated] Finished building source usage index.');
  return index;
}

async function indexKeyUsage(fullKey) {
  if (!fullKey) return [];
  if (!cachedUsageIndex) {
    cachedUsageIndex = await buildUsageIndex();
  }
  return cachedUsageIndex[fullKey] || [];
}

function isNonTranslatableExample(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  const normalized = trimmed.replace(/\s+/g, ' ');
  const ignore = getIgnorePatterns();
  if (ignore && Array.isArray(ignore.exact) && ignore.exact.includes(normalized)) {
    return true;
  }
  if (ignore && Array.isArray(ignore.exactInsensitive)) {
    const lowerNorm = normalized.toLowerCase();
    for (const v of ignore.exactInsensitive) {
      if (String(v).toLowerCase() === lowerNorm) {
        return true;
      }
    }
  }
  if (ignore && Array.isArray(ignore.contains)) {
    for (const part of ignore.contains) {
      if (part && normalized.includes(String(part))) {
        return true;
      }
    }
  }
  if (isPlaceholderOnlyText(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  if (!/\s/.test(normalized) && normalized.includes('.') && /^[A-Za-z0-9.-]+$/.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Query-string or URL-fragment-like segments such as "?duration=", "?lang=en"
  if (!/\s/.test(normalized) && /[?&]/.test(normalized) && /=/.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  if (!/\s/.test(normalized) && /[:\[\]]/.test(normalized) && /^[A-Za-z0-9:._\-\[\]]+$/.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  if (/[{};]/.test(normalized) && /\b(const|let|var|function|return|if|else|for|while|class|async|await)\b/.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Domain + optional port and qualifier, e.g. "imap.gmail.com:993 (SSL)"
  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:\d+)?(\s*\([A-Za-z0-9\s]+\))?$/.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  if (/\{\{\s*[^}]+\s*\}\}/.test(normalized) && (/[?:]/.test(normalized) || /\|\|/.test(normalized) || /&&/.test(normalized) || /\.length\b/.test(normalized))) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Strings that are overwhelmingly CSS/utility classes plus placeholders
  {
    const words = normalized.split(/\s+/);
    const nonPlaceholderWords = words.filter((w) => !/^\{[^}]+\}$/.test(w));
    if (nonPlaceholderWords.length > 0) {
      const cssishWords = nonPlaceholderWords.filter(
        (w) => /[-:]/.test(w) && /^[A-Za-z0-9:._\-\[\]]+$/.test(w),
      );

      if (
        cssishWords.length >= 2 &&
        cssishWords.length >= nonPlaceholderWords.length - 1
      ) {
        addExactIgnorePattern(normalized);
        return true;
      }

      if (
        nonPlaceholderWords.length === 1 &&
        cssishWords.length === 1 &&
        nonPlaceholderWords[0].includes('-')
      ) {
        addExactIgnorePattern(normalized);
        return true;
      }
    }
  }
  // Analytics / object-literal style code snippets (e.g. gtag(... { 'send_to': ... }); )
  if (
    normalized.includes('gtag(') ||
    (/[{}]/.test(normalized) && /['"][^'"]+['"]\s*:/.test(normalized))
  ) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Strings that clearly look like examples (example.com, example-bucket, etc.)
  if (/\bexample\b/i.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Obvious filesystem paths (Unix/Windows) that are not URLs
  if (
    (/^[\\/][^\s]+$/.test(normalized)) || // /var/mail, \\server\\share
    (/^[A-Za-z]:[\\/][^\s]*$/.test(normalized)) // C:\path\to\file
  ) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Single-character strings are almost never meaningful UI copy
  if (normalized.length === 1) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Obvious URLs
  if (/^https?:\/\//i.test(normalized) || /^www\./i.test(normalized)) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Sample email addresses on example/acme domains
  const emailMatch = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  if (emailMatch) {
    const lower = normalized.toLowerCase();
    if (lower.includes('example.') || lower.includes('acme.')) {
      addExactIgnorePattern(normalized);
      return true;
    }
  }
  // Placeholder IDs / tokens like abcd1234 (no spaces, mixed letters+digits)
  const noSpace = !/\s/.test(normalized);
  const hasLetter = /[A-Za-z]/.test(normalized);
  const hasDigit = /\d/.test(normalized);
  if (noSpace && hasLetter && hasDigit && normalized.length >= 6 && normalized.length <= 64) {
    addExactIgnorePattern(normalized);
    return true;
  }
  // Well-known dummy names / brands and protocol-like tokens
  const lowerNorm = normalized.toLowerCase();
  if (
    lowerNorm === 'jane doe' ||
    lowerNorm === 'john doe' ||
    lowerNorm === 'acme corporation' ||
    lowerNorm === 'acme inc' ||
    lowerNorm === 'acme corp' ||
    lowerNorm === 'acme company' ||
    lowerNorm === 'venmail' ||
    /\bacme\b/.test(lowerNorm) ||
    /\bvenmail\b/.test(lowerNorm) ||
    /\bamazon s3\b/.test(lowerNorm) ||
    ['webdav', 'imap', 'smtp', 'pop3', 'ftp', 'sftp'].includes(lowerNorm)
  ) {
    addExactIgnorePattern(normalized);
    return true;
  }
  const alphaNum = normalized.replace(/[^A-Za-z0-9]/g, '');
  if (alphaNum && alphaNum.length <= 4 && alphaNum.toUpperCase() === alphaNum) {
    addExactIgnorePattern(normalized);
    return true;
  }
  if (/\d{2,}/.test(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower.includes('main street') && lower.includes('city') && lower.includes('state')) {
      addExactIgnorePattern(normalized);
      return true;
    }
  }
  // Heuristic: single "word" strings that look like random codes/abbreviations
  // rather than natural language. This helps auto-ignore things like internal
  // identifiers that happen to be present in locale files.
  const wordMatch = normalized.match(/^[A-Za-z]{3,8}$/);
  if (wordMatch) {
    const word = wordMatch[0];
    const lower = word.toLowerCase();
    const vowels = lower.replace(/[^aeiouy]/g, '').length;
    const consonants = lower.replace(/[^bcdfghjklmnpqrstvwxyz]/g, '').length;

    // Ignore words that have no vowels at all (e.g. "crm", "cfg"), since
    // these are overwhelmingly likely to be codes or abbreviations.
    if (vowels === 0 && consonants >= 2) {
      addExactIgnorePattern(normalized);
      return true;
    }

    // Ignore short "dense" consonant clusters like cccv/cccv etc (3 or more
    // consonants in a row) for words up to length 6; these are very unlikely
    // to be meaningful UI copy in English and are often internal codes.
    if (word.length <= 6 && /[bcdfghjklmnpqrstvwxyz]{3,}/i.test(word)) {
      addExactIgnorePattern(normalized);
      return true;
    }
  }
  return false;
}

function walkCompare(enObj, locObj, pathSegments, issues, locale, options) {
  if (!enObj || typeof enObj !== 'object' || Array.isArray(enObj)) return;
  if (!locObj || typeof locObj !== 'object' || Array.isArray(locObj)) return;

  for (const [key, enVal] of Object.entries(enObj)) {
    const nextPath = pathSegments.concat(key);
    const locVal = Object.prototype.hasOwnProperty.call(locObj, key) ? locObj[key] : undefined;

    if (typeof enVal === 'string' && typeof locVal === 'string') {
      const enTrimmed = String(enVal || '').trim();
      if (!enTrimmed || !/[A-Za-z]/.test(enTrimmed) || isNonTranslatableExample(enTrimmed)) {
        continue;
      }
      if (locVal === enVal) {
        const keyPath = nextPath.join('.');
        // Generic untranslated issue (locale string identical to English)
        issues.push({
          locale,
          keyPath,
          english: enVal,
          current: locVal,
          issueType: 'untranslated',
        });
      }

      // Optional: style hints for French button labels
      if (
        locale === 'fr' &&
        options &&
        options.conciseMap &&
        pathSegments.includes('button') &&
        options.conciseMap[locVal]
      ) {
        const keyPath = nextPath.join('.');
        issues.push({
          locale,
          keyPath,
          english: enVal,
          current: locVal,
          suggested: options.conciseMap[locVal],
          issueType: 'style',
        });
      }
    } else if (
      enVal && typeof enVal === 'object' && !Array.isArray(enVal) &&
      locVal && typeof locVal === 'object' && !Array.isArray(locVal)
    ) {
      walkCompare(enVal, locVal, nextPath, issues, locale, options);
    }
  }
}

async function main() {
  if (!existsSync(autoDir)) {
    console.error('[fix-untranslated] i18n auto directory not found:', autoDir);
    process.exit(1);
  }

  let hadLocaleReadErrors = false;

  const locales = await listLocales(autoDir, { includeJsonFiles: false });
  if (!locales.includes('en')) {
    console.error('[fix-untranslated] No "en" locale found under', autoDir);
    process.exit(1);
  }

  const issues = [];

  const conciseFrMap = {
    "Mettre à jour l'utilisateur": "Modifier",
    "Mettre à jour l'invitation": "Modifier",
    "Mettre à jour le mot de passe": "Modifier",
    "Mettre à jour l'abonnement": "Modifier",
    "Mettre à jour": "Modifier",
    "Supprimer l'utilisateur": "Supprimer",
    "Supprimer le compte": "Supprimer",
    "Supprimer le jeton": "Supprimer",
    "Supprimer l'arrière-plan": "Supprimer",
    "Enregistrer l'abonnement": "Enregistrer",
    "Enregistrer le fournisseur": "Enregistrer",
    "Enregistrer les paramètres API": "Enregistrer",
    "Enregistrer les modifications": "Enregistrer",
    "Ajouter un libellé": "Ajouter",
    "Ajouter un fournisseur": "Ajouter",
    "Ajouter un client": "Ajouter",
    "Ajouter des fonds": "Ajouter",
    "Ajouter une note": "Ajouter",
    "Créer un nouveau libellé": "Créer",
    "Créer une prospection": "Créer",
    "Créer un profil": "Créer",
    "Créer une tâche": "Créer",
    "Créer une équipe": "Créer",
    "Copier/Partager l'URL d'invitation": "Copier le lien",
    "Personnaliser le message d'invitation": "Personnaliser",
    "Envoyer le mot de passe à l'utilisateur": "Envoyer",
    "Envoyer le mot de passe": "Envoyer",
    "Importer des utilisateurs existants": "Importer",
    "Démarrer l'import": "Démarrer",
    "Voir les détails": "Détails",
    "Retour aux contacts": "Retour",
    "Alimenter le portefeuille": "Alimenter",
    "Gérer les valeurs par défaut partenaires": "Gérer",
    "Voir tous les clients": "Voir tout",
    "Recommander un partenaire": "Recommander",
    "Recommander votre premier partenaire": "Recommander",
    "Obtenir le jeton FCM": "Obtenir",
    "Rafraîchir le jeton": "Rafraîchir",
    "Rafraîchir la page": "Rafraîchir",
    "Revenir aux réunions": "Retour",
    "Rejoindre la réunion": "Rejoindre",
    "Mettre fin à l'abonnement": "Résilier",
    "Annuler l'abonnement": "Annuler",
    "Correction automatique": "Auto-corriger",
    "Reprogrammer": "Modifier",
    "Planifier une réunion": "Planifier",
    "Ajouter un e‑mail de relance": "Ajouter",
    "Copier l'invitation": "Copier",
    "Copier l'e‑mail": "Copier",
    "Copier le lien": "Copier",
  };

  for (const locale of locales) {
    if (locale === 'en') continue;

    const locRoot = path.resolve(autoDir, locale);
    const enRoot = path.resolve(autoDir, 'en');

    const locFiles = [];
    await collectJsonFiles(locRoot, locFiles);

    for (const locFile of locFiles) {
      const rel = path.relative(locRoot, locFile);
      const enFile = path.resolve(enRoot, rel);
      if (!existsSync(enFile)) continue;

      const locJson = await readJsonSafe(locFile);
      const enJson = await readJsonSafe(enFile);
      if (!locJson || !enJson) {
        hadLocaleReadErrors = true;
        continue;
      }

      const fileIssues = [];
      walkCompare(
        enJson,
        locJson,
        [],
        fileIssues,
        locale,
        locale === 'fr' ? { conciseMap: conciseFrMap } : {},
      );

      for (const issue of fileIssues) {
        issue.localeFile = path.relative(autoDir, locFile);
        issues.push(issue);
      }
    }
  }

  if (issues.length === 0) {
    if (hadLocaleReadErrors) {
      console.error('[fix-untranslated] Aborting: one or more locale JSON files could not be parsed.');
      process.exit(1);
    }
    console.log('[fix-untranslated] No untranslated or style issues detected.');
    process.exit(0);
  }

  if (hadLocaleReadErrors) {
    console.error('[fix-untranslated] Aborting: one or more locale JSON files could not be parsed.');
    process.exit(1);
  }

  function groupIssuesByFile(issuesSubset) {
    const byFile = new Map();
    for (const issue of issuesSubset) {
      const key = `${issue.locale}::${issue.localeFile || ''}`;
      let entry = byFile.get(key);
      if (!entry) {
        entry = {
          locale: issue.locale,
          localeFile: issue.localeFile,
          issues: [],
        };
        byFile.set(key, entry);
      }
      const item = {
        keyPath: issue.keyPath,
        english: issue.english,
        current: issue.current,
      };
      if (issue.issueType === 'style' && issue.suggested) {
        item.suggested = issue.suggested;
      }
      entry.issues.push(item);
    }
    return Array.from(byFile.values()).sort((a, b) => {
      if (a.locale === b.locale) {
        return String(a.localeFile || '').localeCompare(String(b.localeFile || ''));
      }
      return String(a.locale).localeCompare(String(b.locale));
    });
  }

  const untranslatedIssues = issues.filter((i) => i.issueType === 'untranslated');
  const styleIssues = issues.filter((i) => i.issueType === 'style');
  const generatedAt = new Date().toISOString();

  const combinedReportPath = path.resolve(projectRoot, 'scripts', '.i18n-untranslated-report.json');
  const combinedReport = {
    generatedAt,
    issues,
  };
  await writeFile(combinedReportPath, JSON.stringify(combinedReport, null, 2) + '\n', 'utf8');
  console.log('[fix-untranslated] Combined report written to', path.relative(projectRoot, combinedReportPath));
  console.log(`[fix-untranslated] Total issues: ${issues.length}`);

  if (untranslatedIssues.length > 0) {
    const files = groupIssuesByFile(untranslatedIssues);
    const untranslatedPath = path.resolve(projectRoot, 'scripts', '.i18n-untranslated-untranslated.json');
    const report = {
      issueType: 'untranslated',
      generatedAt,
      files,
    };
    await writeFile(untranslatedPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log('[fix-untranslated] Untranslated report written to', path.relative(projectRoot, untranslatedPath));
    console.log(`  Files: ${files.length}, Issues: ${untranslatedIssues.length}`);

    // Also write a compact untranslated report that only contains, for each
    // locale/localeFile pair, the source files and line ranges where
    // untranslated keys are used. This is optimized for GPT-style tools that
    // only need to know *where* to look in the source, not per-key details.
    const compactByFile = new Map();

    // Pre-seed entries for each locale/localeFile pair.
    for (const issue of untranslatedIssues) {
      const key = `${issue.locale}::${issue.localeFile || ''}`;
      if (!compactByFile.has(key)) {
        compactByFile.set(key, {
          locale: issue.locale,
          localeFile: issue.localeFile,
          ranges: new Map(), // sourceFile -> { file, lineStart, lineEnd }
        });
      }
    }

    // For each untranslated key, look up where it is used in source and merge
    // all usages into line ranges per source file.
    for (const issue of untranslatedIssues) {
      const key = `${issue.locale}::${issue.localeFile || ''}`;
      const entry = compactByFile.get(key);
      if (!entry) continue;

      const usage = await indexKeyUsage(issue.keyPath);
      if (!usage || !usage.length) continue;

      for (const u of usage) {
        const fileKey = u.file;
        let range = entry.ranges.get(fileKey);
        if (!range) {
          range = { file: fileKey, lineStart: u.line, lineEnd: u.line };
        } else {
          if (u.line < range.lineStart) range.lineStart = u.line;
          if (u.line > range.lineEnd) range.lineEnd = u.line;
        }
        entry.ranges.set(fileKey, range);
      }
    }

    const compactFiles = Array.from(compactByFile.values())
      .map((entry) => ({
        locale: entry.locale,
        localeFile: entry.localeFile,
        issues: Array.from(entry.ranges.values()),
      }))
      .filter((entry) => entry.issues.length > 0)
      .sort((a, b) => {
        if (a.locale === b.locale) {
          return String(a.localeFile || '').localeCompare(String(b.localeFile || ''));
        }
        return String(a.locale).localeCompare(String(b.locale));
      });

    const compactPath = path.resolve(projectRoot, 'scripts', '.i18n-untranslated-compact.json');
    const compactReport = {
      issueType: 'untranslated',
      generatedAt,
      files: compactFiles,
    };
    await writeFile(compactPath, JSON.stringify(compactReport, null, 2) + '\n', 'utf8');
    console.log('[fix-untranslated] Compact untranslated report written to', path.relative(projectRoot, compactPath));
  }

  if (styleIssues.length > 0) {
    const files = groupIssuesByFile(styleIssues);
    const stylePath = path.resolve(projectRoot, 'scripts', '.i18n-untranslated-style.json');
    const report = {
      issueType: 'style',
      generatedAt,
      files,
    };
    await writeFile(stylePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log('[fix-untranslated] Style report written to', path.relative(projectRoot, stylePath));
    console.log(`  Files: ${files.length}, Issues: ${styleIssues.length}`);
  }

  // Write a small standalone AI instructions text file instead of embedding
  // bulky prompts inside the JSON reports. This keeps the JSON lean while
  // still giving consumers a ready-to-use prompt.
  const instructionsPath = path.resolve(projectRoot, 'scripts', '.i18n-untranslated-ai-instructions.txt');
  const instructions = [
    'You are given one JSON report at a time describing i18n translation issues and to apply fixes not suggestions',
    '',
    'Input JSON structure:',
    '- issueType: "untranslated" or "style".',
    '- files: array of { locale, localeFile, issues }.',
    '- each issues[] item has: keyPath, english, current, and for style issues an optional suggested value.',
    '',
    'Processing rules:',
    '- Treat each element in files[] as a separate batch that corresponds to a single locale JSON file (localeFile).',
    '- For every issue in issues[], you must propose a final translation for that locale.',
    '- For issueType="untranslated": translate english into the target locale language.',
    '- For issueType="style": refine current (or suggested, if present) into a concise, UI-appropriate label in the same locale.',
    '- Always preserve placeholders exactly (e.g. {name}, {value1}, {{ variable }}).',
    '- Do not change brand names (e.g. Venmail) or protocol names (e.g. SMTP, IMAP, WebDAV).',
    '',
    'Your goal is to help improve translations in-place, in small batches per locale file, based on this report applying the suggestions to relevant files as necessary.',
  ].join('\n');

  await writeFile(instructionsPath, instructions + '\n', 'utf8');
  console.log('[fix-untranslated] AI instructions written to', path.relative(projectRoot, instructionsPath));
}

main().catch((err) => {
  console.error('[fix-untranslated] Failed:', err && err.message ? err.message : err);
  process.exit(1);
});
