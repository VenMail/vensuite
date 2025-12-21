/**
 * Technical Content Validator
 * Detects URLs, file paths, technical identifiers, config files, and other
 * non-translatable technical content.
 * AGGRESSIVE MODE: Catches all technical patterns
 */

// Common file extensions (expanded)
const FILE_EXTENSIONS = new Set([
  // Web
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx',
  'vue', 'svelte', 'astro', 'json', 'xml', 'yaml', 'yml', 'toml', 'md', 'mdx',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'avif', 'heic', 'heif',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'odt', 'ods', 'odp',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'tbz2', 'txz',
  // Media
  'mp3', 'mp4', 'wav', 'ogg', 'webm', 'avi', 'mov', 'mkv', 'flac', 'aac', 'm4a', 'wma', 'flv',
  // Code
  'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift',
  'kt', 'scala', 'clj', 'ex', 'exs', 'erl', 'hs', 'lua', 'pl', 'r', 'sql', 'sh', 'bash',
  'zsh', 'fish', 'ps1', 'bat', 'cmd', 'vim', 'el', 'lisp', 'dart', 'f90', 'f95', 'pas',
  // Config
  'env', 'ini', 'cfg', 'conf', 'config', 'lock', 'log', 'properties', 'props', 'editorconfig',
  'gitignore', 'dockerignore', 'npmrc', 'yarnrc', 'eslintrc', 'prettierrc', 'babelrc',
  // Build/Package
  'gradle', 'maven', 'sbt', 'cmake', 'make', 'rake', 'webpack', 'rollup', 'vite',
  // Other
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'map', 'min', 'gz', 'br', 'db', 'sqlite', 'sqlite3',
  'pem', 'crt', 'key', 'p12', 'pfx', 'cer', 'der',
]);

// Common protocol prefixes (expanded)
const PROTOCOL_PREFIXES = [
  'http://', 'https://', 'ftp://', 'sftp://', 'ssh://', 'git://', 'git+ssh://', 'git+https://',
  'mailto:', 'tel:', 'sms:', 'file://', 'data:', 'blob:', 'about:',
  'ws://', 'wss://', 'irc://', 'ircs://', 'magnet:', 'javascript:', 'chrome://', 'firefox://',
  'mongodb://', 'redis://', 'postgresql://', 'mysql://', 'sqlite://',
  's3://', 'gs://', 'azure://', 'docker://', 'k8s://',
];

// Technical abbreviations that shouldn't be translated (expanded)
const TECHNICAL_ABBREVIATIONS = new Set([
  // Protocols
  'http', 'https', 'ftp', 'sftp', 'ssh', 'tcp', 'udp', 'ip', 'dns', 'ssl', 'tls',
  'smtp', 'imap', 'pop3', 'ldap', 'oauth', 'jwt', 'api', 'rest', 'graphql', 'grpc',
  'webdav', 'websocket', 'ws', 'wss', 'rtc', 'webrtc', 'mqtt', 'amqp',
  // File formats
  'json', 'xml', 'html', 'css', 'csv', 'pdf', 'svg', 'png', 'jpg', 'gif', 'webp',
  'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
  // Database
  'sql', 'nosql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 
  'sqlite', 'oracle', 'mssql', 'db2', 'cassandra', 'dynamodb', 'firestore',
  // Programming
  'npm', 'yarn', 'pnpm', 'bun', 'node', 'nodejs', 'deno', 'php', 'python', 'ruby', 'java',
  'golang', 'rust', 'swift', 'kotlin', 'typescript', 'javascript', 'csharp', 'dotnet',
  // Cloud/DevOps
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'ci', 'cd', 'devops', 'cicd',
  'jenkins', 'gitlab', 'github', 'bitbucket', 'terraform', 'ansible', 'helm', 'argocd',
  // Version Control
  'git', 'svn', 'cvs', 'mercurial', 'hg', 'bzr',
  // Misc
  'uuid', 'guid', 'id', 'url', 'uri', 'urn', 'utf', 'ascii', 'unicode', 'base64',
  'md5', 'sha', 'sha1', 'sha256', 'sha512', 'aes', 'rsa', 'hmac', 'cors', 'csrf', 'xss',
  'cdn', 'dns', 'dhcp', 'nat', 'vpn', 'lan', 'wan', 'mac', 'ipv4', 'ipv6',
  'http2', 'http3', 'quic', 'spdy',
  // File systems
  'ntfs', 'fat32', 'exfat', 'ext4', 'ext3', 'xfs', 'btrfs', 'zfs', 'apfs',
]);

// Environment variable patterns
const ENV_VAR_PATTERNS = [
  /^[A-Z][A-Z0-9_]*$/,              // SCREAMING_SNAKE_CASE
  /^\$[A-Z][A-Z0-9_]*$/,            // $VARIABLE
  /^\$\{[A-Z][A-Z0-9_]*\}$/,        // ${VARIABLE}
  /^%[A-Z][A-Z0-9_]*%$/,            // %VARIABLE% (Windows)
  /^\$\([A-Z][A-Z0-9_]*\)$/,        // $(VARIABLE) (Make)
];

// Config key patterns (key=value, key: value, etc.)
const CONFIG_KEY_VALUE_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.-]*\s*[:=]\s*.+$/;

/**
 * Check if text is a URL
 * AGGRESSIVE MODE: Catches more URL patterns
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
  
  // Check for domain patterns with TLD
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.(com|org|net|edu|gov|mil|co|io|dev|app|ai|xyz|tech|info|biz|name|us|uk|ca|au|de|fr|jp|cn|in|br|mx|es|it|nl|se|no|dk|fi|pl|ru|kr|tw|sg|hk|nz|za|ch|at|be|cz|gr|hu|ie|pt|ro|sk|tr|ae|ar|cl|pe|ve|ng|ke|ug|tz|gh|zm|zw|bw|mw|ls|sz|na|ao|mz|mg|mu|sc|re|yt|km|dj|so|et|er|sd|ss|ly|tn|dz|ma|mr|ml|ne|td|cf|cg|cd|ga|gq|st|cv|gm|gw|sn|lr|ci|bf|tg|bj|ng|cm|bi|rw|dj|so|ke|ug|tz|mw|zm|zw|bw|na|sz|ls|za|mg|mu|sc|re|yt|km|io|ac|sh|tk|top|xyz|online|site|website|space|club|store|blog|shop|live|news|media|world|today|life|work|email|support|services|solutions|systems|network|digital|cloud|host|domains|pro|xxx|asia|mobi|tel|travel|jobs|aero|coop|museum|int)$/i.test(trimmed)) {
    return true;
  }
  
  // Check for localhost or IP addresses
  if (/^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)/i.test(trimmed)) {
    return true;
  }
  
  // Check for IP address patterns (IPv4)
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?/.test(trimmed)) {
    return true;
  }
  
  // Check for IPv6 patterns
  if (/^\[?([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}\]?/i.test(trimmed)) {
    return true;
  }
  
  // Check for URL with port
  if (/^[a-z0-9.-]+:\d{2,5}(\/|$)/i.test(trimmed)) {
    return true;
  }
  
  // Check for path-only URLs (starting with /)
  if (/^\/[a-z0-9_.\-]+(\/[a-z0-9_.\-]*)*\/?(\?[^\s]*)?$/i.test(trimmed)) {
    return true;
  }
  
  // Check for URL with query parameters
  if (/^[a-z0-9.-]+\.[a-z]{2,}\?[a-z0-9_]+=/.test(trimmed)) {
    return true;
  }
  
  // Check for API endpoint patterns
  if (/^\/api\/[a-z0-9_/-]+$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a file path
 * AGGRESSIVE MODE: Catches more path patterns
 */
function isFilePath(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for file extension
  const extMatch = trimmed.match(/\.([a-z0-9]+)$/i);
  if (extMatch && FILE_EXTENSIONS.has(extMatch[1].toLowerCase())) {
    return true;
  }
  
  // Check for dotfiles (.env, .gitignore, .htaccess, etc.)
  if (/^\.(?:env|git|docker|npm|yarn|eslint|prettier|babel|editorconfig|htaccess|htpasswd)[a-z]*$/i.test(trimmed)) {
    return true;
  }
  
  // Check for config files without extensions
  if (/^(package|tsconfig|jsconfig|webpack|vite|rollup|babel|eslint|prettier|docker|makefile|rakefile|gemfile|podfile|cartfile|procfile|dockerfile|vagrantfile|gulpfile|gruntfile)\.?[a-z]*$/i.test(trimmed)) {
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
  if (/^\/[a-z0-9_.-]+/i.test(trimmed) && /\//.test(trimmed)) {
    return true;
  }
  
  // Check for relative paths with multiple segments
  if (/^\.\.?\/[a-z0-9_.-]+(\/[a-z0-9_.-]+)+/i.test(trimmed)) {
    return true;
  }
  
  // Check for paths with common directory names
  if (/\/(src|dist|build|public|assets|static|lib|node_modules|vendor|bin|config|tests?|docs?|examples?|components?|pages?|views?|routes?|models?|controllers?|services?|utils?|helpers?|middleware|api|app|core|shared|common)\//i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is an environment variable
 */
function isEnvironmentVariable(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check against known patterns
  for (const pattern of ENV_VAR_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  // Check for common env var names
  const commonEnvVars = [
    'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'PWD', 'TMPDIR', 'TERM',
    'NODE_ENV', 'PORT', 'HOST', 'DATABASE_URL', 'API_KEY', 'SECRET_KEY',
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
    'GOOGLE_APPLICATION_CREDENTIALS', 'AZURE_STORAGE_CONNECTION_STRING',
    'DEBUG', 'VERBOSE', 'LOG_LEVEL', 'ENV', 'ENVIRONMENT',
  ];
  
  if (commonEnvVars.includes(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a config key-value pair
 */
function isConfigKeyValue(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for key=value or key: value patterns
  if (CONFIG_KEY_VALUE_PATTERN.test(trimmed)) {
    return true;
  }
  
  // Check for YAML/TOML array or object syntax
  if (/^[a-zA-Z_][a-zA-Z0-9_.-]*:\s*[\[\{]/.test(trimmed)) {
    return true;
  }
  
  // Check for INI section headers
  if (/^\[[a-zA-Z_][a-zA-Z0-9_. -]*\]$/.test(trimmed)) {
    return true;
  }
  
  // Check for JSON-like key-value
  if (/^"[^"]+"\s*:\s*.+$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a command line argument or flag
 */
function isCommandLineArg(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for flags: -f, --flag, --flag=value
  if (/^-{1,2}[a-z][a-z0-9-]*(?:=.*)?$/i.test(trimmed)) {
    return true;
  }
  
  // Check for environment variable assignment in commands
  if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a database connection string
 */
function isDatabaseConnectionString(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for common database connection string patterns
  const dbPatterns = [
    /^(mongodb|postgresql|postgres|mysql|redis|sqlite):\/\//i,
    /^(Server|Data Source|Initial Catalog|User ID|Password)=/i,
    /^Host=.*Port=.*Database=/i,
  ];
  
  return dbPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Check if text is a UUID
 */
function isUuid(text) {
  const trimmed = String(text || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
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
  if (/^[?&]?[a-z_][a-z0-9_]*=[^&\s]*/i.test(trimmed)) {
    return true;
  }
  
  // Check for multiple parameters
  if (/^([a-z_][a-z0-9_]*=[^&\s]*&?)+$/i.test(trimmed)) {
    return true;
  }
  
  // Check for URL-encoded values
  if (/%[0-9A-F]{2}/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a technical identifier (hash, token, etc.)
 * AGGRESSIVE MODE: More patterns
 */
function isTechnicalIdentifier(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for UUID
  if (isUuid(trimmed)) {
    return true;
  }
  
  // Check for hex strings (likely hashes or tokens)
  if (/^(?:0x)?[0-9a-f]{16,}$/i.test(trimmed)) {
    return true;
  }
  
  // Check for base64-like strings (no spaces, mix of alphanumeric and +/=)
  if (/^[A-Za-z0-9+/=_-]{20,}$/.test(trimmed) && !/\s/.test(trimmed)) {
    // But not if it looks like a sentence (too many vowels)
    const vowelCount = (trimmed.match(/[aeiou]/gi) || []).length;
    if (vowelCount < trimmed.length * 0.4) {
      return true;
    }
  }
  
  // Check for JWT tokens (three base64 parts separated by dots)
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length > 50) {
    return true;
  }
  
  // Check for API keys (common prefixes)
  if (/^(sk|pk|api|token|key|auth)[-_][a-z0-9]{20,}$/i.test(trimmed)) {
    return true;
  }
  
  // Check for mixed alphanumeric identifiers (likely IDs or tokens)
  if (/^[a-z0-9_-]{12,}$/i.test(trimmed) && /\d/.test(trimmed) && /[a-z]/i.test(trimmed)) {
    // Has both letters and numbers
    const letterCount = (trimmed.match(/[a-z]/gi) || []).length;
    const digitCount = (trimmed.match(/\d/g) || []).length;
    // Good mix indicates it's likely an ID
    if (letterCount >= 3 && digitCount >= 3) {
      return true;
    }
  }
  
  // Check for MongoDB ObjectId pattern
  if (/^[0-9a-f]{24}$/i.test(trimmed)) {
    return true;
  }
  
  // Check for nanoid pattern (URL-safe random strings)
  if (/^[A-Za-z0-9_-]{21}$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a version number
 */
function isVersionNumber(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Semantic versioning: 1.0.0, v1.2.3, 1.0.0-beta.1, 1.0.0+build.123
  if (/^v?\d+\.\d+(\.\d+)?(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i.test(trimmed)) {
    return true;
  }
  
  // Calendar versioning: 2023.12, 2023.12.1
  if (/^\d{4}\.\d{1,2}(\.\d+)?$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a date/time format string or ISO date
 */
function isDateTimeFormat(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Common date/time format patterns (YYYY-MM-DD, HH:mm:ss, etc.)
  // Be more strict: must have multiple format tokens and look like a format string
  // Require at least 2 different format tokens and no regular words
  const formatTokens = ['YYYY', 'YY', 'MM', 'DD', 'HH', 'hh', 'mm', 'ss', 'SSS', 'A', 'a', 'Z', 'ZZ'];
  let tokenCount = 0;
  let testStr = trimmed;
  for (const token of formatTokens) {
    if (testStr.includes(token)) {
      tokenCount++;
      testStr = testStr.replace(new RegExp(token, 'g'), '');
    }
  }
  // If we found 2+ format tokens and what's left is just separators, it's a format
  if (tokenCount >= 2 && /^[\s\-/:.,TW]*$/.test(testStr)) {
    return true;
  }
  
  // ISO date patterns: 2023-12-31, 2023-12-31T12:00:00Z
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(trimmed)) {
    return true;
  }
  
  // Unix timestamp (10 or 13 digits) - only if it's JUST the number
  if (/^\d{10}$/.test(trimmed) || /^\d{13}$/.test(trimmed)) {
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
  
  // Phone number patterns (international)
  if (/^[+]?[\d\s().-]{7,}$/.test(trimmed) && /\d{3,}/.test(trimmed.replace(/\D/g, ''))) {
    return true;
  }
  
  // Credit card patterns (4 groups of 4 digits)
  if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(trimmed)) {
    return true;
  }
  
  // IP addresses (already covered in isUrl, but double-check)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
    return true;
  }
  
  // Port numbers
  if (/^:\d{2,5}$/.test(trimmed)) {
    return true;
  }
  
  // Pure numeric with separators (likely identifiers)
  if (/^\d[\d\s.,'\-]*\d$/.test(trimmed) && trimmed.length >= 5 && !/[a-zA-Z]/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a technical abbreviation
 * Only applies to single words - multi-word text with technical terms is often translatable
 */
function isTechnicalAbbreviation(text) {
  const trimmed = String(text || '').trim();
  // Only check single words
  if (/\s/.test(trimmed)) {
    return false;
  }
  return TECHNICAL_ABBREVIATIONS.has(trimmed.toLowerCase());
}

/**
 * Check if text is a regular expression pattern
 */
function isRegexPattern(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for regex delimiters
  if (/^\/.*\/[gimsuvy]*$/.test(trimmed)) {
    return true;
  }
  
  // Check for regex-like patterns (with special chars)
  if (/[\^\$\*\+\?\.\[\]\(\)\{\}\\|]/.test(trimmed) && trimmed.length >= 3) {
    const specialCharCount = (trimmed.match(/[\^\$\*\+\?\.\[\]\(\)\{\}\\|]/g) || []).length;
    if (specialCharCount >= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if text is a code snippet or expression
 */
function isCodeSnippet(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for function calls
  if (/^[a-z_$][a-z0-9_$]*\s*\([^)]*\)$/i.test(trimmed)) {
    return true;
  }
  
  // Check for variable assignments
  if (/^(const|let|var|int|string|bool|float|double)\s+[a-z_]/i.test(trimmed)) {
    return true;
  }
  
  // Check for object/array literals
  if (/^\{[^}]*:[^}]*\}$/.test(trimmed) || /^\[[^\]]*\]$/.test(trimmed)) {
    return true;
  }
  
  // Check for arrow functions
  if (/=>\s*\{?/.test(trimmed)) {
    return true;
  }
  
  // Check for method chaining
  if (/\.[a-z_$][a-z0-9_$]*\([^)]*\)\.[a-z_$]/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a package name (npm, pip, gem, etc.)
 */
function isPackageName(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // npm scoped packages: @scope/package-name
  if (/^@[a-z0-9-]+\/[a-z0-9-]+$/i.test(trimmed)) {
    return true;
  }
  
  // Regular package names with hyphens (common in npm, pip, gem)
  if (/^[a-z][a-z0-9-]*[a-z0-9]$/i.test(trimmed) && /-/.test(trimmed) && trimmed.length >= 3) {
    return true;
  }
  
  return false;
}

/**
 * Check if text looks like a config sample or documentation snippet
 */
function isConfigSample(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Multi-line config patterns
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  
  if (lines.length >= 2) {
    // Count lines that look like config
    const configLines = lines.filter(line => 
      CONFIG_KEY_VALUE_PATTERN.test(line) ||
      /^\[[^\]]+\]$/.test(line) ||  // INI sections
      /^[a-z_][a-z0-9_.-]*:/i.test(line)  // YAML keys
    );
    
    // If most lines are config, it's a config sample
    if (configLines.length >= lines.length * 0.6) {
      return true;
    }
  }
  
  // Single-line config that's clearly technical
  if (isConfigKeyValue(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is technical content that shouldn't be translated
 * This is the main entry point for technical validation
 * AGGRESSIVE MODE: Catches all technical patterns
 */
function isTechnicalContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Quick reject: obvious prose with no technical markers
  // Use a heuristic approach to detect legitimate English prose
  // Be more permissive with template expressions that are part of mixed content
  let hasTechnicalMarkers = /[<>\[\]@:=\/\\$%^&*|`~]/.test(trimmed);
  const hasTemplateExpressions = /\{\{[^}]*\}\}|<%[^>]*%>|#\{[^}]*\}/.test(trimmed);
  
  // If it has template expressions mixed with substantial text content, don't treat as technical
  if (hasTemplateExpressions) {
    // Remove template expressions and check if substantial text remains
    const withoutTemplates = trimmed
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/<%[^>]*%>/g, '')
      .replace(/#\{[^}]*\}/g, '')
      .trim();
    
    // If at least 30% of the content is actual text (not just placeholders), don't treat as technical
    const totalLength = trimmed.length;
    const textLength = withoutTemplates.length;
    
    if (textLength >= totalLength * 0.3) {
      // Mixed content with substantial text - proceed to normal validation
      // But only for non-Vue template expressions (Vue is handled separately)
      const hasVueExpressions = /\{\{[^}]*\}\}/.test(trimmed);
      const hasOtherTemplates = /<%[^>]*%>|#\{[^}]*\}/.test(trimmed);
      
      if (hasOtherTemplates || (hasVueExpressions && !trimmed.includes('vue'))) {
        hasTechnicalMarkers = false;
      }
    }
  }
  
  if (!hasTechnicalMarkers && !/-{2,}/.test(trimmed)) {
    // Check if it looks like legitimate English prose
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const hasCapitalStart = /^[A-Z]/.test(trimmed);
    const hasEndPunctuation = /[.!?]$/.test(trimmed);
    const hasReasonableWordCount = words.length >= 3 && words.length <= 20;
    // Clean words of punctuation for alpha check
    const cleanWords = words.map(w => w.replace(/[.,!?;:]$/, ''));
    const hasMostlyAlphaWords = cleanWords.filter(w => /^[a-zA-Z]+$/.test(w)).length / cleanWords.length > 0.7;
    
    if (hasCapitalStart && hasEndPunctuation && hasReasonableWordCount && hasMostlyAlphaWords) {
      return false; // This looks like legitimate prose, allow it
    }
  }
  
  // If text has technical markers but also substantial readable content, 
  // check if it's mostly placeholders vs actual text
  if (hasTechnicalMarkers) {
    // Calculate the ratio of placeholder characters to total characters
    const placeholderMatches = [
      ...trimmed.match(/\{\{[^}]+\}\}/g) || [],  // Vue mustache
      ...trimmed.match(/\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g) || [],  // Simple placeholders
      ...trimmed.match(/\$\{[^}]+\}/g) || [],  // Template literals
    ];
    
    const placeholderLength = placeholderMatches.reduce((sum, match) => sum + match.length, 0);
    const totalLength = trimmed.length;
    
    // If less than 30% is placeholders, it's likely readable text with variables
    if (placeholderLength < totalLength * 0.3) {
      return false; // Allow - mostly readable text
    }
  }
  
  // Check for URL
  if (isUrl(trimmed)) {
    return true;
  }
  
  // Check for file path
  if (isFilePath(trimmed)) {
    return true;
  }
  
  // Check for environment variable
  if (isEnvironmentVariable(trimmed)) {
    return true;
  }
  
  // Check for config key-value
  if (isConfigKeyValue(trimmed)) {
    return true;
  }
  
  // Check for config sample
  if (isConfigSample(trimmed)) {
    return true;
  }
  
  // Check for command line argument
  if (isCommandLineArg(trimmed)) {
    return true;
  }
  
  // Check for database connection string
  if (isDatabaseConnectionString(trimmed)) {
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
  
  // Check for regex pattern
  if (isRegexPattern(trimmed)) {
    return true;
  }
  
  // Check for code snippet
  if (isCodeSnippet(trimmed)) {
    return true;
  }
  
  // Check for package name
  if (isPackageName(trimmed)) {
    return true;
  }
  
  // Check for technical abbreviation (single word only)
  if (!/\s/.test(trimmed) && isTechnicalAbbreviation(trimmed)) {
    return true;
  }
  
  // Check for camelCase or snake_case technical identifiers
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(trimmed) || // camelCase
      /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/i.test(trimmed)) {    // snake_case
    return true;
  }
  
  // Check for CONSTANT_CASE (likely constants or env vars)
  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed) && /_/.test(trimmed) && trimmed.length >= 3) {
    return true;
  }
  
  // Check for sentinel-style constants with surrounding underscores and optional trailing punctuation
  // Examples: __CAPACITOR_IS_NATIVE__, __NEXT_DATA__, __DEV__: , __PROD__=
  if (/^_+[A-Z][A-Z0-9_]*_+[:=]?$/.test(trimmed)) {
    return true;
  }
  
  // Check for dot notation (object.property.method)
  if (/^[a-z_$][a-z0-9_$]*(\.[a-z_$][a-z0-9_$]*)+$/i.test(trimmed)) {
    return true;
  }
  
  // Check for namespace notation (Namespace\Class, namespace::function)
  if (/[\\:]:[:\\]/.test(trimmed)) {
    return true;
  }
  
  // Check for generic technical patterns with special characters
  const specialCharCount = (trimmed.match(/[<>{}\[\]@#:=\/\\$%^&*|`~]/g) || []).length;
  if (specialCharCount >= 3 && trimmed.length >= 5) {
    return true;
  }
  
  // Check for underscore prefixes (private methods, special identifiers)
  if (/^_[a-z]/i.test(trimmed) && !/ /.test(trimmed)) {
    return true;
  }
  
  // Check for dollar sign prefixes (jQuery, PHP, shell variables)
  if (/^\$[a-z_]/i.test(trimmed) && !/ /.test(trimmed)) {
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
  isEnvironmentVariable,
  isConfigKeyValue,
  isConfigSample,
  isCommandLineArg,
  isDatabaseConnectionString,
  isUuid,
  isHexColor,
  isQueryString,
  isTechnicalIdentifier,
  isVersionNumber,
  isDateTimeFormat,
  isNumericPattern,
  isTechnicalAbbreviation,
  isRegexPattern,
  isCodeSnippet,
  isPackageName,
  isTechnicalContent,
};