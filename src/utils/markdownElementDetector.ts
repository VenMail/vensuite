/**
 * Utility to detect markdown elements at cursor position
 */

import { parseBlockAttributesFromLine } from '@/utils/slidevMarkdown';

export interface MarkdownElement {
  type: 'heading' | 'paragraph' | 'code' | 'mermaid' | 'image' | 'list' | 'quote' | 'table' | 'divider' | 'text';
  level?: number; // For headings
  language?: string; // For code blocks
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  content: string;
  attributes?: Record<string, string | number | boolean>; // Allow more flexible types
  blockClass?: string; // UnoCSS classes from block {.class}
  blockStyle?: string; // Inline style from block {style="..."}
}

/**
 * Parse markdown and find element at cursor position
 */
export function getElementAtCursor(
  markdown: string,
  cursorLine: number,
  cursorColumn: number
): MarkdownElement | null {
  const lines = markdown.split('\n');
  
  // Check if cursor is within valid range
  if (cursorLine < 0 || cursorLine >= lines.length) {
    return null;
  }

  // Check each element type in order of specificity
  const detectors = [
    detectMermaidBlock,
    detectCodeBlock,
    detectHeading,
    detectTable,
    detectList,
    detectQuote,
    detectImage,
    detectDivider,
    detectParagraph
  ];

  for (const detector of detectors) {
    const element = detector(lines, cursorLine, cursorColumn);
    if (element) {
      return element;
    }
  }

  // Fallback to text element
  return {
    type: 'text',
    startLine: cursorLine,
    endLine: cursorLine,
    startColumn: cursorColumn,
    endColumn: cursorColumn,
    content: lines[cursorLine] || ''
  };
}

/**
 * Detect mermaid code blocks
 */
function detectMermaidBlock(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  return detectFencedCodeBlock(lines, cursorLine, _cursorColumn, 'mermaid');
}

/**
 * Detect generic code blocks
 */
function detectCodeBlock(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  // First check for mermaid (handled separately)
  const mermaidBlock = detectMermaidBlock(lines, cursorLine, _cursorColumn);
  if (mermaidBlock) return null;

  // Find any fenced code block
  for (let i = cursorLine; i >= 0; i--) {
    const match = lines[i].match(/^```(\w+)?/);
    if (match) {
      // Found code block start, find end
      const language = match[1] || 'text';
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('```')) {
          // Found code block end
          if (cursorLine >= i && cursorLine <= j) {
            const content = lines.slice(i + 1, j).join('\n');
            return {
              type: 'code',
              language,
              startLine: i,
              endLine: j,
              startColumn: 0,
              endColumn: lines[j].length,
              content
            };
          }
          break;
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Detect fenced code blocks with specific language
 */
function detectFencedCodeBlock(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number,
  language: string
): MarkdownElement | null {
  for (let i = cursorLine; i >= 0; i--) {
    const match = lines[i].match(new RegExp(`^^\`\`\`${language}\s*$`));
    if (match) {
      // Found code block start, find end
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('```')) {
          // Found code block end
          if (cursorLine >= i && cursorLine <= j) {
            const content = lines.slice(i + 1, j).join('\n');
            return {
              type: 'mermaid',
              language,
              startLine: i,
              endLine: j,
              startColumn: 0,
              endColumn: lines[j].length,
              content
            };
          }
          break;
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Detect headings (# ## ### etc.) and optional block {.class}/{style}
 */
function detectHeading(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  const { rest, class: blockClass, style: blockStyle } = parseBlockAttributesFromLine(line.trim());
  const match = rest.match(/^(#{1,6})\s+(.+)$/);
  
  if (match) {
    const level = match[1].length;
    const content = match[2];
    return {
      type: 'heading',
      level,
      startLine: cursorLine,
      endLine: cursorLine,
      startColumn: 0,
      endColumn: line.length,
      content,
      ...(blockClass && { blockClass }),
      ...(blockStyle && { blockStyle })
    };
  }

  return null;
}

/**
 * Detect tables
 */
function detectTable(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  
  // Check if current line looks like a table row
  if (line.includes('|')) {
    // Look for table start (go up to find first table row)
    let tableStart = cursorLine;
    for (let i = cursorLine; i >= 0; i--) {
      if (lines[i].includes('|')) {
        tableStart = i;
      } else {
        break;
      }
    }

    // Look for table end (go down to find last table row)
    let tableEnd = cursorLine;
    for (let i = cursorLine + 1; i < lines.length; i++) {
      if (lines[i].includes('|')) {
        tableEnd = i;
      } else {
        break;
      }
    }

    const content = lines.slice(tableStart, tableEnd + 1).join('\n');
    return {
      type: 'table',
      startLine: tableStart,
      endLine: tableEnd,
      startColumn: 0,
      endColumn: lines[tableEnd].length,
      content
    };
  }

  return null;
}

/**
 * Detect lists (-, *, 1., etc.)
 */
function detectList(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  
  if (match) {
    // Find list start and end
    let listStart = cursorLine;
    let listEnd = cursorLine;
    const indent = match[1].length;

    // Go up to find list start
    for (let i = cursorLine - 1; i >= 0; i--) {
      const listMatch = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch && listMatch[1].length <= indent) {
        listStart = i;
      } else {
        break;
      }
    }

    // Go down to find list end
    for (let i = cursorLine + 1; i < lines.length; i++) {
      const listMatch = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch && listMatch[1].length <= indent) {
        listEnd = i;
      } else {
        break;
      }
    }

    const content = lines.slice(listStart, listEnd + 1).join('\n');
    return {
      type: 'list',
      startLine: listStart,
      endLine: listEnd,
      startColumn: 0,
      endColumn: lines[listEnd].length,
      content
    };
  }

  return null;
}

/**
 * Detect blockquotes (> )
 */
function detectQuote(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  
  if (line.trim().startsWith('>')) {
    // Find quote start and end
    let quoteStart = cursorLine;
    let quoteEnd = cursorLine;

    // Go up to find quote start
    for (let i = cursorLine - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('>')) {
        quoteStart = i;
      } else {
        break;
      }
    }

    // Go down to find quote end
    for (let i = cursorLine + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('>')) {
        quoteEnd = i;
      } else {
        break;
      }
    }

    const content = lines.slice(quoteStart, quoteEnd + 1).join('\n');
    return {
      type: 'quote',
      startLine: quoteStart,
      endLine: quoteEnd,
      startColumn: 0,
      endColumn: lines[quoteEnd].length,
      content
    };
  }

  return null;
}

/**
 * Detect images ![alt](url) and optional block {.class}/{style}
 */
function detectImage(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  
  if (match) {
    const altText = match[1];
    const url = match[2];
    const { class: blockClass, style: blockStyle } = parseBlockAttributesFromLine(line.trim());
    return {
      type: 'image',
      startLine: cursorLine,
      endLine: cursorLine,
      startColumn: line.indexOf('!'),
      endColumn: line.indexOf(')') + 1,
      content: line,
      attributes: { alt: altText, url },
      ...(blockClass && { blockClass }),
      ...(blockStyle && { blockStyle })
    };
  }

  return null;
}

/**
 * Detect dividers (---)
 */
function detectDivider(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  
  if (line.trim().match(/^[-*_]{3,}$/)) {
    return {
      type: 'divider',
      startLine: cursorLine,
      endLine: cursorLine,
      startColumn: 0,
      endColumn: line.length,
      content: line
    };
  }

  return null;
}

/**
 * Detect paragraphs (fallback for regular text)
 */
function detectParagraph(
  lines: string[],
  cursorLine: number,
  _cursorColumn: number
): MarkdownElement | null {
  const line = lines[cursorLine];
  
  // Skip empty lines
  if (!line.trim()) {
    return null;
  }

  // Skip lines that are already handled by other detectors
  if (line.match(/^#{1,6}\s/) || // heading
      line.match(/^```\w*/) || // code block
      line.includes('|') || // table
      line.match(/^(\s*)([-*+]|\d+\.)\s/) || // list
      line.trim().startsWith('>') || // quote
      line.match(/!\[([^\]]*)\]\(([^)]+)\)/) || // image
      line.trim().match(/^[-*_]{3,}$/)) { // divider
    return null;
  }

  // Find paragraph boundaries (empty lines)
  let paraStart = cursorLine;
  let paraEnd = cursorLine;

  // Go up to find paragraph start
  for (let i = cursorLine - 1; i >= 0; i--) {
    if (lines[i].trim() === '') {
      break;
    }
    paraStart = i;
  }

  // Go down to find paragraph end
  for (let i = cursorLine + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      break;
    }
    paraEnd = i;
  }

  const content = lines.slice(paraStart, paraEnd + 1).join('\n');
  const firstLine = lines[paraStart]?.trim() || '';
  const { rest: _firstRest, class: blockClass, style: blockStyle } = parseBlockAttributesFromLine(firstLine);
  return {
    type: 'paragraph',
    startLine: paraStart,
    endLine: paraEnd,
    startColumn: 0,
    endColumn: lines[paraEnd].length,
    content,
    ...(blockClass && { blockClass }),
    ...(blockStyle && { blockStyle })
  };
}

/**
 * Get cursor position from textarea
 */
export function getCursorPosition(textarea: HTMLTextAreaElement): { line: number; column: number } {
  const text = textarea.value;
  const cursorIndex = textarea.selectionStart;
  
  // Get text before cursor
  const textBeforeCursor = text.substring(0, cursorIndex);
  
  // Count newlines to get line number
  const lines = textBeforeCursor.split('\n');
  const lineNumber = lines.length - 1;
  
  // Column is the length of the last line
  const column = lines[lines.length - 1].length;
  
  return { line: lineNumber, column: column };
}

/**
 * Get markdown element that spans the given line range (for preview selection → markdown mapping)
 */
export function getElementByLineRange(
  markdown: string,
  startLine: number,
  endLine: number
): MarkdownElement | null {
  const el = getElementAtCursor(markdown, startLine, 0);
  if (el && el.startLine === startLine && el.endLine === endLine) return el;
  const lines = markdown.split('\n');
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) return null;
  const content = lines.slice(startLine, endLine + 1).join('\n');
  const firstLine = lines[startLine] || '';
  const { class: blockClass, style: blockStyle } = parseBlockAttributesFromLine(firstLine.trim());
  let type: MarkdownElement['type'] = 'paragraph';
  let level: number | undefined;
  if (firstLine.trim().match(/^(#{1,6})\s/)) {
    type = 'heading';
    level = (firstLine.trim().match(/^(#{1,6})/) || [])[1]?.length;
  } else if (firstLine.match(/!\[[^\]]*\]\([^)]+\)/)) {
    type = 'image';
  } else if (firstLine.includes('|')) {
    type = 'table';
  } else if (firstLine.trim().match(/^[-*+]\s/) || firstLine.trim().match(/^\d+\.\s/)) {
    type = 'list';
  } else if (firstLine.trim().startsWith('>')) {
    type = 'quote';
  } else if (firstLine.trim().match(/^[-*_]{3,}$/)) {
    type = 'divider';
  }
  return {
    type,
    startLine,
    endLine,
    startColumn: 0,
    endColumn: lines[endLine]?.length ?? 0,
    content,
    ...(level !== undefined && { level }),
    ...(blockClass && { blockClass }),
    ...(blockStyle && { blockStyle })
  };
}

/**
 * Get element type info for display in properties panel
 */
export function getElementTypeInfo(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return `Heading (${tagName})`;
  } else if (tagName === 'p') {
    return 'Paragraph';
  } else if (tagName === 'img') {
    return 'Image';
  } else if (tagName === 'ul' || tagName === 'ol') {
    return tagName === 'ul' ? 'List (unordered)' : 'List (ordered)';
  } else if (tagName === 'blockquote') {
    return 'Quote';
  } else if (tagName === 'code' || tagName === 'pre') {
    return 'Code Block';
  } else if (tagName === 'table') {
    return 'Table';
  } else if (tagName === 'hr') {
    return 'Divider';
  } else if (element.classList.contains('mermaid-diagram')) {
    return 'Mermaid Diagram';
  } else if (element.classList.contains('plantuml-diagram')) {
    return 'PlantUML Diagram';
  } else {
    return 'Element';
  }
}
