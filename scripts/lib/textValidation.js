/**
 * Shared text validation utilities for determining if text is translatable
 * Uses linguistic patterns to detect legitimate English words vs random strings
 */

// Precomputed sets for efficient vowel/consonant checks
const vowels = new Set('aeiouy'.split(''));
const consonants = new Set('bcdfghjklmnpqrstvwxz'.split(''));

// Cache for common short words
const commonShortCache = new Set(['a', 'i', 'an', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we']);

/**
 * Check if a word follows basic English phonetic patterns
 * Uses consonant-vowel patterns and common English letter combinations
 */
function hasEnglishPhoneticPattern(word) {
  if (!word || typeof word !== 'string') {
    return false;
  }

  const lower = word.toLowerCase();
  
  // Very short words - check against cached common English words
  if (lower.length <= 2) {
    return commonShortCache.has(lower);
  }

  // Count vowels and consonants
  let vowelCount = 0;
  let consonantCount = 0;
  
  for (const char of lower) {
    if (vowels.has(char)) {
      vowelCount++;
    } else if (consonants.has(char)) {
      consonantCount++;
    }
  }
  
  // Must have at least one vowel
  if (vowelCount === 0) {
    return false;
  }
  
  // For words >=4 chars, check consonant clusters
  if (lower.length >= 4) {
    const consonantClusters = lower.match(/[bcdfghjklmnpqrstvwxz]{4,}/g);
    if (consonantClusters && consonantClusters.length > 0) {
      const validClusters = ['tch', 'sch', 'str', 'spr', 'spl', 'scr', 'thr', 'shr', 'phr'];
      const hasValidCluster = consonantClusters.some(cluster => 
        validClusters.some(valid => cluster.includes(valid))
      );
      if (!hasValidCluster) {
        return false;
      }
    }

    // Reject if too many vowels in a row
    if (/[aeiouy]{4,}/.test(lower)) {
      return false;
    }
  }
  
  // Check for alternating consonant-vowel pattern
  let transitions = 0;
  let cvTransitions = 0;
  
  for (let i = 0; i < lower.length - 1; i++) {
    const curr = lower[i];
    const next = lower[i + 1];
    
    if ((vowels.has(curr) || consonants.has(curr)) && 
        (vowels.has(next) || consonants.has(next))) {
      transitions++;
      
      if (vowels.has(curr) !== vowels.has(next)) {
        cvTransitions++;
      }
    }
  }
  
  if (transitions > 0 && cvTransitions / transitions < 0.3) {
    return false;
  }
  
  // Check for common English letter combinations
  const commonBigrams = new Set([
    'th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd',
    'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar',
    'st', 'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 'io', 'le'
  ]);
  
  let bigramMatches = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    const bigram = lower.substring(i, i + 2);
    if (commonBigrams.has(bigram)) {
      bigramMatches++;
    }
  }
  
  // For words longer than 4 chars, expect at least one common bigram
  if (lower.length > 4 && bigramMatches === 0) {
    return false;
  }
  
  return true;
}

/**
 * Check if text contains legitimate English words
 * Applies phonetic pattern validation to each word
 */
function containsEnglishWords(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  
  // Split into words (handle punctuation)
  const words = trimmed.split(/[\s,;.!?()[\]{}]+/).filter(w => w.length > 0);
  
  if (words.length === 0) {
    return false;
  }
  
  // At least 50% of words should pass phonetic validation
  let validWords = 0;
  for (const word of words) {
    // Remove leading/trailing punctuation and quotes
    const cleaned = word.replace(/^['"]+|['"]+$/g, '');
    if (hasEnglishPhoneticPattern(cleaned)) {
      validWords++;
    }
  }
  
  return validWords / words.length >= 0.5;
}

/**
 * Comprehensive check if text is translatable
 * Combines phonetic validation with other heuristics
 */
function isTranslatableText(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  
  // Early exit for very short texts
  if (trimmed.length < 2) {
    return false;
  }
  
  // UUID detection
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return false;
  }

  // Technical patterns (colons/brackets without spaces)
  if (!/\s/.test(trimmed) && /[:\[\]]/.test(trimmed) && /^[\w:._\-\[\]]+$/.test(trimmed)) {
    return false;
  }

  // Code-like patterns
  if (/[{};]/.test(trimmed) && /\b(const|let|var|function|return|if|else|for|while|class|async|await)\b/.test(trimmed)) {
    return false;
  }

  // Must have at least one letter
  if (!/[a-z]/i.test(trimmed)) {
    return false;
  }

  // CSS class patterns
  if (/^[a-z0-9-]+(?:\s+[a-z0-9-]+)*$/i.test(trimmed)) {
    if (trimmed.includes('-') || trimmed.split(/\s+/).length > 3) {
      return false;
    }
  }

  // CamelCase/PascalCase identifiers
  if (/^[a-z][a-z0-9]*$|^[A-Z][A-Za-z0-9]*$/.test(trimmed)) {
    return false;
  }

  // Technical abbreviations (all caps, 2-5 chars)
  if (/^[A-Z]{2,5}$/.test(trimmed)) {
    return false;
  }

  // URL detection (improved pattern)
  if (/^(?:https?:\/\/|www\.|\/)[^\s]*$/.test(trimmed)) {
    return false;
  }

  // Query string patterns
  if (!/\s/.test(trimmed) && /^(?:[?#][\w.=-]*(?:&[\w.=-]+)*|\w+=.*)$/.test(trimmed)) {
    return false;
  }

  // File paths/extensions
  if (/\.[a-z0-9]{2,4}$/i.test(trimmed)) {
    return false;
  }

  // Hex colors
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return false;
  }

  // Numeric patterns
  if (/^\d[\d\s.,-]*\d$/.test(trimmed)) {
    return false;
  }

  // Exclude id-like tokens (mixed alnum, no spaces)
  if (!/\s/.test(trimmed)) {
    const hasLetter = /[A-Za-z]/.test(trimmed);
    const hasDigit = /\d/.test(trimmed);
    if (hasLetter && hasDigit && trimmed.length >= 6 && trimmed.length <= 64) {
      return false;
    }
  }

  // Exclude single words with underscores or dots (technical identifiers)
  if (!trimmed.includes(' ') && (trimmed.includes('_') || trimmed.includes('.'))) {
    return false;
  }

  // Exclude common non-translatable single words
  const technicalWords = [
    'div', 'span', 'input', 'form', 'select', 'option', 'textarea',
    'true', 'false', 'null', 'undefined',
    'primary', 'secondary', 'danger', 'info', 'light', 'dark',
    'sm', 'md', 'lg', 'xl', 'xs', '2xl', '3xl',
  ];
  if (!trimmed.includes(' ') && technicalWords.includes(trimmed.toLowerCase())) {
    return false;
  }

  const htmlAttributeLike = /(class|style)\s*=\s*["'][^"']*["']/.test(trimmed) || /@\w+\s*=\s*["'][^"']*["']/.test(trimmed);
  if (htmlAttributeLike) {
    return false;
  }

  if (/^\s*(height|width|margin|padding|font(?:-family)?|color|background|border)[^;{]*;?\s*$/.test(trimmed)) {
    return false;
  }

  if (/^\s*(sans|serif|mono|monospace|system)\s*\([^)]+\)\s*$/i.test(trimmed)) {
    return false;
  }

  const moustacheMatch = trimmed.match(/\{\{\s*([^}]+)\s*\}\}/);
  if (moustacheMatch) {
    const inner = moustacheMatch[1] || '';
    if (/\.\s*length\b/.test(inner)) {
      return false;
    }
  }

  // Allow placeholder patterns (words separated by underscores) that contain at least one English word
  if (trimmed.includes('_') && !trimmed.includes(' ')) {
    const parts = trimmed.split('_');
    const hasEnglishPart = parts.some(part => {
      return part.length > 1 && hasEnglishPhoneticPattern(part);
    });
    if (hasEnglishPart) {
      return true;
    }
  }

  // Domain patterns
  if (/^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\s*\([a-z0-9\s]+\))?$/i.test(trimmed)) {
    return false;
  }

  // CSS/utility class patterns
  const normalized = trimmed.replace(/\s+/g, ' ');
  const words = normalized.split(/\s+/);
  const nonPlaceholderWords = words.filter(w => !/^\{[^}]+\}$/.test(w));
  
  if (nonPlaceholderWords.length > 0) {
    const cssishWords = nonPlaceholderWords.filter(
      w => /[-:]/.test(w) && /^[\w:._\-\[\]]+$/.test(w)
    );

    if (cssishWords.length >= 2 && cssishWords.length >= nonPlaceholderWords.length - 1) {
      return false;
    }

    if (nonPlaceholderWords.length === 1 && cssishWords.length === 1 && 
        nonPlaceholderWords[0].includes('-')) {
      return false;
    }
  }

  // Apply English phonetic pattern validation
  if (!containsEnglishWords(normalized)) {
    return false;
  }

  // Capitalization check for single words
  if (words.length === 1 && trimmed[0] !== trimmed[0].toUpperCase()) {
    return false;
  }

  // CSS class lists
  if (words.length > 1 && words.every(w => w.includes('-'))) {
    return false;
  }

  return true;
}

module.exports = {
  hasEnglishPhoneticPattern,
  containsEnglishWords,
  isTranslatableText,
};
