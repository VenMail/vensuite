/**
 * CSS Content Validator
 * Detects CSS properties, values, selectors, and style-related patterns
 * that should NOT be translated.
 */

// CSS property names (comprehensive list)
const CSS_PROPERTIES = new Set([
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
  'z-index', 'overflow', 'overflow-x', 'overflow-y', 'visibility', 'clip',
  // Flexbox
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content',
  'align-items', 'align-content', 'align-self', 'flex-grow', 'flex-shrink',
  'flex-basis', 'order', 'gap', 'row-gap', 'column-gap',
  // Grid
  'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
  'grid-template-areas', 'grid-column', 'grid-row', 'grid-area', 'grid-gap',
  'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow', 'place-items',
  'place-content', 'place-self',
  // Box Model
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'box-sizing', 'box-shadow', 'outline', 'outline-width', 'outline-style',
  'outline-color', 'outline-offset',
  // Typography
  'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-decoration',
  'text-transform', 'text-indent', 'text-shadow', 'white-space', 'word-wrap',
  'word-break', 'text-overflow', 'vertical-align', 'writing-mode',
  // Colors & Backgrounds
  'color', 'background', 'background-color', 'background-image', 'background-repeat',
  'background-position', 'background-size', 'background-attachment', 'background-clip',
  'background-origin', 'opacity', 'filter', 'backdrop-filter',
  // Transforms & Animations
  'transform', 'transform-origin', 'transition', 'transition-property',
  'transition-duration', 'transition-timing-function', 'transition-delay',
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',
  // Other
  'cursor', 'pointer-events', 'user-select', 'resize', 'content', 'quotes',
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
  'table-layout', 'border-collapse', 'border-spacing', 'caption-side',
  'empty-cells', 'object-fit', 'object-position', 'aspect-ratio',
  'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align',
]);

// CSS value keywords
const CSS_VALUE_KEYWORDS = new Set([
  // Display values
  'none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid',
  'inline-grid', 'table', 'table-row', 'table-cell', 'contents', 'flow-root',
  // Position values
  'static', 'relative', 'absolute', 'fixed', 'sticky',
  // Flex/Grid values
  'row', 'column', 'row-reverse', 'column-reverse', 'wrap', 'nowrap',
  'wrap-reverse', 'start', 'end', 'center', 'space-between', 'space-around',
  'space-evenly', 'stretch', 'baseline', 'auto', 'initial', 'inherit', 'unset',
  // Text values
  'left', 'right', 'center', 'justify', 'uppercase', 'lowercase', 'capitalize',
  'underline', 'overline', 'line-through', 'blink',
  // Overflow values
  'visible', 'hidden', 'scroll', 'clip',
  // Font values
  'normal', 'bold', 'bolder', 'lighter', 'italic', 'oblique',
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  // Border values
  'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset',
  // Other
  'pointer', 'default', 'text', 'move', 'not-allowed', 'grab', 'grabbing',
  'transparent', 'currentColor', 'cover', 'contain', 'fill', 'scale-down',
]);

// CSS unit patterns
const CSS_UNIT_PATTERN = /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|fr|deg|rad|turn|s|ms)$/i;

// CSS color patterns
const CSS_COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgba?\s*\([^)]+\)|hsla?\s*\([^)]+\)|transparent|currentColor)$/i;

// CSS function patterns
const CSS_FUNCTION_PATTERN = /^(url|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient|calc|var|min|max|clamp|rgb|rgba|hsl|hsla|translate|translateX|translateY|translateZ|translate3d|rotate|rotateX|rotateY|rotateZ|rotate3d|scale|scaleX|scaleY|scaleZ|scale3d|skew|skewX|skewY|matrix|matrix3d|perspective|cubic-bezier|steps|attr|counter|counters|env|minmax|repeat|fit-content)\s*\(/i;

/**
 * Check if text looks like a CSS property declaration
 * e.g., "width: 100px;", "background-color: #fff"
 */
function isCssPropertyDeclaration(text) {
  const trimmed = String(text || '').trim();
  
  // Quick reject: if it looks like a sentence with spaces and no CSS indicators
  if (/\s+[a-z]+\s+/i.test(trimmed) && !/;$/.test(trimmed) && !/^[a-z-]+\s*:\s*[a-z0-9#(]/i.test(trimmed)) {
    return false;
  }
  
  // Pattern: property: value; or property: value
  // Must be the ENTIRE string, not just contain a colon
  const match = trimmed.match(/^([a-z-]+)\s*:\s*(.+?);?$/i);
  if (!match) return false;
  
  const property = match[1].toLowerCase();
  const value = match[2].trim();

  if (CSS_PROPERTIES.has(property)) {
    const hasNestedDeclarations = /[a-z-]+\s*:\s*[^;]+;/.test(value);
    const hasInlineHexOrUnit = /#[0-9a-f]{3,8}\b/i.test(value) || /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|fr|deg|rad|turn|s|ms)\b/i.test(value);
    const hasCssKeywordsOrFunctions =
      CSS_UNIT_PATTERN.test(value) ||
      CSS_COLOR_PATTERN.test(value) ||
      CSS_VALUE_KEYWORDS.has(value.toLowerCase()) ||
      CSS_FUNCTION_PATTERN.test(value);
    const hasMultiDeclSemicolons = value.includes(';');

    if (hasNestedDeclarations || hasMultiDeclSemicolons || hasInlineHexOrUnit || hasCssKeywordsOrFunctions) {
      return true;
    }
  }

  // If the value contains multiple words without CSS indicators, it's probably not CSS
  const words = value.split(/\s+/);
  if (words.length > 3 && !CSS_UNIT_PATTERN.test(value) && !CSS_COLOR_PATTERN.test(value)) {
    return false;
  }
  
  // Check if value looks like CSS (units, colors, keywords)
  if (CSS_UNIT_PATTERN.test(value) || 
      CSS_COLOR_PATTERN.test(value) ||
      CSS_VALUE_KEYWORDS.has(value.toLowerCase()) ||
      CSS_FUNCTION_PATTERN.test(value)) {
    return true;
  }
  
  // Check for placeholder patterns in CSS values like {rowHeight}px
  if (/\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(value) && 
      /(?:px|em|rem|%|vh|vw|deg|s|ms);?$/.test(value)) {
    return true;
  }
  
  return false;
}

/**
 * Common English words/phrases that should NOT be treated as CSS classes
 * even if they partially match CSS patterns
 */
const ENGLISH_NOT_CSS = new Set([
  // Common words that might look like Tailwind but are English
  'text', 'hidden', 'visible', 'block', 'inline', 'flex', 'grid', 'relative', 'absolute', 'fixed', 'sticky', 'static',
  'left', 'right', 'top', 'bottom', 'center', 'start', 'end',
  'small', 'medium', 'large', 'primary', 'secondary', 'success', 'warning', 'danger', 'error', 'info',
  'bold', 'italic', 'underline', 'uppercase', 'lowercase', 'capitalize',
  'disabled', 'active', 'inactive', 'selected', 'focused', 'hover',
  'container', 'wrapper', 'content', 'header', 'footer', 'sidebar', 'main',
  'row', 'column', 'item', 'items', 'list', 'table', 'form', 'input', 'button',
  'none', 'auto', 'full', 'empty', 'loading', 'error', 'pending',
  // Multi-word phrases that might look CSS-ish
  'no items', 'no results', 'not found', 'loading items', 'error loading',
]);

/**
 * Check if text looks like English phrase that might be confused with CSS
 */
function isEnglishNotCss(text) {
  const lower = String(text || '').toLowerCase().trim();
  
  // Direct match
  if (ENGLISH_NOT_CSS.has(lower)) {
    return true;
  }
  const hasUtilityPrefixIndicators = /\b(?:items|justify|content|place|self|bg|text|font|leading|tracking|border|rounded|shadow|ring|outline|opacity|z|inset|top|right|bottom|left|overflow|cursor|transition|duration|delay|ease|space|gap|grid|flex|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min-w|max-w|min-h|max-h)-[a-z0-9]/i.test(lower);
  const hasCssIndicators = /-\d|hover:|focus:|active:|disabled:|sm:|md:|lg:|xl:|2xl:|dark:|\[|\]|\//.test(lower) || hasUtilityPrefixIndicators;
  if (hasCssIndicators) {
    return false;
  }
  
  // Check for sentence-like patterns (multiple words with articles, prepositions, etc.)
  const sentenceIndicators = /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|to|for|of|in|on|at|by|with|from|into|through|during|before|after|above|below|between|under|over|out|up|down|off|about|against|along|among|around|as|behind|beside|besides|beyond|but|despite|except|inside|near|outside|since|than|toward|towards|until|upon|within|without|and|or|not|no|yes|all|any|both|each|every|few|many|more|most|much|other|some|such|these|those|this|that|what|which|who|whom|whose|how|when|where|why|if|then|else|because|although|though|unless|while|so|yet|now|just|only|also|even|still|already|always|never|often|sometimes|usually|very|too|quite|rather|really|almost|nearly|perhaps|maybe|probably|certainly|definitely|obviously|clearly|simply|actually|basically|essentially|generally|specifically|particularly|especially|mainly|mostly|largely|entirely|completely|totally|fully|partly|partially|slightly|somewhat|highly|extremely|incredibly|absolutely)\b/i;
  
  if (sentenceIndicators.test(lower)) {
    return true;
  }
  
  // If it has 3+ words and no CSS-specific patterns, likely English
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 3) {
    const hasCssIndicators = /-\d|hover:|focus:|sm:|md:|lg:|xl:|dark:|\/\d|^\[|^\!|^@|^\./.test(text) || hasUtilityPrefixIndicators;
    if (!hasCssIndicators) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a single token looks like a CSS utility class
 * Detects CSS patterns from any framework
 */
function isSingleCssClass(part) {
  // Empty strings are not classes
  if (!part) return false;
  
  const lower = part.toLowerCase();

  const cssKeywords = [
    'flex', 'grid', 'block', 'inline', 'hidden', 'visible', 'absolute', 'relative', 'fixed', 'sticky', 'static',
    'container', 'wrapper', 'row', 'col', 'column', 'centered', 'center',
    'prose', 'truncate', 'ellipsis', 'break', 'wrap', 'nowrap',
    'bold', 'italic', 'underline', 'uppercase', 'lowercase', 'capitalize',
    'rounded', 'circle', 'square', 'full', 'none', 'auto',
    'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark',
    'small', 'medium', 'large', 'xlarge', 'xs', 'sm', 'md', 'lg', 'xl',
    'disabled', 'active', 'inactive', 'selected', 'hovered', 'focused',
    'group', 'peer', 'isolate', 'inset', 'outline', 'ring', 'sr-only', 'not-sr-only',
  ];
  
  if (cssKeywords.includes(lower)) {
    return true;
  }

  if (isEnglishNotCss(part)) {
    return false;
  }
  
  // Common CSS framework prefixes/patterns
  const cssFrameworkPrefixes = [
    // Tailwind
    'p-', 'm-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
    'w-', 'h-', 'min-w-', 'max-w-', 'min-h-', 'max-h-',
    'text-', 'font-', 'leading-', 'tracking-', 'space-',
    'bg-', 'border-', 'rounded-', 'shadow-',
    'flex-', 'grid-', 'gap-', 'items-', 'justify-', 'self-', 'place-',
    'top-', 'right-', 'bottom-', 'left-', 'inset-',
    'z-', 'opacity-', 'cursor-', 'pointer-events-',
    'overflow-', 
    'hover:', 'focus:', 'active:', 'dark:', 'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    'prose', 'divide-', 'ring-',
    // Bootstrap
    'btn-', 'alert-', 'badge-', 'card-', 'nav-', 'navbar-', 'form-', 'input-',
    'col-', 'row-', 'offset-', 'order-', 'd-',
    'ms-', 'me-',
    // Material UI / MUI
    'mui', 'makeStyles', 'withStyles',
    // Bulma
    'is-', 'has-',
    // Foundation
    'small-', 'medium-', 'large-',
    // Semantic UI
    'ui ', 'labeled',
    // Tachyons
    'pa', 'ma', 'ba', 'br', 'dib', 'dn', 'db',
    // CSS Modules patterns
    'styles.', 'css.',
  ];
  
  // Check for known framework prefixes
  for (const prefix of cssFrameworkPrefixes) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) {
      return true;
    }
  }
  
  // 1. ANY hyphenated pattern with numbers, colors, or size indicators
  //    e.g., p-4, mt-2, text-gray-500, p-1.5, bg-blue-600, w-full
  //    Allow decimal and fractional numeric segments (1.5, 50/90, etc.).
  if (/^-?[a-z]+(?:-[a-z0-9.\/:%]+)+$/i.test(part)) {
    // Contains common CSS value indicators
    if (/\d+|full|auto|none|start|end|center|stretch|between|around|evenly|primary|secondary|success|danger|warning|info|light|dark|white|black|gray|grey|red|blue|green|yellow|purple|pink|indigo|teal|orange|cyan|amber|lime|emerald|sky|violet|fuchsia|rose/i.test(part)) {
      return true;
    }
    // Has typical CSS property prefixes
    if (/^(p|m|w|h|min|max|text|font|bg|border|flex|grid|gap|space|divide|ring|shadow|opacity|z|top|left|right|bottom|inset|rounded|cursor|overflow|display|position|items|justify|align|self|place|content|order|grow|shrink|basis|col|row|aspect|object|decoration|transform|transition|duration|delay|ease|animate|scale|rotate|translate|skew|origin|filter|backdrop|brightness|contrast|blur|saturate|hue)-/i.test(part)) {
      return true;
    }
  }
  
  // 2. Arbitrary value classes with brackets (any framework)
  //    e.g., w-[100px], text-[#333], p-[1.5rem], [&>*]:
  if (/[\[\]]/.test(part)) {
    return true;
  }
  
  // 3. Variant/modifier prefixes with colons (Tailwind, custom frameworks)
  //    e.g., dark:text-white, sm:flex, hover:bg-blue-500, prose-a:text-primary-600
  if (/:/.test(part)) {
    const segments = part.split(':');
    // If any segment looks like a CSS pattern, it's likely a class
    if (segments.some(seg => /^[a-z]+(?:-[a-z0-9]+)*$/i.test(seg))) {
      return true;
    }
  }
  
  // 4. Important modifier (any framework)
  //    e.g., !text-white, !important, !m-0
  if (/^!/.test(part)) {
    return true;
  }
  
  // 5. Fractional values (Tailwind, custom)
  //    e.g., w-1/2, w-1/3, w-2/3, grid-cols-1/3
  if (/\/\d+/.test(part)) {
    return true;
  }
  
  // 6. Underscore-based naming (BEM, CSS Modules)
  //    e.g., button_primary, card__header, nav__item--active
  if (/__/.test(part) || /--/.test(part)) {
    return true;
  }
  
  // 7. camelCase or PascalCase with CSS-related words
  //    e.g., flexContainer, gridItem, textPrimary, buttonLarge
  if (/^[a-z]+[A-Z]/.test(part)) {
    if (/flex|grid|text|font|color|background|border|margin|padding|width|height|display|position|container|wrapper|button|card|nav|header|footer|sidebar|main|content|item|element|component/i.test(part)) {
      return true;
    }
  }
  
  // 9. Numeric suffixes with common patterns
  //    e.g., mb3, p2, w100, h50, text16
  if (/^[a-z]{1,4}\d+$/i.test(part) && part.length <= 8) {
    return true;
  }
  
  // 10. Starts with common CSS abbreviations followed by number or hyphen
  //    e.g., p4, m2, w50, h100
  if (/^(p|m|w|h|t|r|b|l|x|y|z|fs|fw|lh|ta|td|tt|va|ws|wb|ww|op|cur|pos|dis|flo|clr|vis|ovf|zi)\d+/i.test(part)) {
    return true;
  }
  
  // 11. Contains common color names as suffix or segment
  if (/(red|blue|green|yellow|purple|pink|orange|gray|grey|black|white|indigo|teal|cyan|amber|lime|emerald|sky|violet|fuchsia|rose|primary|secondary|success|danger|warning|info|light|dark)(-\d+)?$/i.test(part)) {
    return true;
  }
  
  // 12. Percentage-based or viewport-based naming
  //    e.g., w-100p, h-50vh, max-w-screen
  if (/(vh|vw|vmin|vmax|screen|full|fit|min|max)(?:-|$)/i.test(part)) {
    return true;
  }
  
  return false;
}
/**
 * Check if text is a CSS class list (Tailwind, utility classes, etc.)
 * e.g., "flex items-center justify-between", "mt-4 px-2 text-gray-500"
 */
function isCssClassList(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // FIRST: Check if this looks like English that shouldn't be treated as CSS
  if (isEnglishNotCss(trimmed)) {
    return false;
  }
  
  // Quick reject for obvious English sentences
  // Sentences typically have: capital start, multiple words, end punctuation
  if (/^[A-Z][a-z]+(\s+[a-z]+)+[.!?]?$/.test(trimmed)) {
    return false;
  }
  
  // Quick pattern checks before splitting (performance optimization)
  const quickPatterns = [
    /-\d+/,                        // Contains hyphen-number pattern (very common in CSS)
    /:/,                           // Contains colons (variants/pseudo-classes)
    /\[.*\]/,                      // Contains brackets (arbitrary values)
    /^!/,                          // Starts with ! (important)
  ];
  
  const hasQuickPattern = quickPatterns.some(pattern => pattern.test(trimmed));
  
  // Split by whitespace
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return false;

  // Ignore placeholder-like tokens such as {classX}, {{value}}, ${expr}
  const placeholderPattern = /^\{\{?[^}]+\}?\}$|^\$\{[^}]+\}$/;
  const cssParts = parts.filter(p => !placeholderPattern.test(p));
  if (cssParts.length === 0) return false;
  
  // For a single non-placeholder token, be strict
  if (cssParts.length === 1) {
    return isSingleCssClass(cssParts[0]);
  }
  
  // Multi-word: if it looks like a natural sentence, reject it
  // Check for common English word patterns
  const englishWordCount = cssParts.filter(p => {
    const lower = p.toLowerCase();
    // Common English words that aren't CSS
    return /^(the|a|an|is|are|was|were|be|have|has|had|do|does|did|will|would|could|should|may|might|to|for|of|in|on|at|by|with|from|and|or|not|no|yes|all|any|if|then|else|so|but|this|that|these|those|it|its|your|my|our|their|his|her|we|you|they|i|me|him|them|us|what|which|who|how|when|where|why|please|thank|sorry|help|click|submit|save|cancel|delete|edit|view|add|remove|update|create|new|old|first|last|next|back|more|less|show|hide|open|close)$/.test(lower);
  }).length;
  
  // If more than 30% of words are common English words, it's probably not CSS
  if (englishWordCount >= cssParts.length * 0.3 && cssParts.length >= 3) {
    return false;
  }
  
  // Count how many non-placeholder tokens look like CSS classes
  let classLikeCount = 0;
  for (const part of cssParts) {
    if (isSingleCssClass(part)) {
      classLikeCount++;
    }
  }
  
  // If all non-placeholder tokens look like CSS classes, it's definitely a class list
  if (classLikeCount === cssParts.length && cssParts.length > 0) {
    return true;
  }
  
  // If we have a quick pattern match and majority of non-placeholder tokens are CSS-like, accept it
  if (hasQuickPattern && classLikeCount >= cssParts.length * 0.7) {
    return true;
  }
  
  // If more than 80% of non-placeholder tokens look like CSS classes and we have at least 2, it's probably a class list
  if (classLikeCount >= cssParts.length * 0.8 && classLikeCount >= 2) {
    return true;
  }
  
  // Edge case: If we have 2+ non-placeholder tokens and they ALL match hyphen-number pattern
  if (cssParts.length >= 2 && cssParts.every(p => /-\d/.test(p))) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a CSS selector
 * e.g., ".class-name", "#id", "div > span", "[data-attr]"
 */
function isCssSelector(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // CSS selector patterns
  return /^[.#\[\*]/.test(trimmed) ||  // Starts with ., #, [, or *
         /^[a-z]+\s*[>+~]/.test(trimmed) ||  // Combinators
         /\[[a-z-]+(?:=|~=|\|=|\^=|\$=|\*=)?/.test(trimmed);  // Attribute selectors
}

/**
 * Check if text contains only CSS-related content
 * This is the main entry point for CSS validation
 */
function isCssContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Quick reject: if it contains typical sentence markers, it's probably not CSS
  // BUT be lenient - only reject obvious prose
  if (/^[A-Z][a-z]+\s+[a-z]+.*[.!?]$/.test(trimmed) && !/[:{\[\-]/.test(trimmed)) {
    return false;
  }
  
  // Check for CSS property declaration
  if (isCssPropertyDeclaration(trimmed)) {
    return true;
  }
  
  // Check for CSS class list
  if (isCssClassList(trimmed)) {
    return true;
  }
  
  // Check for CSS selector
  if (isCssSelector(trimmed)) {
    return true;
  }
  
  // Check for CSS rule blocks
  if (/\{[^}]*:[^;]+;[^}]*\}/.test(trimmed)) {
    return true;
  }

  // Check for multiple CSS declarations (inline styles)
  if (/^([a-z-]+\s*:\s*[^;]+;\s*)+$/i.test(trimmed)) {
    return true;
  }
  
  // Check for CSS value with placeholders like "height: {rowHeight}px;"
  if (/^[a-z-]+\s*:\s*\{[a-zA-Z_][a-zA-Z0-9_]*\}[a-z%]*;?$/i.test(trimmed)) {
    return true;
  }
  
  // Check for CSS custom properties / CSS variables
  if (/--[a-z-]+/.test(trimmed)) {
    return true;
  }
  
  // Check for @-rules (media queries, keyframes, etc.)
  if (/^@(media|keyframes|supports|import|font-face|page|charset|namespace)/i.test(trimmed)) {
    return true;
  }
  
  // Check for pseudo-classes and pseudo-elements
  if (/:(?:hover|focus|active|visited|link|before|after|first-child|last-child|nth-child|not|has|where|is)\b/.test(trimmed)) {
    return true;
  }
  
  // Check for attribute selectors
  if (/\[[a-z-]+(?:[~|^$*]?=)?[^\]]*\]/i.test(trimmed)) {
    return true;
  }
  
  // Check for combinator patterns (>, +, ~)
  if (/[a-z0-9_-]+\s*[>+~]\s*[a-z0-9_-]+/i.test(trimmed)) {
    return true;
  }
  
  // Check for calc(), var(), rgb(), etc. functions
  if (CSS_FUNCTION_PATTERN.test(trimmed)) {
    return true;
  }
  
  // Check for color codes
  if (CSS_COLOR_PATTERN.test(trimmed)) {
    return true;
  }
  
  // Check for CSS units
  if (CSS_UNIT_PATTERN.test(trimmed)) {
    return true;
  }
  
  // Check for viewport units or percentage-only values
  if (/^\d+(?:\.\d+)?(?:vh|vw|vmin|vmax|%)$/.test(trimmed)) {
    return true;
  }
  
  // Check for CSS Grid template syntax
  if (/repeat\s*\(\s*\d+\s*,/.test(trimmed) || /minmax\s*\(/.test(trimmed)) {
    return true;
  }
  
  // Check for multiple values separated by commas (font families, shadows, etc.)
  if (/^[a-z0-9-]+(?:\s+[a-z0-9-]+)*(?:,\s*[a-z0-9-]+(?:\s+[a-z0-9-]+)*)+$/i.test(trimmed)) {
    return true;
  }
  
  // Check if it looks like a CSS value list (space or comma separated)
  const tokens = trimmed.split(/[\s,]+/);
  if (tokens.length >= 2) {
    const cssValueTokens = tokens.filter(token => 
      CSS_UNIT_PATTERN.test(token) || 
      CSS_VALUE_KEYWORDS.has(token.toLowerCase()) ||
      CSS_COLOR_PATTERN.test(token) ||
      /^\d+$/.test(token) ||
      token === 'auto' || token === 'inherit' || token === 'initial'
    );
    // If most tokens look like CSS values, it's probably CSS
    if (cssValueTokens.length >= tokens.length * 0.6) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if text looks like a spreadsheet cell reference
 * e.g., "R{row}C{col}", "R1C1", "A1:B10"
 */
function isSpreadsheetReference(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // R1C1 style references with placeholders
  if (/^R\{?[a-zA-Z0-9_]+\}?C\{?[a-zA-Z0-9_]+\}?$/i.test(trimmed)) {
    return true;
  }
  
  // A1 style references
  if (/^[A-Z]+\d+(?::[A-Z]+\d+)?$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

module.exports = {
  CSS_PROPERTIES,
  CSS_VALUE_KEYWORDS,
  ENGLISH_NOT_CSS,
  isCssPropertyDeclaration,
  isCssClassList,
  isCssSelector,
  isCssContent,
  isSpreadsheetReference,
  isSingleCssClass,
  isEnglishNotCss,
};