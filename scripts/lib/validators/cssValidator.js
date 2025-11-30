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
  
  // Pattern: property: value; or property: value
  const match = trimmed.match(/^([a-z-]+)\s*:\s*(.+?);?$/i);
  if (!match) return false;
  
  const property = match[1].toLowerCase();
  const value = match[2].trim();
  
  // Check if it's a known CSS property
  if (CSS_PROPERTIES.has(property)) {
    return true;
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
 * Check if text is a CSS class list (Tailwind, utility classes, etc.)
 * e.g., "flex items-center justify-between", "mt-4 px-2 text-gray-500"
 */
function isCssClassList(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Split by whitespace
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return false;
  
  // Count how many look like CSS classes
  let classLikeCount = 0;
  for (const part of parts) {
    // Tailwind/utility class patterns
    if (/^[a-z]+-[a-z0-9-]+$/i.test(part) ||  // e.g., text-gray-500, mt-4
        /^[a-z]+:[a-z0-9-]+$/i.test(part) ||   // e.g., dark:text-white, sm:flex
        /^-?[a-z]+-\[.+\]$/i.test(part) ||     // e.g., w-[100px], text-[#333]
        /^!?[a-z]+-[a-z0-9-]+$/i.test(part)) { // e.g., !important classes
      classLikeCount++;
    }
  }
  
  // If more than 50% look like CSS classes, it's probably a class list
  return classLikeCount >= parts.length * 0.5 && classLikeCount >= 2;
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
  isCssPropertyDeclaration,
  isCssClassList,
  isCssSelector,
  isCssContent,
  isSpreadsheetReference,
};
