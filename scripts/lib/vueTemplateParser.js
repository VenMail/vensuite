/**
 * Vue Template Parser
 * Properly parses Vue SFC templates to extract translatable text content.
 * 
 * This parser handles:
 * - HTML tags and their attributes
 * - Vue directives (v-if, v-for, @click, :prop, etc.)
 * - Text content between tags
 * - Mustache expressions {{ }}
 * - Self-closing tags
 * - Nested elements
 */

const { shouldTranslate, isTranslatableAttribute, isNonTranslatableAttribute } = require('./validators');

// States for the parser
const STATE = {
  TEXT: 'TEXT',
  TAG_OPEN: 'TAG_OPEN',
  TAG_NAME: 'TAG_NAME',
  TAG_SPACE: 'TAG_SPACE',
  ATTR_NAME: 'ATTR_NAME',
  ATTR_EQUALS: 'ATTR_EQUALS',
  ATTR_VALUE_START: 'ATTR_VALUE_START',
  ATTR_VALUE: 'ATTR_VALUE',
  TAG_CLOSE: 'TAG_CLOSE',
  COMMENT: 'COMMENT',
  SCRIPT: 'SCRIPT',
  STYLE: 'STYLE',
};

/**
 * Parse Vue template and extract translatable content
 * 
 * @param {string} template - The Vue template content
 * @param {Object} options - Parser options
 * @returns {Array} - Array of extracted text items with metadata
 */
function parseVueTemplate(template, options = {}) {
  const { ignorePatterns } = options;
  const results = [];
  
  if (!template || typeof template !== 'string') {
    return results;
  }
  
  let state = STATE.TEXT;
  let pos = 0;
  let textStart = 0;
  let tagName = '';
  let attrName = '';
  let attrValue = '';
  let attrQuote = '';
  let attrStart = 0;
  let currentTag = '';
  let tagStack = [];
  let inScript = false;
  let inStyle = false;
  
  const len = template.length;
  
  /**
   * Get the current parent tag name
   */
  function getCurrentParentTag() {
    return tagStack.length > 0 ? tagStack[tagStack.length - 1] : null;
  }
  
  /**
   * Infer translation kind from tag name
   */
  function inferKindFromTag(tag) {
    if (!tag) return 'text';
    const lower = tag.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(lower)) return 'heading';
    if (lower === 'label') return 'label';
    if (lower === 'button' || lower.endsWith('button') || lower.endsWith('btn')) return 'button';
    if (lower === 'a' || lower === 'link' || lower === 'nuxt-link' || lower === 'router-link') return 'link';
    if (['input', 'textarea', 'select'].includes(lower)) return 'placeholder';
    if (lower === 'title') return 'title';
    return 'text';
  }
  
  /**
   * Infer translation kind from attribute name
   */
  function inferKindFromAttr(attr) {
    const lower = String(attr || '').toLowerCase();
    if (lower === 'placeholder') return 'placeholder';
    if (lower === 'title') return 'title';
    if (lower === 'alt') return 'alt';
    if (lower === 'aria-label' || lower === 'arialabel') return 'aria_label';
    if (lower === 'label') return 'label';
    return 'text';
  }
  
  /**
   * Process extracted text content
   */
  function processTextContent(text, parentTag) {
    if (!text) return;
    
    // First, look inside Vue mustache expressions for string literals that
    // should be translated.
    try {
      const mustacheRegex = /\{\{([^}]+)\}\}/g;
      let mustacheMatch;
      while ((mustacheMatch = mustacheRegex.exec(text)) !== null) {
        const expr = (mustacheMatch[1] || '').trim();
        if (!expr) continue;

        const stringRegex = /(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\1/g;
        let strMatch;
        while ((strMatch = stringRegex.exec(expr)) !== null) {
          const candidate = (strMatch[2] || '').trim();
          if (!candidate) continue;

          if (!shouldTranslate(candidate, { ignorePatterns })) {
            continue;
          }

          const kind = inferKindFromTag(parentTag);
          results.push({
            type: 'text',
            text: candidate,
            kind,
            parentTag,
          });
        }
      }
    } catch {
      // Best-effort extraction; ignore mustache parsing errors.
    }

    // Now handle any plain text outside of mustache expressions.
    let cleanText = text
      .replace(/\{\{[^}]+\}\}/g, '')  // Remove {{ expr }}
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!cleanText) return;
    
    // Validate the text
    if (!shouldTranslate(cleanText, { ignorePatterns })) {
      return;
    }
    
    const kind = inferKindFromTag(parentTag);
    results.push({
      type: 'text',
      text: cleanText,
      kind,
      parentTag,
    });
  }
  
  /**
   * Process extracted attribute value
   */
  function processAttributeValue(name, value, tag) {
    if (!name || !value) return;
    
    // Skip non-translatable attributes
    if (isNonTranslatableAttribute(name)) {
      return;
    }
    
    // Only process translatable attributes
    if (!isTranslatableAttribute(name)) {
      return;
    }
    
    // Clean the value
    const cleanValue = value.replace(/\s+/g, ' ').trim();
    if (!cleanValue) return;
    
    // Validate the value
    if (!shouldTranslate(cleanValue, { 
      ignorePatterns, 
      context: 'attribute', 
      attributeName: name 
    })) {
      return;
    }
    
    const kind = inferKindFromAttr(name);
    results.push({
      type: 'attribute',
      text: cleanValue,
      kind,
      attributeName: name,
      parentTag: tag,
    });
  }
  
  // Main parsing loop
  while (pos < len) {
    const char = template[pos];
    const nextChar = pos + 1 < len ? template[pos + 1] : '';
    
    switch (state) {
      case STATE.TEXT: {
        // Check for comment start
        if (char === '<' && template.slice(pos, pos + 4) === '<!--') {
          // Process any accumulated text
          const text = template.slice(textStart, pos);
          if (text.trim()) {
            processTextContent(text, getCurrentParentTag());
          }
          state = STATE.COMMENT;
          pos += 4;
          continue;
        }
        
        // Check for tag start
        if (char === '<') {
          // Process any accumulated text
          const text = template.slice(textStart, pos);
          if (text.trim()) {
            processTextContent(text, getCurrentParentTag());
          }
          
          // Check for closing tag
          if (nextChar === '/') {
            state = STATE.TAG_CLOSE;
            pos += 2;
            tagName = '';
          } else if (/[a-zA-Z]/.test(nextChar)) {
            state = STATE.TAG_NAME;
            pos += 1;
            tagName = '';
          } else {
            pos += 1;
          }
          continue;
        }
        
        pos += 1;
        break;
      }
      
      case STATE.COMMENT: {
        // Look for comment end
        if (char === '-' && template.slice(pos, pos + 3) === '-->') {
          pos += 3;
          state = STATE.TEXT;
          textStart = pos;
          continue;
        }
        pos += 1;
        break;
      }
      
      case STATE.TAG_NAME: {
        if (/[a-zA-Z0-9_:-]/.test(char)) {
          tagName += char;
          pos += 1;
        } else if (char === '>' || char === '/') {
          // End of tag
          currentTag = tagName;
          
          // Check for script/style tags
          if (tagName.toLowerCase() === 'script') {
            inScript = true;
            state = STATE.SCRIPT;
          } else if (tagName.toLowerCase() === 'style') {
            inStyle = true;
            state = STATE.STYLE;
          } else if (char === '/') {
            // Self-closing tag
            if (template[pos + 1] === '>') {
              pos += 2;
            } else {
              pos += 1;
            }
            state = STATE.TEXT;
            textStart = pos;
          } else {
            // Opening tag
            tagStack.push(tagName);
            pos += 1;
            state = STATE.TEXT;
            textStart = pos;
          }
        } else if (/\s/.test(char)) {
          currentTag = tagName;
          state = STATE.TAG_SPACE;
          pos += 1;
        } else {
          pos += 1;
        }
        break;
      }
      
      case STATE.TAG_SPACE: {
        if (/\s/.test(char)) {
          pos += 1;
        } else if (char === '>') {
          // Check for script/style tags
          if (currentTag.toLowerCase() === 'script') {
            inScript = true;
            state = STATE.SCRIPT;
            pos += 1;
          } else if (currentTag.toLowerCase() === 'style') {
            inStyle = true;
            state = STATE.STYLE;
            pos += 1;
          } else {
            tagStack.push(currentTag);
            pos += 1;
            state = STATE.TEXT;
            textStart = pos;
          }
        } else if (char === '/') {
          // Self-closing tag
          if (template[pos + 1] === '>') {
            pos += 2;
          } else {
            pos += 1;
          }
          state = STATE.TEXT;
          textStart = pos;
        } else if (/[a-zA-Z@:#v]/.test(char)) {
          // Start of attribute name
          state = STATE.ATTR_NAME;
          attrName = char;
          attrStart = pos;
          pos += 1;
        } else {
          pos += 1;
        }
        break;
      }
      
      case STATE.ATTR_NAME: {
        if (/[a-zA-Z0-9_:@#.-]/.test(char)) {
          attrName += char;
          pos += 1;
        } else if (char === '=') {
          state = STATE.ATTR_VALUE_START;
          pos += 1;
        } else if (/\s/.test(char)) {
          // Boolean attribute (no value)
          state = STATE.TAG_SPACE;
          pos += 1;
        } else if (char === '>' || char === '/') {
          // End of tag
          if (char === '/') {
            if (template[pos + 1] === '>') {
              pos += 2;
            } else {
              pos += 1;
            }
            state = STATE.TEXT;
            textStart = pos;
          } else {
            tagStack.push(currentTag);
            pos += 1;
            state = STATE.TEXT;
            textStart = pos;
          }
        } else {
          pos += 1;
        }
        break;
      }
      
      case STATE.ATTR_VALUE_START: {
        if (char === '"' || char === "'") {
          attrQuote = char;
          attrValue = '';
          state = STATE.ATTR_VALUE;
          pos += 1;
        } else if (/\s/.test(char)) {
          pos += 1;
        } else {
          // Unquoted attribute value
          attrQuote = '';
          attrValue = char;
          state = STATE.ATTR_VALUE;
          pos += 1;
        }
        break;
      }
      
      case STATE.ATTR_VALUE: {
        if (attrQuote) {
          // Quoted value
          if (char === attrQuote) {
            // End of attribute value
            processAttributeValue(attrName, attrValue, currentTag);
            state = STATE.TAG_SPACE;
            pos += 1;
          } else {
            attrValue += char;
            pos += 1;
          }
        } else {
          // Unquoted value
          if (/[\s>\/]/.test(char)) {
            // End of attribute value
            processAttributeValue(attrName, attrValue, currentTag);
            if (char === '>') {
              tagStack.push(currentTag);
              state = STATE.TEXT;
              textStart = pos + 1;
            } else if (char === '/') {
              state = STATE.TAG_SPACE;
            } else {
              state = STATE.TAG_SPACE;
            }
            pos += 1;
          } else {
            attrValue += char;
            pos += 1;
          }
        }
        break;
      }
      
      case STATE.TAG_CLOSE: {
        if (char === '>') {
          // Pop from tag stack
          const closingTag = tagName.toLowerCase();
          while (tagStack.length > 0) {
            const top = tagStack.pop();
            if (top.toLowerCase() === closingTag) {
              break;
            }
          }
          pos += 1;
          state = STATE.TEXT;
          textStart = pos;
          tagName = '';
        } else if (/[a-zA-Z0-9_:-]/.test(char)) {
          tagName += char;
          pos += 1;
        } else {
          pos += 1;
        }
        break;
      }
      
      case STATE.SCRIPT: {
        // Look for </script>
        if (char === '<' && template.slice(pos, pos + 9).toLowerCase() === '</script>') {
          pos += 9;
          inScript = false;
          state = STATE.TEXT;
          textStart = pos;
          continue;
        }
        pos += 1;
        break;
      }
      
      case STATE.STYLE: {
        // Look for </style>
        if (char === '<' && template.slice(pos, pos + 8).toLowerCase() === '</style>') {
          pos += 8;
          inStyle = false;
          state = STATE.TEXT;
          textStart = pos;
          continue;
        }
        pos += 1;
        break;
      }
      
      default:
        pos += 1;
    }
  }
  
  // Process any remaining text
  if (state === STATE.TEXT && textStart < len) {
    const text = template.slice(textStart);
    if (text.trim()) {
      processTextContent(text, getCurrentParentTag());
    }
  }
  
  return results;
}

/**
 * Extract template section from Vue SFC
 * Handles nested <template> tags (Vue slots) by finding the matching closing tag
 */
function extractTemplateFromVue(vueContent) {
  if (!vueContent || typeof vueContent !== 'string') {
    return null;
  }
  
  // Find the opening <template> tag at the root level
  const openMatch = vueContent.match(/^[\s\S]*?<template(\s[^>]*)?>|<template(\s[^>]*)?>/i);
  if (!openMatch) return null;

  const startIndex = openMatch.index + openMatch[0].length;
  let depth = 1;
  let pos = startIndex;
  const len = vueContent.length;

  while (pos < len && depth > 0) {
    // Look for <template or </template
    const nextOpen = vueContent.indexOf('<template', pos);
    const nextClose = vueContent.indexOf('</template>', pos);

    if (nextClose === -1) {
      // No closing tag found
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Check if it's actually a template tag (not something like <templateFoo>)
      const afterOpen = vueContent[nextOpen + 9]; // character after '<template'
      if (!afterOpen || /[\s>\/]/.test(afterOpen)) {
        depth++;
      }
      pos = nextOpen + 9;
    } else {
      depth--;
      if (depth === 0) {
        return vueContent.slice(startIndex, nextClose);
      }
      pos = nextClose + 11; // length of '</template>'
    }
  }

  // Fallback: try greedy match for the last </template>
  const greedyMatch = vueContent.match(/<template[^>]*>([\s\S]*)<\/template>/i);
  return greedyMatch ? greedyMatch[1] : null;
}

/**
 * Parse Vue SFC and extract translatable content
 */
function parseVueSfc(vueContent, options = {}) {
  const template = extractTemplateFromVue(vueContent);
  if (!template) {
    return [];
  }
  
  return parseVueTemplate(template, options);
}

module.exports = {
  parseVueTemplate,
  extractTemplateFromVue,
  parseVueSfc,
};
