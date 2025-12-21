/**
 * HTML/Template Validator
 * Detects HTML attributes, template directives, and syntax from ALL frameworks
 * that should NOT be translated.
 * Works with Vue, React, Angular, Svelte, Blade, Twig, Handlebars, EJS, etc.
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
  // React attributes
  'key', 'ref', 'dangerouslySetInnerHTML', 'className', 'htmlFor',
  // Angular attributes
  'ngIf', 'ngFor', 'ngSwitch', 'ngModel', 'ngClass', 'ngStyle',
  '*ngIf', '*ngFor', '*ngSwitch', '[ngClass]', '[ngStyle]',
  // Svelte directives
  'bind:', 'on:', 'use:', 'transition:', 'in:', 'out:', 'animate:',
  // Alpine.js
  'x-data', 'x-bind', 'x-on', 'x-text', 'x-html', 'x-model', 'x-show', 'x-if',
  'x-for', 'x-transition', 'x-effect', 'x-ignore', 'x-ref', 'x-cloak', 'x-teleport',
  // HTMX
  'hx-get', 'hx-post', 'hx-put', 'hx-patch', 'hx-delete', 'hx-trigger', 'hx-target',
  'hx-swap', 'hx-push-url', 'hx-select', 'hx-vals', 'hx-boost', 'hx-indicator',
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

// Template directive patterns from various frameworks
const TEMPLATE_DIRECTIVE_PATTERNS = [
  // Vue
  /^v-[a-z]+/,                    // v-if, v-show, v-for, etc.
  /^@[a-z]+/,                     // @click, @change, etc.
  /^:[a-z]+/,                     // :class, :style, :href, etc.
  /^#[a-z]+/,                     // #default, #header, etc.
  
  // Angular
  /^\*ng[A-Z]/,                   // *ngIf, *ngFor, etc.
  /^\[ng[A-Z]/,                   // [ngClass], [ngStyle], etc.
  /^\(ng[A-Z]/,                   // (ngSubmit), etc.
  /^\[[a-z]+\]/,                  // [disabled], [href], etc.
  /^\([a-z]+\)/,                  // (click), (change), etc.
  /^\[\([a-z]+\)\]/,              // [(ngModel)], two-way binding
  
  // Svelte
  /^bind:/,                       // bind:value, bind:checked, etc.
  /^on:/,                         // on:click, on:change, etc.
  /^use:/,                        // use:action
  /^transition:/,                 // transition:fade
  /^in:/,                         // in:fade
  /^out:/,                        // out:fade
  /^animate:/,                    // animate:flip
  /^let:/,                        // let:item
  
  // Alpine.js
  /^x-[a-z]/,                     // x-data, x-bind, x-on, etc.
  /^@[a-z]/,                      // @click (Alpine shorthand)
  /^:[a-z]/,                      // :class (Alpine shorthand)
  
  // HTMX
  /^hx-[a-z]/,                    // hx-get, hx-post, etc.
  
  // React (JSX-style)
  /^on[A-Z]/,                     // onClick, onChange, etc.
  
  // Web Components
  /^slot$/,                       // slot attribute
  /^part$/,                       // part attribute for shadow DOM
];

/**
 * Check if an attribute name indicates non-translatable content
 * Goal is to detect patterns from all frameworks
 */
function isNonTranslatableAttribute(attrName) {
  const name = String(attrName || '').trim();
  if (!name) return true;
  
  const lower = name.toLowerCase();
  
  // Check direct match
  if (NON_TRANSLATABLE_ATTRIBUTES.has(lower)) {
    return true;
  }
  
  // Check data-* attributes
  if (lower.startsWith('data-') || lower.startsWith('aria-')) {
    return !TRANSLATABLE_ATTRIBUTES.has(lower);
  }
  
  // Check all template directive patterns
  for (const pattern of TEMPLATE_DIRECTIVE_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  // Check event handler patterns (React, vanilla JS)
  if (/^on[A-Z]/.test(name) || /^@/.test(name)) {
    return true;
  }
  
  // Check binding patterns (Vue, Alpine)
  if (/^:/.test(name) || /^v-bind:/.test(name)) {
    return true;
  }
  
  // Check Angular binding patterns
  if (/^\[.*\]$/.test(name) || /^\(.*\)$/.test(name) || /^\[\(.*\)\]$/.test(name)) {
    return true;
  }
  
  // Check Svelte directive patterns
  if (/^(bind|on|use|transition|in|out|animate|let):/.test(name)) {
    return true;
  }
  
  // Check for wire: directives (Livewire)
  if (/^wire:/.test(name)) {
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
  
  // Pattern: attribute="value" or attribute='value' (with various prefixes)
  if (/^[a-zA-Z@:#*\[\(][a-zA-Z0-9_:.\-\[\]\(\)]*\s*=\s*["'][^"']*["']/.test(trimmed)) {
    return true;
  }
  
  // Pattern: just the value part with quotes and closing bracket
  // e.g., 'value ? null : closeShareModal()">'
  if (/^[^"']*["']\s*\/?>/.test(trimmed)) {
    return true;
  }
  
  // Pattern: attribute value ending with "> or "/>
  if (/["']\s*\/?>$/.test(trimmed)) {
    return true;
  }
  
  // Pattern: standalone boolean attributes or self-closing tags
  if (/^[a-zA-Z@:#*\[\(][a-zA-Z0-9_:.\-\[\]\(\)]*\s*\/?>$/.test(trimmed)) {
    return true;
  }
  
  // Pattern: attribute without quotes (React-style)
  if (/^[a-zA-Z@:#*\[\(][a-zA-Z0-9_:.\-\[\]\(\)]*\s*=\s*\{[^}]*\}/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is a template expression from ANY framework
 * Detects: Vue {{}}, Blade {{}}, Twig {{}}, Handlebars {{}}, EJS <%=%>, etc.
 */
function isTemplateExpression(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Calculate the ratio of template expression characters to total characters
  const templateMatches = [
    ...trimmed.match(/\{\{[^}]+\}\}/g) || [],  // Vue/Blade/Handlebars
    ...trimmed.match(/\{%-?[^}]*-?%\}/g) || [],  // Twig/Liquid
    ...trimmed.match(/<%[=-]?[^>]*%>/g) || [],  // EJS/JSP
    ...trimmed.match(/@[a-z]+(?:\([^)]*\))?/gi) || [],  // Blade directives
    ...trimmed.match(/\$\{[^}]+\}/g) || [],  // Template literals/JSP EL
    ...trimmed.match(/#\{[^}]+\}/g) || []  // Pug/Jade
  ];
  
  const templateLength = templateMatches.reduce((sum, match) => sum + match.length, 0);
  const totalLength = trimmed.length;
  
  // If template expressions are more than 85% of the content, consider it template-only
  if (templateLength > totalLength * 0.85) {
    return true;
  }
  
  // For mixed content (less than 85% template), check if it's mostly template code
  // Remove template expressions and see what's left
  let stripped = trimmed
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\{%-?[^}]*-?%\}/g, '')
    .replace(/<%[=-]?[^>]*%>/g, '')
    .replace(/@[a-z]+(?:\([^)]*\))?/gi, '')
    .replace(/\$\{[^}]+\}/g, '')
    .replace(/#\{[^}]+\}/g, '')
    .trim();
  
  // If very little actual text left, consider it template content
  if (stripped.length < totalLength * 0.3) {
    return true;
  }
  
  // Otherwise, it's mixed content with substantial translatable text
  return false;
}

/**
 * Check if text contains template/framework binding syntax
 */
function containsBindingSyntax(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Vue: v-bind, :, v-on, @, v-model
  if (/(?:v-bind)?:[a-zA-Z][a-zA-Z0-9_:.-]*\s*=/.test(trimmed)) {
    return true;
  }
  if (/(?:v-on)?@[a-zA-Z][a-zA-Z0-9_:.-]*\s*=/.test(trimmed)) {
    return true;
  }
  if (/v-(?:model|if|else-if|show|for|slot|html|text|pre|cloak|once|memo)(?::[a-zA-Z]+)?\s*=/.test(trimmed)) {
    return true;
  }
  
  // Angular: [], (), [()]
  if (/\[[a-zA-Z][a-zA-Z0-9_.-]*\]\s*=/.test(trimmed)) {
    return true;
  }
  if (/\([a-zA-Z][a-zA-Z0-9_.-]*\)\s*=/.test(trimmed)) {
    return true;
  }
  if (/\[\([a-zA-Z][a-zA-Z0-9_.-]*\)\]\s*=/.test(trimmed)) {
    return true;
  }
  if (/\*ng[A-Z][a-zA-Z]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // Svelte: bind:, on:, use:, etc.
  if (/(bind|on|use|transition|in|out|animate|let):[a-zA-Z][a-zA-Z0-9_:.-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // Alpine.js: x-data, x-bind, x-on, etc.
  if (/x-[a-z][a-z-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // HTMX: hx-*
  if (/hx-[a-z][a-z\-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // Livewire: wire:*
  if (/wire:[a-z][a-z\-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // React: {...spread}
  if (/\{\.\.\./.test(trimmed)) {
    return true;
  }
  
  // Thymeleaf: th:*
  if (/th:[a-z][a-z\-]*\s*=/.test(trimmed)) {
    return true;
  }
  
  // Contains JavaScript/expression-like syntax in attribute value
  if (/=\s*["'].*(?:\?|::|=>|&&|\|\||\.map\(|\.filter\(|\.reduce\().*["']/.test(trimmed)) {
    return true;
  }
  
  return false;
}

function containsVueBindingSyntax(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Only reject if the text is PURELY Vue binding syntax without translatable content
  // Allow text that contains Vue bindings as placeholders within legitimate translatable content
  
  // Check if text is ONLY Vue expressions (no actual translatable content)
  const withoutExpressions = trimmed
    .replace(/\{\{[^}]+\}\}/g, '')  // Remove Vue mustache expressions
    .replace(/\{[^}]+\}/g, '')      // Remove simple placeholders
    .replace(/\$\{[^}]+\}/g, '')    // Remove template literals
    .trim();
  
  // If nothing left after removing expressions, it's pure binding syntax
  if (!withoutExpressions) {
    return true;
  }
  
  // If there's substantial translatable content left, allow it
  // Check if at least 30% of the content is actual text (not just placeholders)
  const totalLength = trimmed.length;
  const expressionLength = totalLength - withoutExpressions.length;
  
  // Allow if less than 70% is expressions (i.e., at least 30% is actual text)
  if (expressionLength < totalLength * 0.7) {
    return false; // Allow - has sufficient translatable content
  }
  
  // Otherwise, it's mostly expressions, reject
  return containsBindingSyntax(text);
}

/**
 * Check if text looks like a template tag or directive
 * e.g., "@section('title')", "{% if condition %}", "<% if %>"
 */
function isTemplateTag(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Blade directives
  if (/^@[a-z]+(?:\([^)]*\))?$/i.test(trimmed)) {
    return true;
  }
  
  // Twig/Jinja2/Liquid tags
  if (/^\{%-?[^}]*-?%\}$/.test(trimmed)) {
    return true;
  }
  
  // EJS/JSP tags
  if (/^<%[=-]?[^>]*%>$/.test(trimmed)) {
    return true;
  }
  
  // Handlebars block helpers
  if (/^\{\{[#\/^][^}]*\}\}$/.test(trimmed)) {
    return true;
  }
  
  // FreeMarker directives
  if (/^<[#@][^>]+>$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if text contains server-side code or expressions
 */
function containsServerSideCode(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // PHP tags
  if (/<\?php|<\?=/.test(trimmed)) {
    return true;
  }
  
  // ASP tags
  if (/<%[@=]?/.test(trimmed)) {
    return true;
  }
  
  // JSP Expression Language
  if (/\$\{[^}]+\}/.test(trimmed)) {
    return true;
  }
  
  // Ruby ERB
  if (/<%[=-]?[^>]*%>/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Extract text content from HTML, excluding attribute values
 * This is a helper for proper template parsing
 */
function extractTextFromHtml(html) {
  const trimmed = String(html || '').trim();
  if (!trimmed) return [];
  
  const texts = [];
  
  // Remove all template expressions first
  let cleaned = trimmed
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\{%-?[^}]*-?%\}/g, '')
    .replace(/<%[=-]?[^>]*%>/g, '')
    .replace(/@[a-z]+(?:\([^)]*\))?/gi, '')
    .replace(/\$\{[^}]+\}/g, '')
    .replace(/#\{[^}]+\}/g, '');
  
  // Remove all tags and their attributes, keeping only text content
  const textOnly = cleaned
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map(t => t.trim())
    .filter(t => t && /[a-zA-Z]/.test(t));
  
  return textOnly;
}

/**
 * Check if text is an HTML/template fragment that shouldn't be translated
 * This is the main entry point for HTML validation
 * Should work with all frameworks
 */
function isHtmlContent(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  
  // Quick reject: if it looks like normal prose without any special characters
  if (/^[A-Z][a-z]+(?:\s+[a-z]+)+[.!?]$/.test(trimmed) && 
      !/[<>{}\[\]@#:=]/.test(trimmed)) {
    return false;
  }
  
  // Check for HTML attribute fragment
  if (isHtmlAttributeFragment(trimmed)) {
    return true;
  }
  
  // Check for template expressions (all frameworks)
  if (isTemplateExpression(trimmed)) {
    return true;
  }
  
  // Check for template tags
  if (isTemplateTag(trimmed)) {
    return true;
  }
  
  // Check for binding syntax (all frameworks)
  if (containsBindingSyntax(trimmed)) {
    return true;
  }
  
  // Check for server-side code
  if (containsServerSideCode(trimmed)) {
    return true;
  }
  
  // Check for HTML tags (opening or closing)
  if (/^<[a-zA-Z][^>]*>/.test(trimmed) || /<\/[a-zA-Z][^>]*>$/.test(trimmed)) {
    return true;
  }
  
  // Check for self-closing tags
  if (/^<[a-zA-Z][^>]*\/>$/.test(trimmed)) {
    return true;
  }
  
  // Check for HTML entities
  if (/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/i.test(trimmed)) {
    return true;
  }
  
  // Check for comment syntax (HTML, Twig, Blade, etc.)
  if (/^<!--.*-->$/.test(trimmed) || /^\{#.*#\}$/.test(trimmed) || /^{{--.*--}}$/.test(trimmed)) {
    return true;
  }
  
  // Check for slot/component syntax
  if (/<slot|<component|<template/.test(trimmed)) {
    return true;
  }
  
  // Check if heavily mixed with template syntax (>50% is template code)
  const templateChars = (trimmed.match(/[{}<>{}\[\]@#:=]/g) || []).length;
  if (templateChars > trimmed.length * 0.3) {
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
  isTemplateExpression,
  containsBindingSyntax,
  containsVueBindingSyntax,
  isTemplateTag,
  containsServerSideCode,
  extractTextFromHtml,
  isHtmlContent,
};