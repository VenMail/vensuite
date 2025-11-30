/**
 * Technical Content Validator
 * Detects URLs, file paths, technical identifiers, and other
 * non-translatable technical content.
 */

// Common file extensions
const FILE_EXTENSIONS = new Set([
  // Web
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx',
  'vue', 'svelte', 'json', 'xml', 'yaml', 'yml', 'toml', 'md', 'mdx',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'avif',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
  // Media
  'mp3', 'mp4', 'wav', 'ogg', 'webm', 'avi', 'mov', 'mkv', 'flac', 'aac',
  // Code
  'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift',
  'kt', 'scala', 'clj', 'ex', 'exs', 'erl', 'hs', 'lua', 'pl', 'r', 'sql',
  // Config
  'env', 'ini', 'cfg', 'conf', 'config', 'lock', 'log',
  // Other
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'map', 'min',
]);

// Common protocol prefixes
const PROTOCOL_PREFIXES = [
  'http://', 'https://', 'ftp://', 'sftp://', 'ssh://', 'git://',
  'mailto:', 'tel:', 'sms:', 'file://', 'data:', 'blob:',
  'ws://', 'wss://', 'irc://', 'magnet:', 'javascript:',
];

// Technical abbreviations that shouldn't be translated
const TECHNICAL_ABBREVIATIONS = new Set([
  // Protocols
  'http', 'https', 'ftp', 'sftp', 'ssh', 'tcp', 'udp', 'ip', 'dns', 'ssl', 'tls',
  'smtp', 'imap', 'pop3', 'ldap', 'oauth', 'jwt', 'api', 'rest', 'graphql', 'grpc',
  'webdav', 'websocket', 'ws', 'wss',
  // File formats
  'json', 'xml', 'html', 'css', 'csv', 'pdf', 'svg', 'png', 'jpg', 'gif', 'webp',
  // Database
  'sql', 'nosql', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle',
  // Programming
  'npm', 'yarn', 'pnpm', 'bun', 'node', 'deno', 'php', 'python', 'ruby', 'java',
  'golang', 'rust', 'swift', 'kotlin', 'typescript', 'javascript',
  // Cloud/DevOps
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'ci', 'cd', 'devops',
  // Misc
  'uuid', 'guid', 'id', 'url', 'uri', 'urn', 'utf', 'ascii', 'unicode', 'base64',
  'md5', 'sha', 'sha256', 'sha512', 'aes', 'rsa', 'hmac', 'cors', 'csrf', 'xss',
]);

/**
 * Check if text is a URL
 */
function isUrl(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for protocol prefix
  for (const prefix of PROTOCOL_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      return true;
    }
  }
  
  // Check for www. prefix
  if (/^www\./i.test(trimmed)) {
    return true;
  }
  
  // Check for URL-like patterns (domain.tld/path)
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/[^\s]*)?$/i.test(trimmed)) {
    return true;
  }
  
  // Check for path-only URLs
  if (/^\/[a-z0-9_-]+(\/[a-z0-9_-]+)*\/?$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a file path
 */
function isFilePath(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for file extension
  const extMatch = trimmed.match(/\.([a-z0-9]+)$/i);
  if (extMatch && FILE_EXTENSIONS.has(extMatch[1].toLowerCase())) {
    return true;
  }
  
  // Check for path separators
  if (/^[./\\]/.test(trimmed) && /[/\\]/.test(trimmed)) {
    return true;
  }
  
  // Check for Windows-style paths
  if (/^[A-Z]:[/\\]/i.test(trimmed)) {
    return true;
  }
  
  // Check for Unix-style absolute paths
  if (/^\/[a-z0-9_-]+/i.test(trimmed) && /\//.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a UUID
 */
function isUuid(text) {
  const trimmed = String(text || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
}

/**
 * Check if text is a hex color
 */
function isHexColor(text) {
  const trimmed = String(text || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(trimmed);
}

/**
 * Check if text is a query string or URL parameters
 */
function isQueryString(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for query string patterns
  if (/^[?&]?[a-z_][a-z0-9_]*=[^&]*/i.test(trimmed)) {
    return true;
  }
  
  // Check for multiple parameters
  if (/^([a-z_][a-z0-9_]*=[^&]*&)+[a-z_][a-z0-9_]*=[^&]*$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a technical identifier (hash, token, etc.)
 */
function isTechnicalIdentifier(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for UUID
  if (isUuid(trimmed)) {
    return true;
  }
  
  // Check for hex strings (likely hashes or tokens)
  if (/^[0-9a-f]{16,}$/i.test(trimmed)) {
    return true;
  }
  
  // Check for base64-like strings (no spaces, mix of alphanumeric and +/=)
  if (/^[A-Za-z0-9+/=]{20,}$/.test(trimmed) && !/\s/.test(trimmed)) {
    // But not if it looks like a sentence
    if (!/[aeiou]{2,}/i.test(trimmed)) {
      return true;
    }
  }
  
  // Check for mixed alphanumeric identifiers (likely IDs or tokens)
  if (/^[a-z0-9_-]{8,}$/i.test(trimmed) && /\d/.test(trimmed) && /[a-z]/i.test(trimmed)) {
    // But not if it looks like a word
    if (!/^[a-z]+\d+$/i.test(trimmed) && !/^\d+[a-z]+$/i.test(trimmed)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if text is a version number
 */
function isVersionNumber(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Semantic versioning: 1.0.0, v1.2.3, 1.0.0-beta.1
  if (/^v?\d+\.\d+(\.\d+)?(-[a-z0-9.-]+)?$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a date/time format string
 */
function isDateTimeFormat(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Common date/time format patterns
  if (/^[YMDHhmsaAzZ\-/:.\s]+$/.test(trimmed) && /[YMDHhms]/.test(trimmed)) {
    return true;
  }
  
  // ISO date patterns
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a numeric pattern (phone, credit card, etc.)
 */
function isNumericPattern(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Phone number patterns
  if (/^[+]?\d[\d\s()-]{6,}$/.test(trimmed)) {
    return true;
  }
  
  // Credit card patterns
  if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(trimmed)) {
    return true;
  }
  
  // Pure numeric with separators
  if (/^\d[\d\s.,'-]*\d$/.test(trimmed) && !/[a-zA-Z]/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a technical abbreviation
 */
function isTechnicalAbbreviation(text) {
  const trimmed = String(text || '').trim().toLowerCase();
  return TECHNICAL_ABBREVIATIONS.has(trimmed);
}

/**
 * Check if text is technical content that shouldn't be translated
 * This is the main entry point for technical validation
 */
function isTechnicalContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for URL
  if (isUrl(trimmed)) {
    return true;
  }
  
  // Check for file path
  if (isFilePath(trimmed)) {
    return true;
  }
  
  // Check for technical identifier
  if (isTechnicalIdentifier(trimmed)) {
    return true;
  }
  
  // Check for hex color
  if (isHexColor(trimmed)) {
    return true;
  }
  
  // Check for query string
  if (isQueryString(trimmed)) {
    return true;
  }
  
  // Check for version number
  if (isVersionNumber(trimmed)) {
    return true;
  }
  
  // Check for date/time format
  if (isDateTimeFormat(trimmed)) {
    return true;
  }
  
  // Check for numeric pattern
  if (isNumericPattern(trimmed)) {
    return true;
  }
  
  // Check for technical abbreviation (single word only)
  if (!/\s/.test(trimmed) && isTechnicalAbbreviation(trimmed)) {
    return true;
  }
  
  return false;
}

module.exports = {
  FILE_EXTENSIONS,
  PROTOCOL_PREFIXES,
  TECHNICAL_ABBREVIATIONS,
  isUrl,
  isFilePath,
  isUuid,
  isHexColor,
  isQueryString,
  isTechnicalIdentifier,
  isVersionNumber,
  isDateTimeFormat,
  isNumericPattern,
  isTechnicalAbbreviation,
  isTechnicalContent,
};
