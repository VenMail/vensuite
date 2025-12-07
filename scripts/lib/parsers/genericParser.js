/**
 * Generic Parser
 * 
 * Handles generic text extraction from various file types.
 * Can be extended for Python, Go, C#, and other languages.
 * 
 * This parser uses regex-based extraction for languages without
 * dedicated AST parsers, focusing on string literals that look
 * like user-facing text.
 */

const { BaseParser } = require('./baseParser');
const { shouldTranslate, LOGGING_LINE_PATTERNS } = require('../validators');

class GenericParser extends BaseParser {
  static getExtensions() {
    return ['py', 'go', 'cs', 'java', 'rb', 'php', 'rs', 'swift', 'kt'];
  }

  static getName() {
    return 'Generic (Python, Go, C#, Java, Ruby, PHP, Rust, Swift, Kotlin)';
  }

  /**
   * Parse generic source file content
   * @param {string} content
   * @param {Object} options
   * @returns {Object}
   */
  parse(content, options = {}) {
    const results = {
      items: [],
      stats: { processed: 0, extracted: 0, errors: 0 },
      errors: [],
    };

    if (!content || typeof content !== 'string') {
      return results;
    }

    results.stats.processed = 1;
    const filePath = options.filePath || '';
    const ext = filePath.split('.').pop().toLowerCase();

    // Choose extraction strategy based on file type
    switch (ext) {
      case 'py':
        this.parsePython(content, results);
        break;
      case 'go':
        this.parseGo(content, results);
        break;
      case 'cs':
        this.parseCSharp(content, results);
        break;
      case 'java':
      case 'kt':
        this.parseJavaKotlin(content, results);
        break;
      case 'rb':
        this.parseRuby(content, results);
        break;
      case 'php':
        this.parsePHP(content, results);
        break;
      case 'rs':
        this.parseRust(content, results);
        break;
      case 'swift':
        this.parseSwift(content, results);
        break;
      default:
        this.parseGenericStrings(content, results);
    }

    return results;
  }

  /**
   * Parse Python source
   */
  parsePython(content, results) {
    // Python string patterns (non-f-strings)
    const patterns = [
      // Regular strings (exclude f-strings)
      /(?<!f)["']([^"'\n]{3,100})["']/g,
      // Triple-quoted strings (docstrings often, but can be UI text)
      /"""([^"]{3,200})"""/g,
      /'''([^']{3,200})'''/g,
    ];

    // Common i18n patterns to skip
    const i18nPatterns = [
      /_\s*\(\s*["']/, // _("text")
      /gettext\s*\(\s*["']/, // gettext("text")
      /ngettext\s*\(\s*["']/, // ngettext("text")
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
    
    // Handle f-strings separately to extract the text pattern
    this.extractPythonFStrings(content, results, i18nPatterns);
  }

  /**
   * Extract text from Python f-strings, converting {expr} to placeholders
   * e.g., f"Hello, {name}!" -> "Hello, {name}!"
   */
  extractPythonFStrings(content, results, i18nPatterns) {
    // Match f-strings - handle both single and double quotes, with proper escaping
    // Use two patterns to handle each quote type separately
    // Pattern explanation:
    // f"([^"\\]*(?:\\.[^"\\]*)*)" - double-quoted: matches content that can include single quotes
    // f'([^'\\]*(?:\\.[^'\\]*)*)' - single-quoted: matches content that can include double quotes
    // Both handle escaped quotes properly: f"Hello \"world\"" or f'Hello \'world\''
    const fstringPatterns = [
      /f"([^"\\]*(?:\\.[^"\\]*)*)"/g,  // Double-quoted f-strings
      /f'([^'\\]*(?:\\.[^'\\]*)*)'/g,  // Single-quoted f-strings
    ];

    // Build set of i18n lines
    const lines = content.split('\n');
    const skipLines = new Set();
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of i18nPatterns) {
        if (pattern.test(lines[i])) {
          skipLines.add(i);
          break;
        }
      }
      if (!skipLines.has(i)) {
        for (const logPattern of LOGGING_LINE_PATTERNS) {
          if (logPattern.test(lines[i])) {
            skipLines.add(i);
            break;
          }
        }
      }
    }

    // Process each pattern type
    for (const fstringPattern of fstringPatterns) {
      fstringPattern.lastIndex = 0; // Reset regex state
      let match;
      while ((match = fstringPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length - 1;
        if (skipLines.has(lineNum)) continue;

        let text = match[1].trim();
        if (!text) continue;

        // Unescape escaped characters (e.g., \" -> ", \' -> ', \\ -> \)
        text = text.replace(/\\(.)/g, (match, char) => {
          if (char === 'n') return '\n';
          if (char === 't') return '\t';
          if (char === 'r') return '\r';
          return char; // \" -> ", \' -> ', \\ -> \
        });

        // Replace Python f-string expressions with placeholder syntax
        // {name} stays as {name}, {user.name} -> {userName}, {func()} -> {value}
        text = text.replace(/\{([^}]+)\}/g, (m, expr) => {
          expr = expr.trim();
          // Simple identifier
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
            return `{${expr}}`;
          }
          // Attribute access: obj.attr -> objAttr
          if (/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
            const parts = expr.split('.');
            return `{${parts[0]}${parts[1].charAt(0).toUpperCase()}${parts[1].slice(1)}}`;
          }
          // Complex expression - use generic placeholder
          return '{value}';
        });

        if (shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
          results.items.push({
            type: 'string',
            text,
            kind: 'text',
          });
          results.stats.extracted++;
        }
      }
    }
  }

  /**
   * Parse Go source
   */
  parseGo(content, results) {
    const patterns = [
      // Double-quoted strings
      /"([^"\n]{3,100})"/g,
      // Backtick strings (raw strings)
      /`([^`]{3,200})`/g,
    ];

    // Go i18n patterns
    const i18nPatterns = [
      /i18n\.T\s*\(\s*"/, // i18n.T("text")
      /localizer\.Localize\s*\(/, // localizer.Localize
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
    
    // Also extract from struct tags (label, error, description tags)
    this.extractGoStructTags(content, results);
  }

  /**
   * Extract user-facing strings from Go struct tags
   * e.g., `label:"User Name"` or `error:"Invalid email"`
   */
  extractGoStructTags(content, results) {
    // Match struct tags with user-facing content
    const tagPatterns = [
      /\blabel:"([^"]{3,100})"/g,
      /\berror:"([^"]{3,100})"/g,
      /\bdescription:"([^"]{3,100})"/g,
      /\bmessage:"([^"]{3,100})"/g,
      /\bplaceholder:"([^"]{3,100})"/g,
      /\btitle:"([^"]{3,100})"/g,
    ];

    for (const pattern of tagPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1].trim();
        if (!text) continue;

        if (shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
          results.items.push({
            type: 'string',
            text,
            kind: 'text',
          });
          results.stats.extracted++;
        }
      }
    }
  }

  /**
   * Parse C# source
   */
  parseCSharp(content, results) {
    const patterns = [
      // Regular strings
      /"([^"\n]{3,100})"/g,
      // Verbatim strings
      /@"([^"]{3,200})"/g,
      // Interpolated strings (extract static parts)
      /\$"([^"{]+)"/g,
    ];

    // C# i18n patterns
    const i18nPatterns = [
      /Resources\.[A-Z]/, // Resources.SomeKey
      /\.GetString\s*\(\s*"/, // .GetString("key")
      /Localizer\s*\[\s*"/, // Localizer["key"]
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
  }

  /**
   * Parse Java/Kotlin source
   */
  parseJavaKotlin(content, results) {
    const patterns = [
      // Double-quoted strings
      /"([^"\n]{3,100})"/g,
    ];

    // Java/Kotlin i18n patterns
    const i18nPatterns = [
      /getString\s*\(\s*R\.string\./, // getString(R.string.key)
      /resources\.getString\s*\(/, // resources.getString
      /MessageFormat\.format\s*\(/, // MessageFormat.format
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
  }

  /**
   * Parse Ruby source
   */
  parseRuby(content, results) {
    const patterns = [
      // Double-quoted strings
      /"([^"\n]{3,100})"/g,
      // Single-quoted strings
      /'([^'\n]{3,100})'/g,
    ];

    // Ruby i18n patterns
    const i18nPatterns = [
      /I18n\.t\s*\(\s*["']/, // I18n.t("key")
      /t\s*\(\s*["']:/, // t(:key) or t("key")
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
  }

  /**
   * Parse PHP source (non-Blade)
   */
  parsePHP(content, results) {
    const patterns = [
      // Double-quoted strings
      /"([^"\n]{3,100})"/g,
      // Single-quoted strings
      /'([^'\n]{3,100})'/g,
    ];

    // PHP i18n patterns
    const i18nPatterns = [
      /__\s*\(\s*["']/, // __("text")
      /trans\s*\(\s*["']/, // trans("text")
      /@lang\s*\(\s*["']/, // @lang("text")
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
  }

  /**
   * Parse Rust source
   */
  parseRust(content, results) {
    const patterns = [
      // Double-quoted strings
      /"([^"\n]{3,100})"/g,
      // Raw strings
      /r#"([^"]{3,200})"#/g,
    ];

    const i18nPatterns = [
      /t!\s*\(\s*"/, // t!("text")
      /fl!\s*\(\s*"/, // fl!("text") - fluent
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
  }

  /**
   * Parse Swift source
   */
  parseSwift(content, results) {
    const patterns = [
      // Double-quoted strings
      /"([^"\n]{3,100})"/g,
      // Multi-line strings
      /"""([^"]{3,200})"""/g,
    ];

    const i18nPatterns = [
      /NSLocalizedString\s*\(\s*"/, // NSLocalizedString("text")
      /String\s*\(\s*localized:\s*"/, // String(localized: "text")
    ];

    this.extractStrings(content, patterns, i18nPatterns, results);
  }

  /**
   * Generic string extraction
   */
  parseGenericStrings(content, results) {
    const patterns = [
      /"([^"\n]{3,100})"/g,
      /'([^'\n]{3,100})'/g,
    ];

    this.extractStrings(content, patterns, [], results);
  }

  /**
   * Extract strings using patterns
   */
  extractStrings(content, patterns, i18nPatterns, results) {
    // First, identify lines that are already i18n-ized or are logging/debug lines
    const lines = content.split('\n');
    const skipLines = new Set();

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of i18nPatterns) {
        if (pattern.test(lines[i])) {
          skipLines.add(i);
          break;
        }
      }

      // Skip logging/debug statements
      if (!skipLines.has(i)) {
        for (const logPattern of LOGGING_LINE_PATTERNS) {
          if (logPattern.test(lines[i])) {
            skipLines.add(i);
            break;
          }
        }
      }
    }

    // Extract strings
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1].trim();
        if (!text) continue;

        // Check if this match is on an i18n line
        const matchLine = content.substring(0, match.index).split('\n').length - 1;
        if (skipLines.has(matchLine)) continue;

        // Validate the text
        if (shouldTranslate(text, { ignorePatterns: this.ignorePatterns })) {
          results.items.push({
            type: 'string',
            text,
            kind: 'text',
          });
          results.stats.extracted++;
        }
      }
    }
  }
}

module.exports = { GenericParser };
