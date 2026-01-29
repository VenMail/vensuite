/**
 * Bidirectional markdown-position synchronization
 * Handles injection and extraction of position/size attributes
 */

export interface ElementAttributes {
  class?: string[];
  style?: Record<string, string>;
  position?: { top: string; left: string };
  size?: { width?: string; height?: string };
  id?: string;
}

/**
 * Inject position and size attributes into markdown line
 */
export function injectAttributesToMarkdown(
  markdown: string,
  lineStart: number,
  lineEnd: number,
  attrs: ElementAttributes
): string {
  console.log('📝 injectAttributesToMarkdown:', { lineStart, lineEnd, attrs });
  
  const lines = markdown.split('\n');
  
  if (lineStart < 0 || lineStart >= lines.length) {
    console.error(`📝 ERROR: Invalid line range: ${lineStart}-${lineEnd}, total lines: ${lines.length}`);
    return markdown;
  }
  
  const targetLineIndex = lineStart;
  let targetLine = lines[targetLineIndex];
  
  console.log('📝 Target line before:', targetLine);
  
  // Build attribute string
  const attrParts: string[] = [];
  
  // Position classes
  if (attrs.position) {
    attrParts.push('.absolute');
    // Escape special characters in bracket notation
    attrParts.push(`.top-[${attrs.position.top}]`);
    attrParts.push(`.left-[${attrs.position.left}]`);
  }
  
  // Size classes
  if (attrs.size) {
    if (attrs.size.width) {
      attrParts.push(`.w-[${attrs.size.width}]`);
    }
    if (attrs.size.height) {
      attrParts.push(`.h-[${attrs.size.height}]`);
    }
  }
  
  // Additional classes
  if (attrs.class && attrs.class.length > 0) {
    attrParts.push(...attrs.class.map(c => `.${c}`));
  }
  
  // ID
  if (attrs.id) {
    attrParts.push(`#${attrs.id}`);
  }
  
  // Style attribute
  if (attrs.style && Object.keys(attrs.style).length > 0) {
    const styleStr = Object.entries(attrs.style)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    attrParts.push(`style="${styleStr}"`);
  }
  
  if (attrParts.length === 0) {
    console.log('📝 No attributes to inject');
    return markdown;
  }
  
  const attrString = `{${attrParts.join(' ')}}`;
  console.log('📝 Attribute string:', attrString);
  
  // Remove existing attributes if present
  // Match: {anything} at end of line
  targetLine = targetLine.replace(/\s*\{[^}]+\}\s*$/, '');
  
  // Add new attributes
  targetLine = `${targetLine} ${attrString}`;
  
  console.log('📝 Target line after:', targetLine);
  
  lines[targetLineIndex] = targetLine;
  
  return lines.join('\n');
}

/**
 * Extract attributes from markdown line
 */
export function extractAttributesFromMarkdown(
  markdown: string,
  lineStart: number
): ElementAttributes | null {
  const lines = markdown.split('\n');
  if (lineStart < 0 || lineStart >= lines.length) return null;
  
  const line = lines[lineStart];
  const match = line.match(/\{([^}]+)\}$/);
  if (!match) return null;
  
  const attrsStr = match[1];
  const attrs: ElementAttributes = {
    class: [],
    style: {},
    position: undefined,
    size: undefined,
    id: undefined
  };
  
  // Parse position with bracket notation
  const topMatch = attrsStr.match(/\.top-\[([^\]]+)\]/);
  const leftMatch = attrsStr.match(/\.left-\[([^\]]+)\]/);
  if (topMatch && leftMatch) {
    attrs.position = { top: topMatch[1], left: leftMatch[1] };
  }
  
  // Parse size with bracket notation
  const widthMatch = attrsStr.match(/\.w-\[([^\]]+)\]/);
  const heightMatch = attrsStr.match(/\.h-\[([^\]]+)\]/);
  if (widthMatch || heightMatch) {
    attrs.size = {
      width: widthMatch ? widthMatch[1] : undefined,
      height: heightMatch ? heightMatch[1] : undefined
    };
  }
  
  // Parse ID
  const idMatch = attrsStr.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    attrs.id = idMatch[1];
  }
  
  // Parse other classes (excluding position/size prefixes)
  const classMatches = Array.from(attrsStr.matchAll(/\.([a-zA-Z0-9_-]+(?:-\[[^\]]+\])?)/g));
  for (const match of classMatches) {
    const className = match[1];
    // Skip position/size classes
    if (!className.startsWith('top-[') && 
        !className.startsWith('left-[') &&
        !className.startsWith('w-[') &&
        !className.startsWith('h-[') &&
        className !== 'absolute') {
      attrs.class!.push(className);
    }
  }
  
  // Parse style
  const styleMatch = attrsStr.match(/style="([^"]+)"/);
  if (styleMatch) {
    const stylePairs = styleMatch[1].split(';').map(s => s.trim()).filter(Boolean);
    for (const pair of stylePairs) {
      const [key, ...valueParts] = pair.split(':');
      const value = valueParts.join(':').trim();
      if (key && value) {
        attrs.style![key.trim()] = value;
      }
    }
  }
  
  return attrs;
}

/**
 * Update element size in markdown
 */
export function updateElementSize(
  markdown: string,
  lineStart: number,
  lineEnd: number,
  width: number,
  height: number
): string {
  // Extract existing attributes
  const existingAttrs = extractAttributesFromMarkdown(markdown, lineStart) || {};
  
  // Update size
  const updatedAttrs: ElementAttributes = {
    ...existingAttrs,
    size: {
      width: `${width}px`,
      height: `${height}px`
    }
  };
  
  return injectAttributesToMarkdown(markdown, lineStart, lineEnd, updatedAttrs);
}

/**
 * Update element position in markdown
 */
export function updateElementPosition(
  markdown: string,
  lineStart: number,
  lineEnd: number,
  top: string,
  left: string
): string {
  console.log('📝 updateElementPosition called:', { lineStart, lineEnd, top, left });
  
  // Extract existing attributes
  const existingAttrs = extractAttributesFromMarkdown(markdown, lineStart) || {};
  console.log('📝 Existing attributes:', existingAttrs);
  
  // Update position
  const updatedAttrs: ElementAttributes = {
    ...existingAttrs,
    position: { top, left }
  };
  
  console.log('📝 Updated attributes:', updatedAttrs);
  
  const result = injectAttributesToMarkdown(markdown, lineStart, lineEnd, updatedAttrs);
  
  console.log('📝 Markdown updated:', markdown !== result);
  if (markdown === result) {
    console.warn('📝 WARNING: Markdown did not change!');
  }
  
  return result;
}

/**
 * Remove all position and size attributes from markdown
 */
export function removePositionAttributes(
  markdown: string,
  lineStart: number
): string {
  const lines = markdown.split('\n');
  if (lineStart < 0 || lineStart >= lines.length) return markdown;
  
  let line = lines[lineStart];
  
  // Remove position/size classes from attribute block
  line = line.replace(/\{([^}]+)\}/, (_, attrs) => {
    // Remove position and size classes
    const cleaned = attrs
      .replace(/\.absolute/g, '')
      .replace(/\.top-\[[^\]]+\]/g, '')
      .replace(/\.left-\[[^\]]+\]/g, '')
      .replace(/\.w-\[[^\]]+\]/g, '')
      .replace(/\.h-\[[^\]]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If nothing left, remove the braces
    return cleaned ? `{${cleaned}}` : '';
  });
  
  // Clean up extra spaces
  line = line.replace(/\s*\{\}\s*$/, '').trim();
  
  lines[lineStart] = line;
  return lines.join('\n');
}
