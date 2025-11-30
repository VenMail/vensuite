/**
 * HTML/Template Validator
 * Detects HTML attributes, Vue directives, and template syntax
 * that should NOT be translated.
 */

// HTML attributes that should never have their values translated
const NON_TRANSLATABLE_ATTRIBUTES = new Set([
  // Core attributes
  'id', 'class', 'style', 'name', 'type', 'value', 'href', 'src', 'action',
  'method', 'target', 'rel', 'for', 'form', 'formaction', 'formmethod',
  'formtarget', 'formenctype', 'formnovalidate',
  // Data attributes
  'data-*', // Handled separately
  // Event handlers
  'onclick', 'onchange', 'onsubmit', 'onload', 'onerror', 'onfocus', 'onblur',
  'onkeydown', 'onkeyup', 'onkeypress', 'onmousedown', 'onmouseup', 'onmouseover',
  'onmouseout', 'onmousemove', 'ondrag', 'ondrop', 'onscroll', 'onresize',
  // Vue directives
  'v-if', 'v-else', 'v-else-if', 'v-show', 'v-for', 'v-on', 'v-bind', 'v-model',
  'v-slot', 'v-pre', 'v-cloak', 'v-once', 'v-memo', 'v-html', 'v-text',
  // Vue shorthand prefixes (handled separately)
  '@', ':', '#',
  // React attributes
  'key', 'ref', 'dangerouslySetInnerHTML',
  // Angular attributes
  'ngIf', 'ngFor', 'ngSwitch', 'ngModel', 'ngClass', 'ngStyle',
  // Technical attributes
  'autocomplete', 'autofocus', 'disabled', 'readonly', 'required', 'checked',
  'selected', 'multiple', 'hidden', 'draggable', 'contenteditable', 'spellcheck',
  'tabindex', 'accesskey', 'dir', 'lang', 'translate',
  // Media attributes
  'width', 'height', 'autoplay', 'controls', 'loop', 'muted', 'preload',
  'poster', 'crossorigin', 'loading', 'decoding', 'fetchpriority',
  // Form attributes
  'accept', 'accept-charset', 'enctype', 'max', 'maxlength', 'min', 'minlength',
  'pattern', 'size', 'step', 'cols', 'rows', 'wrap',
  // ARIA attributes (some are translatable, handled separately)
  'role', 'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-checked',
  'aria-disabled', 'aria-readonly', 'aria-required', 'aria-invalid',
  'aria-busy', 'aria-live', 'aria-atomic', 'aria-relevant', 'aria-haspopup',
  'aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns',
  'aria-flowto', 'aria-posinset', 'aria-setsize', 'aria-level', 'aria-colcount',
  'aria-colindex', 'aria-colspan', 'aria-rowcount', 'aria-rowindex', 'aria-rowspan',
  'aria-activedescendant', 'aria-errormessage', 'aria-details', 'aria-keyshortcuts',
  'aria-roledescription', 'aria-orientation', 'aria-sort', 'aria-valuemax',
  'aria-valuemin', 'aria-valuenow', 'aria-valuetext', 'aria-autocomplete',
  'aria-multiline', 'aria-multiselectable', 'aria-pressed', 'aria-current',
  'aria-dropeffect', 'aria-grabbed', 'aria-modal',
]);

// Attributes that SHOULD be translated
const TRANSLATABLE_ATTRIBUTES = new Set([
  'title', 'alt', 'placeholder', 'label', 'aria-label', 'aria-description',
  'aria-placeholder', 'aria-valuetext',
]);

// Vue directive patterns that indicate non-translatable content
const VUE_DIRECTIVE_PATTERNS = [
  /^v-[a-z]+/,           // v-if, v-show, v-for, etc.
  /^@[a-z]+/,            // @click, @change, etc.
  /^:[a-z]+/,            // :class, :style, :href, etc.
  /^#[a-z]+/,            // #default, #header, etc.
];

/**
 * Check if an attribute name indicates non-translatable content
 */
function isNonTranslatableAttribute(attrName) {
  const name = String(attrName || '').toLowerCase().trim();
  if (!name) return true;
  
  // Check direct match
  if (NON_TRANSLATABLE_ATTRIBUTES.has(name)) {
    return true;
  }
  
  // Check data-* attributes
  if (name.startsWith('data-')) {
    return true;
  }
  
  // Check Vue directive patterns
  for (const pattern of VUE_DIRECTIVE_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  // Check event handler patterns
  if (/^on[A-Z]/.test(attrName) || /^@/.test(attrName)) {
    return true;
  }
  
  // Check binding patterns
  if (/^:/.test(attrName) || /^v-bind:/.test(attrName)) {
    return true;
  }
  
  return false;
}

/**
 * Check if an attribute name indicates translatable content
 */
function isTranslatableAttribute(attrName) {
  const name = String(attrName || '').toLowerCase().trim();
  return TRANSLATABLE_ATTRIBUTES.has(name);
}

/**
 * Check if text looks like an HTML attribute fragment
 * e.g., 'class="foo"', 'v-if="condition"', '@click="handler"'
 */
function isHtmlAttributeFragment(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Pattern: attribute="value" or attribute='value'
  if (/^[a-zA-Z@:#][a-zA-Z0-9_:-]*\s*=\s*["'][^"']*["']/.test(trimmed)) {
    return true;
  }
  
  // Pattern: just the value part with quotes and closing bracket
  // e.g., 'value ? null : closeShareModal()">'
  if (/^[^"']*["']\s*\/?>/.test(trimmed)) {
    return true;
  }
  
  // Pattern: attribute value ending with "> or "/>
  if (/["']\s*\/?>$/.test(trimmed) && !/\s/.test(trimmed.replace(/["']\s*\/?>$/, ''))) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a Vue template expression (mustache syntax)
 * e.g., "{{ user.name }}", "{{ formatDate(date) }}"
 */
function isVueTemplateExpression(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for mustache syntax
  if (/^\{\{[^}]+\}\}$/.test(trimmed)) {
    return true;
  }
  
  // Check if text is mostly mustache expressions
  const withoutMustache = trimmed.replace(/\{\{[^}]+\}\}/g, '').trim();
  if (!withoutMustache || !/[a-zA-Z]/.test(withoutMustache)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text contains Vue directive binding syntax
 * e.g., ":open=\"showModal\"", "@update:open=\"handler\""
 */
function containsVueBindingSyntax(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for v-bind or : prefix with =
  if (/(?:v-bind)?:[a-zA-Z][a-zA-Z0-9_:-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // Check for v-on or @ prefix with =
  if (/(?:v-on)?@[a-zA-Z][a-zA-Z0-9_:-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // Check for v-model
  if (/v-model(?::[a-zA-Z]+)?\s*=/.test(trimmed)) {
    return true;
  }
  
  // Check for v-if, v-show, v-for, etc.
  if (/v-(?:if|else-if|show|for|slot|html|text)\s*=/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Extract text content from HTML, excluding attribute values
 * This is a helper for proper Vue template parsing
 */
function extractTextFromHtml(html) {
  const trimmed = String(html || '').trim();
  if (!trimmed) return [];
  
  const texts = [];
  
  // Remove all tags and their attributes, keeping only text content
  // This is a simplified approach - for full parsing, use a proper HTML parser
  const textOnly = trimmed
    .replace(/<[^>]+>/g, '\n')  // Replace tags with newlines
    .replace(/\{\{[^}]+\}\}/g, '')  // Remove mustache expressions
    .split('\n')
    .map(t => t.trim())
    .filter(t => t && /[a-zA-Z]/.test(t));
  
  return textOnly;
}

/**
 * Check if text is an HTML/template fragment that shouldn't be translated
 * This is the main entry point for HTML validation
 */
function isHtmlContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Check for HTML attribute fragment
  if (isHtmlAttributeFragment(trimmed)) {
    return true;
  }
  
  // Check for Vue template expression
  if (isVueTemplateExpression(trimmed)) {
    return true;
  }
  
  // Check for Vue binding syntax
  if (containsVueBindingSyntax(trimmed)) {
    return true;
  }
  
  // Check for HTML tags
  if (/^<[a-zA-Z][^>]*>/.test(trimmed) || /<\/[a-zA-Z][^>]*>$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

module.exports = {
  NON_TRANSLATABLE_ATTRIBUTES,
  TRANSLATABLE_ATTRIBUTES,
  isNonTranslatableAttribute,
  isTranslatableAttribute,
  isHtmlAttributeFragment,
  isVueTemplateExpression,
  containsVueBindingSyntax,
  extractTextFromHtml,
  isHtmlContent,
};
