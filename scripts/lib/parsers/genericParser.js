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
const { shouldTranslate } = require('../validators');

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
    // Python string patterns
    const patterns = [
      // f-strings and regular strings
      /(?:f)?["']([^"'\n]{3,100})["']/g,
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
    // First, identify lines that are already i18n-ized
    const lines = content.split('\n');
    const i18nLines = new Set();

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of i18nPatterns) {
        if (pattern.test(lines[i])) {
          i18nLines.add(i);
          break;
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
        if (i18nLines.has(matchLine)) continue;

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
