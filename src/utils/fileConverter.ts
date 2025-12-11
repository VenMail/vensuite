// src/utils/fileConverter.ts
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { IWorkbookData } from '@univerjs/core';
import { Editor, generateJSON } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { ImagePlus } from 'tiptap-image-plus';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { PaginationTable } from 'tiptap-table-plus';
import { FontSize } from '@/extensions/font-size';
import { LineHeight } from '@/extensions/line-height';
import { ParagraphSpacing } from '@/extensions/paragraph-spacing';

/**
 * Converts various file formats to editor-compatible formats
 */

// Destructure PaginationTable to get table extensions
const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable;

// ============================================
// DOCUMENT CONVERSIONS (for Tiptap Editor)
// ============================================

/**
 * Get Tiptap extensions matching DocsEditor configuration
 */
function getTiptapExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      history: { depth: 100 },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    UnderlineExtension,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    FontSize,
    LineHeight,
    ParagraphSpacing,
    FontFamily.configure({ types: ['textStyle'] }),
    Color.configure({ types: ['textStyle'] }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Link.configure({ openOnClick: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TablePlus,
    TableRowPlus,
    TableCellPlus,
    TableHeaderPlus,
    ImagePlus.configure({ allowBase64: true }),
    PaginationPlus.configure({
      pageSize: { width: 210, height: 297 },
      pageOrientation: 'portrait',
      pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    } as any),
  ];
}

// Export for external validators/scripts
export { getTiptapExtensions };

/**
 * Validate Tiptap JSON structure
 */
function isValidTiptapJson(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.type !== 'doc') return false;
  if (!Array.isArray(obj.content)) return false;
  return true;
}

/**
 * Validate Tiptap JSON by attempting to convert it back to HTML
 * This ensures the JSON is actually loadable by Tiptap
 */
function validateTiptapJsonCanLoad(json: any): boolean {
  try {
    const extensions = getTiptapExtensions();
    
    // Try to convert JSON back to HTML - if this works, the JSON is valid
    const html = generateHTML(json, extensions);
    console.info('[convert] generateHTML success', { htmlLength: html?.length ?? 0 });
    
    // Basic validation: HTML should not be empty (unless JSON is intentionally empty)
    // For empty docs, we allow empty HTML
    if (json.content && Array.isArray(json.content) && json.content.length > 0) {
      // If there's content, HTML should have some text
      const textContent = html.replace(/<[^>]*>/g, '').trim();
      if (textContent.length === 0 && json.content.some((node: any) => {
        // Check if any node has text content
        if (node.type === 'text') return node.text && node.text.trim().length > 0;
        if (node.content && Array.isArray(node.content)) {
          return node.content.some((child: any) => 
            child.type === 'text' && child.text && child.text.trim().length > 0
          );
        }
        return false;
      })) {
        // Content exists but HTML is empty - validation failed
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('Tiptap JSON validation failed (cannot convert to HTML):', error);
    return false;
  }
}

/**
 * Validate Tiptap JSON by mounting a temporary Editor
 * Ensures the schema accepts the content
 */
function validateTiptapJsonWithEditor(json: any): boolean {
  try {
    const editor = new Editor({
      extensions: getTiptapExtensions(),
      content: json,
      editable: false,
      injectCSS: false,
    });
    editor.destroy();
    return true;
  } catch (error) {
    try {
      const topLevel = Array.isArray(json?.content) ? json.content : [];
      const firstNodes = topLevel.slice(0, 5).map((node: any, index: number) => {
        const textSnippet = (() => {
          try {
            if (!node?.content || !Array.isArray(node.content)) return undefined;
            const textNode = node.content.find((n: any) => n?.type === 'text' && typeof n.text === 'string');
            return textNode?.text?.substring(0, 80);
          } catch {
            return undefined;
          }
        })();
        return {
          index,
          type: node?.type,
          hasContent: Array.isArray(node?.content),
          attrs: node?.attrs ?? null,
          textPreview: textSnippet,
        };
      });

      console.warn('Tiptap JSON validation failed via Editor:', error, {
        summary: {
          hasContent: !!json?.content,
          topLevelNodes: topLevel.length,
        },
        firstNodes,
        jsonPreview: (() => {
          try {
            return JSON.stringify(json).substring(0, 800);
          } catch {
            return '[unstringifiable-json]';
          }
        })(),
      });
    } catch (logError) {
      console.warn('Tiptap JSON validation failed via Editor (and logging failed):', error, logError);
    }
    return false;
  }
}

/**
 * Collect all text content from a node subtree.
 */
function collectNodeText(node: any): string {
  if (!node || typeof node !== 'object') return '';
  let text = '';
  if (node.type === 'text' && typeof node.text === 'string') {
    text += node.text;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      text += collectNodeText(child);
    }
  }
  return text;
}

/**
 * Final JSON-normalization pass before persisted storage.
 *
 * - Normalizes line-height/paragraph-spacing attrs coming from Word/HTML
 * - Applies a gentle default paragraphSpacing to imported paragraphs
 * - Leaves document structure (including tables) intact
 */
function sanitizeDocForEditor(doc: any): any {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) {
    return doc;
  }

  const LINE_HEIGHT_VALUES = ['1', '1.15', '1.25', '1.5', '1.75', '2', '2.5', '3'];
  const PARAGRAPH_SPACING_VALUES = ['0', '0.5', '1', '1.15', '1.5', '2'];

  const TEXTBLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'taskItem']);

  // Reasonable professional defaults matching our LineHeight extension scale
  const DEFAULT_PARAGRAPH_SPACING = '0.5';
  const DEFAULT_HEADING_SPACING = '1';
  const DEFAULT_PARAGRAPH_LINE_HEIGHT = '1.5';
  const DEFAULT_HEADING_LINE_HEIGHT = '1.25';

  const sanitizeLineHeightValue = (raw: unknown): string | null => {
    if (raw == null) return null;
    const value = String(raw).trim().replace(/"|'/g, '');
    if (!value || value.toLowerCase() === 'normal' || value === '1.0') {
      return value === '1.0' ? '1' : null;
    }
    return value;
  };

  const normalizeLineHeightValue = (raw: unknown): string | null => {
    const sanitized = sanitizeLineHeightValue(raw);
    if (!sanitized) return null;

    if (LINE_HEIGHT_VALUES.includes(sanitized)) {
      return sanitized;
    }

    if (sanitized.endsWith('%')) {
      const percent = parseFloat(sanitized);
      if (Number.isFinite(percent)) {
        const decimal = (percent / 100).toFixed(2);
        return normalizeLineHeightValue(decimal);
      }
    }

    if (!Number.isNaN(Number(sanitized))) {
      const valueNumber = Number(sanitized);
      const allowedNumbers = LINE_HEIGHT_VALUES.map((entry) => Number(entry));
      const closest = allowedNumbers.reduce((prev, curr) => {
        if (prev === null) return curr;
        return Math.abs(curr - valueNumber) < Math.abs(prev - valueNumber) ? curr : prev;
      }, null as number | null);

      if (closest !== null) {
        return closest.toString();
      }
    }

    return sanitized;
  };

  const normalizeParagraphSpacingValue = (raw: unknown): string | null => {
    if (raw == null) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;

    if (PARAGRAPH_SPACING_VALUES.includes(trimmed)) return trimmed;

    if (trimmed.endsWith('px')) {
      const n = parseFloat(trimmed);
      return Number.isFinite(n) ? `${n}px` : trimmed;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const allowedNumbers = PARAGRAPH_SPACING_VALUES
        .filter((v) => !v.endsWith('px'))
        .map((entry) => Number(entry));
      if (allowedNumbers.length) {
        const target = allowedNumbers.reduce((closest, current) => {
          if (closest === null) return current;
          return Math.abs(current - numeric) < Math.abs(closest - numeric) ? current : closest;
        }, null as number | null);
        if (target !== null) return String(target);
      }
      return String(numeric);
    }

    return trimmed;
  };

  function sanitizeNode(node: any): any {
    if (!node || typeof node !== 'object') return node;

    // Normalize textblock spacing / line-height attributes
    if (TEXTBLOCK_TYPES.has(node.type)) {
      const attrs = { ...(node.attrs || {}) } as any;

      // Ensure a sensible default line-height if missing, then normalize
      if (attrs.lineHeight == null) {
        if (node.type === 'paragraph') {
          attrs.lineHeight = DEFAULT_PARAGRAPH_LINE_HEIGHT;
        } else if (node.type === 'heading') {
          attrs.lineHeight = DEFAULT_HEADING_LINE_HEIGHT;
        }
      }

      if (attrs.lineHeight != null) {
        const normalized = normalizeLineHeightValue(attrs.lineHeight);
        if (normalized) {
          attrs.lineHeight = normalized;
        } else {
          delete attrs.lineHeight;
        }
      }

      if (node.type === 'paragraph') {
        // For imported paragraphs, ensure there is at least some spacing after.
        const current = attrs.paragraphSpacing ?? DEFAULT_PARAGRAPH_SPACING;
        const normalized = normalizeParagraphSpacingValue(current);
        if (normalized) {
          attrs.paragraphSpacing = normalized;
        } else {
          delete attrs.paragraphSpacing;
        }
      } else if (node.type === 'heading') {
        const current = attrs.paragraphSpacing ?? DEFAULT_HEADING_SPACING;
        const normalized = normalizeParagraphSpacingValue(current);
        if (normalized) {
          attrs.paragraphSpacing = normalized;
        } else {
          delete attrs.paragraphSpacing;
        }
      } else if (attrs.paragraphSpacing != null) {
        const normalized = normalizeParagraphSpacingValue(attrs.paragraphSpacing);
        if (normalized) {
          attrs.paragraphSpacing = normalized;
        } else {
          delete attrs.paragraphSpacing;
        }
      }

      node.attrs = attrs;
    }

    // Recursively sanitize children
    if (Array.isArray(node.content)) {
      const nextContent: any[] = [];
      for (const child of node.content) {
        const cleanChild = sanitizeNode(child);
        if (!cleanChild) continue;
        nextContent.push(cleanChild);
      }
      node.content = nextContent;
    }

    return node;
  }

  // Build sanitized top-level content
  const safeContent: any[] = [];
  for (const node of doc.content) {
    const clean = sanitizeNode(node);
    if (!clean) continue;
    safeContent.push(clean);
  }

  // Rebuild Word-style "Table of Contents" block into a clean ordered list
  function rebuildTableOfContents(docNode: any): any {
    try {
      if (!docNode || typeof docNode !== 'object' || !Array.isArray(docNode.content)) {
        return docNode;
      }

      const content = docNode.content as any[];

      type HeadingInfo = { index: number; level: number; text: string };
      const headings: HeadingInfo[] = [];

      const normalizeLabel = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

      let tocHeadingIndex = -1;

      for (let i = 0; i < content.length; i += 1) {
        const node = content[i];
        if (!node) continue;

        if (node.type === 'heading') {
          const level = typeof node.attrs?.level === 'number' ? node.attrs.level : null;
          if (!level) continue;

          const rawText = collectNodeText(node);
          const text = rawText.replace(/\s+/g, ' ').trim();
          if (!text) continue;

          headings.push({ index: i, level, text });
          if (tocHeadingIndex === -1 && normalizeLabel(text) === 'table of contents') {
            tocHeadingIndex = i;
          }
        } else if (node.type === 'paragraph' && tocHeadingIndex === -1) {
          const rawText = collectNodeText(node);
          const text = rawText.replace(/\s+/g, ' ').trim();
          if (!text) continue;

          if (normalizeLabel(text) === 'table of contents') {
            tocHeadingIndex = i;

            const attrs = { ...(node.attrs || {}) } as any;
            if (attrs.lineHeight == null) {
              attrs.lineHeight = DEFAULT_HEADING_LINE_HEIGHT;
            }
            if (attrs.paragraphSpacing == null) {
              attrs.paragraphSpacing = DEFAULT_HEADING_SPACING;
            }

            attrs.textAlign = attrs.textAlign ?? null;
            attrs.level = typeof attrs.level === 'number' ? attrs.level : 1;

            const headingNode = {
              ...node,
              type: 'heading',
              attrs,
            };

            content[i] = headingNode;
            headings.push({ index: i, level: attrs.level, text });
          }
        }
      }

      if (!headings.length || tocHeadingIndex === -1) {
        return docNode;
      }

      // Determine the current TOC region: from after the TOC heading
      // up until the next heading (which usually starts the main content).
      const tocStart = tocHeadingIndex + 1;
      let tocEnd = content.length;
      for (let i = tocStart; i < content.length; i += 1) {
        const node = content[i];
        if (node?.type === 'heading') {
          tocEnd = i;
          break;
        }
      }

      if (tocStart >= tocEnd) {
        return docNode;
      }

      const docTitleIndex = headings[0]?.index ?? -1;

      // Build TOC entries from real headings (excluding the document title
      // and the TOC heading itself). Limit to levels 1-3 for clarity.
      const headingsForToc = headings.filter((h) => {
        if (h.index === tocHeadingIndex || h.index === docTitleIndex) return false;
        if (h.level < 1 || h.level > 3) return false;
        return true;
      });

      if (!headingsForToc.length) {
        return docNode;
      }

      const listItems = headingsForToc.map((h) => ({
        type: 'listItem',
        attrs: {},
        content: [
          {
            type: 'paragraph',
            attrs: {
              textAlign: null,
              lineHeight: DEFAULT_PARAGRAPH_LINE_HEIGHT,
              paragraphSpacing: DEFAULT_PARAGRAPH_SPACING,
            },
            content: [
              {
                type: 'text',
                text: h.text,
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: `#toc:${encodeURIComponent(h.text)}`,
                      target: null,
                      rel: null,
                    },
                  },
                ],
              },
            ],
          },
        ],
      }));

      const tocListNode = {
        type: 'orderedList',
        attrs: {},
        content: listItems,
      };

      const nextContent = [
        // Everything up to and including the TOC heading
        ...content.slice(0, tocStart),
        // Rebuilt clean TOC list
        tocListNode,
        // Everything after the original TOC region
        ...content.slice(tocEnd),
      ];

      return { ...docNode, content: nextContent };
    } catch {
      // On any unexpected error, return the original doc node unchanged.
      return docNode;
    }
  }

  const normalizedDoc = rebuildTableOfContents({ ...doc, content: safeContent });
  return normalizedDoc;
}

/**
 * Convert HTML to Tiptap JSON format with validation
 * Validates that the generated JSON can actually be loaded by Tiptap
 */
function htmlToTiptapJson(html: string): string {
  try {
    const extensions = getTiptapExtensions();
    console.info('[convert] starting htmlToTiptapJson', { htmlLength: html?.length ?? 0 });
    
    // NEW: Log problematic HTML before conversion
    if (html.includes('</html>') && !html.includes('<body>')) {
      console.warn('HTML appears to be full document but missing body tag');
    }
    
    const json = generateJSON(html, extensions);
    console.info('[convert] generateJSON produced', { 
      hasContent: !!json?.content, 
      contentLength: Array.isArray(json?.content) ? json.content.length : 0,
      jsonPreview: JSON.stringify(json).substring(0, 200),
      json: json
    });
    
    // Step 1: Basic structure validation
    if (!isValidTiptapJson(json)) {
      console.warn('Generated Tiptap JSON has invalid structure, using fallback');
      throw new Error('Invalid Tiptap JSON structure');
    }
    
    // Step 2: Validate that Tiptap can actually load this JSON via Editor
    if (!validateTiptapJsonWithEditor(json)) {
      console.warn('Generated Tiptap JSON rejected by Editor, using fallback');
      throw new Error('Tiptap Editor validation failed');
    }
    
    // Step 3: Validate that Tiptap can render it by converting back to HTML
    if (!validateTiptapJsonCanLoad(json)) {
      console.warn('Generated Tiptap JSON cannot be loaded by Tiptap, using fallback');
      throw new Error('Tiptap JSON validation failed');
    }

    // Step 4: Normalize via HTML roundtrip to reduce edge-case structures
    let finalJson: any = json;
    try {
      const roundtripHtml = generateHTML(json, extensions);
      const normalizedJson = generateJSON(roundtripHtml, extensions);
      console.info('[convert] normalized JSON via HTML roundtrip', {
        hasContent: !!normalizedJson?.content,
        contentLength: Array.isArray(normalizedJson?.content) ? normalizedJson.content.length : 0,
      });

      if (
        isValidTiptapJson(normalizedJson) &&
        validateTiptapJsonWithEditor(normalizedJson) &&
        validateTiptapJsonCanLoad(normalizedJson)
      ) {
        finalJson = normalizedJson;
      } else {
        console.warn('[convert] normalized JSON failed validation, keeping original JSON');
      }
    } catch (normError) {
      console.warn('[convert] normalization via HTML roundtrip failed, keeping original JSON', normError);
    }

    // Step 5: Additional structural sanitization (e.g. tables) to simplify
    // complex node patterns that may cause editor position errors
    finalJson = sanitizeDocForEditor(finalJson);

    // Step 6: Additional validation - ensure JSON can be stringified and parsed back
    const jsonString = JSON.stringify(finalJson);
    const reparsed = JSON.parse(jsonString);
    if (!isValidTiptapJson(reparsed)) {
      console.warn('Tiptap JSON cannot be round-tripped, using fallback');
      throw new Error('Tiptap JSON round-trip validation failed');
    }

    // NEW: Fallback for empty content
    if (!finalJson.content || finalJson.content.length === 0) {
      console.warn('Generated Tiptap JSON has no content, using fallback');
      
      // Try to create minimal content from text nodes
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const textContent = tempDiv.textContent || 'Content conversion failed';
      
      const fallbackJson = {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: textContent }]
        }]
      };
      return JSON.stringify(fallbackJson);
    }

    return jsonString;
  } catch (error) {
    console.error('Error converting HTML to Tiptap JSON:', error);
    
    // Fallback: return minimal valid Tiptap JSON structure
    const fallbackJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: null, lineHeight: null, paragraphSpacing: null },
          content: [{ type: 'text', text: 'Content conversion failed. Please try a different format.' }],
        },
      ],
    };
    
    // Validate fallback can be loaded
    if (!validateTiptapJsonCanLoad(fallbackJson)) {
      // Ultimate fallback - minimal valid structure
      const minimalJson = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
      };
      return JSON.stringify(minimalJson);
    }
    
    return JSON.stringify(fallbackJson);
  }
}

/**
 * Convert HTML file to Tiptap JSON format
 */
export async function convertHtmlToTiptap(file: File): Promise<string> {
  try {
    const htmlContent = await file.text();
    console.info('[convert] HTML file read', { name: file.name, size: htmlContent.length });
    
    // Clean HTML - remove script tags, meta tags, etc.
    const cleanHtml = cleanHtmlForEditor(htmlContent);
    console.info('[convert] HTML cleaned', { length: cleanHtml.length });
    
    // Convert HTML to Tiptap JSON format
    return htmlToTiptapJson(cleanHtml);
  } catch (error) {
    console.error('Error converting HTML:', error);
    throw new Error('Failed to convert HTML file');
  }
}

/**
 * Convert DOCX to Tiptap JSON format
 */
export async function convertDocxToTiptap(file: File): Promise<string> {
  try {
    const docPath = (file as any).path as string | undefined;
    let arrayBuffer: ArrayBuffer | undefined;
    if (typeof (file as any).arrayBuffer === 'function') {
      arrayBuffer = await (file as any).arrayBuffer();
    } else if ((file as any).buffer instanceof ArrayBuffer) {
      arrayBuffer = (file as any).buffer as ArrayBuffer;
    } else if ((file as any).buffer?.buffer instanceof ArrayBuffer) {
      // Node Buffer case
      const buf: Buffer = (file as any).buffer;
      arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
    
    if (!arrayBuffer && !docPath) {
      throw new Error('Missing arrayBuffer or path for DOCX conversion');
    }
    
    console.info('[convert] DOCX start', { name: file.name, size: file.size, hasArrayBuffer: !!arrayBuffer, hasPath: !!docPath, bufferLength: arrayBuffer?.byteLength });
    
    const mammothInput = docPath
      ? { path: docPath }
      : { arrayBuffer: arrayBuffer as ArrayBuffer };
    
    // Use mammoth to convert DOCX to HTML with comprehensive style mapping
    const result = await mammoth.convertToHtml(
      mammothInput,
      {
        styleMap: [
          // Heading mappings (Tiptap supports h1-h4)
          "p[style-name='Heading 1'] => h1",
          "p[style-name='Heading 2'] => h2",
          "p[style-name='Heading 3'] => h3",
          "p[style-name='Heading 4'] => h4",
          "p[style-name='Title'] => h1",
          "p[style-name='Subtitle'] => h2",
          "p[style-name='Heading'] => h2",
          // Text formatting
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
          "r[style-name='Bold'] => strong",
          "r[style-name='Italic'] => em",
          // Lists
          "p[style-name='List Paragraph'] => p",
          // Block quotes
          "p[style-name='Quote'] => blockquote p",
          "p[style-name='Intense Quote'] => blockquote p",
        ],
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            // Convert images to base64 for Tiptap ImagePlus extension
            const buffer = await image.read();
            let arrayBuffer: ArrayBuffer;
            if (buffer instanceof ArrayBuffer) {
              arrayBuffer = buffer;
            } else {
              const view = new Uint8Array(buffer);
              arrayBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
            }
            const base64 = arrayBufferToBase64(arrayBuffer);
            return {
              src: `data:${image.contentType || 'image/png'};base64,${base64}`,
            };
          } catch (imgError) {
            console.warn('Failed to convert image:', imgError);
            // Return placeholder if image conversion fails
            return {
              src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=',
            };
          }
        }),
        // Preserve formatting but clean up Word-specific attributes
        ignoreEmptyParagraphs: false,
      }
    );

    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX conversion warnings:', result.messages);
    }

    // Clean and normalize the HTML for Tiptap
    const cleanedHtml = cleanHtmlForEditor(result.value);
    console.info('[convert] DOCX cleaned HTML', { length: cleanedHtml.length });
    
    // Validate the output is valid HTML that Tiptap can parse
    if (!cleanedHtml || cleanedHtml.trim() === '') {
      return JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', attrs: { textAlign: null, lineHeight: null, paragraphSpacing: null } }],
      });
    }
    
    // Convert HTML to Tiptap JSON format
    return htmlToTiptapJson(cleanedHtml);
  } catch (error) {
    console.error('Error converting DOCX:', error);
    throw new Error('Failed to convert DOCX file');
  }
}

/**
 * Convert PDF to Tiptap JSON format
 * Note: PDF text extraction is limited - complex layouts may not preserve well
 */
export async function convertPdfToTiptap(file: File): Promise<string> {
  try {
    // For PDF, we need to extract text
    // This is a basic implementation - for better results, use a PDF parsing library
    const text = await extractTextFromPdf(file);
    
    // Convert plain text to simple HTML paragraphs
    const paragraphs = text
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${escapeHtml(p.trim())}</p>`)
      .join('');
    
    const html = paragraphs || '<p></p>';
    
    // Convert HTML to Tiptap JSON format
    return htmlToTiptapJson(html);
  } catch (error) {
    console.error('Error converting PDF:', error);
    throw new Error('Failed to convert PDF file. Consider using DOCX format for better results.');
  }
}

// ============================================
// SPREADSHEET CONVERSIONS (for Univer)
// ============================================

/**
 * Convert XLSX to Univer workbook format using LuckyExcel (trusted code from store)
 */
export async function convertXlsxToUniver(file: File): Promise<IWorkbookData> {
  try {
    // Use LuckyExcel for XLSX conversion (same approach as store/files.ts:1900-1949)
    const impMod: any = await import(/* @vite-ignore */ '@mertdeveci55/univer-import-export').catch(() => null);

    // The univer-import-export bundle may expose LuckyExcel in a few different ways, depending
    // on whether the ESM/CJS build is loaded:
    // - impMod.LuckyExcel (named export object)
    // - impMod.default (class with static methods)
    // - impMod itself (CommonJS default export)
    const LuckyExcel: any =
      impMod?.LuckyExcel ??
      impMod?.default ??
      impMod;

    if (!LuckyExcel || typeof LuckyExcel.transformExcelToUniver !== 'function') {
      throw new Error('LuckyExcel (univer-import-export) not available for XLSX conversion');
    }

    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mime });
    const name = file.name || 'workbook.xlsx';
    const fileObj = new File([blob], name, { type: mime });
    
    const workbookData: any = await new Promise((resolve, reject) => {
      try {
        LuckyExcel.transformExcelToUniver(
          fileObj,
          (univerData: any) => resolve(univerData),
          (error: any) => reject(error)
        );
      } catch (err) {
        reject(err);
      }
    });

    if (!workbookData) {
      throw new Error('LuckyExcel conversion returned no data');
    }

    // Generate a new ID for the workbook data
    if (!workbookData.id) {
      workbookData.id = 'wkbook-' + Math.random().toString(36).slice(2);
    }
    if (!workbookData.name) {
      workbookData.name = file.name?.replace(/\.xlsx$/i, '') || 'Spreadsheet';
    }

    return workbookData as IWorkbookData;
  } catch (error) {
    console.error('LuckyExcel conversion failed:', error);
    throw new Error('Failed to convert XLSX file');
  }
}

/**
 * Convert CSV to Univer workbook format
 * Note: CSV is first converted to XLSX format, then processed with LuckyExcel
 */
export async function convertCsvToUniver(file: File): Promise<IWorkbookData> {
  try {
    const text = await file.text();
    
    // Parse CSV using XLSX to convert to workbook format
    const workbook = XLSX.read(text, { 
      type: 'string',
      raw: true,
      cellDates: true,
    });

    // Convert XLSX workbook to binary format for LuckyExcel
    const xlsxBuffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx' 
    });
    
    // Create a File object from the XLSX buffer
    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([xlsxBuffer], { type: mime });
    const xlsxFile = new File([blob], file.name.replace(/\.csv$/i, '.xlsx'), { type: mime });

    // Use LuckyExcel for conversion (same as XLSX)
    return await convertXlsxToUniver(xlsxFile);
  } catch (error) {
    console.error('Error converting CSV:', error);
    throw new Error('Failed to convert CSV file');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================


/**
 * Clean HTML for editor consumption
 * Returns HTML that Tiptap can parse directly via setContent()
 */
function cleanHtmlForEditor(html: string): string {
  if (!html || typeof html !== 'string') {
    return '<p></p>';
  }

  // Log original HTML for debugging
  console.info('[cleanHtml] Original HTML', { length: html.length, startsWith: html.substring(0, 100) });

  // Extract body content if full HTML document
  let clean = html;
  
  // Remove full document wrappers (html, head, body tags) but keep content
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    clean = bodyMatch[1];
  }
  
  // Remove dangerous tags and their content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<meta\b[^>]*>/gi, '');
  clean = clean.replace(/<link\b[^>]*>/gi, '');
  clean = clean.replace(/<title\b[^<]*(?:(?!<\/title>)<[^<]*)*<\/title>/gi, '');
  
  // Remove Word-specific artifacts (Mso classes and styles)
  clean = clean.replace(/\s*class="[^"]*Mso[^"]*"/gi, '');
  clean = clean.replace(/\s*style="[^"]*mso-[^"]*"/gi, '');
  clean = clean.replace(/\s*style="[^"]*font-family:[^"]*mso-[^"]*"/gi, '');
  
  // Remove empty style attributes
  clean = clean.replace(/\s*style="\s*"/gi, '');
  
  // Normalize whitespace between tags (preserve structure)
  // Remove whitespace between tags (this is safe - HTML naturally handles this)
  clean = clean.replace(/>\s+</g, '><');
  
  // Collapse multiple spaces/tabs/newlines within text content to single space
  // This preserves readability while cleaning up Word's excessive whitespace
  clean = clean.replace(/([^>])\s{2,}([^<])/g, '$1 $2');
  
  clean = clean.trim();
  
  // Log cleaned HTML for debugging
  console.info('[cleanHtml] Cleaned HTML', { length: clean.length, startsWith: clean.substring(0, 100) });
  
  // Ensure we have valid content structure
  if (!clean || clean === '') {
    return '<p></p>';
  }
  
  // Validate HTML structure for Tiptap compatibility
  // Tiptap expects block-level elements: p, h1-h6, ul, ol, blockquote, pre, table, etc.
  const hasBlockElements = /<(p|h[1-6]|ul|ol|li|blockquote|pre|table|tr|td|th|div)/i.test(clean);
  
  if (!hasBlockElements) {
    // If no block elements found, wrap in paragraph
    const textOnly = clean.replace(/<[^>]+>/g, '').trim();
    if (textOnly) {
      clean = `<p>${clean}</p>`;
    } else {
      return '<p></p>';
    }
  }
  
  // Ensure tables have proper structure (Tiptap TablePlus expects table > tbody > tr > td/th)
  // Mammoth should handle this, but we verify and fix if needed
  if (/<table/i.test(clean) && !/<tbody/i.test(clean)) {
    // Wrap tr elements in tbody if missing (Tiptap requires tbody)
    clean = clean.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, (match, attrs, content) => {
      if (!/<tbody/i.test(content)) {
        // Wrap all tr elements in tbody
        return `<table${attrs}><tbody>${content}</tbody></table>`;
      }
      return match;
    });
  }
  
  // Final validation: Ensure HTML is well-formed and Tiptap-compatible
  // Tiptap's setContent() can handle HTML strings, but we ensure basic structure
  try {
    // Quick validation: check for balanced tags (basic check)
    const openTags = (clean.match(/<[^\/!][^>]*>/g) || []).length;
    const closeTags = (clean.match(/<\/[^>]+>/g) || []).length;
    
    // Self-closing tags (img, br, hr, etc.) don't need closing tags
    const selfClosingTags = (clean.match(/<(img|br|hr|input|meta|link)[^>]*>/gi) || []).length;
    
    // Basic balance check (allowing for self-closing tags)
    if (openTags > closeTags + selfClosingTags + 5) {
      console.warn('HTML structure may be unbalanced, but proceeding anyway');
    }
  } catch (validationError) {
    console.warn('HTML validation check failed:', validationError);
  }
  
  return clean;
}

/**
 * Extract text from PDF (basic implementation)
 */
async function extractTextFromPdf(file: File): Promise<string> {
  // This is a placeholder - for production, use a library like pdf.js
  // For now, return a message
  return `PDF content from: ${file.name}\n\nNote: PDF text extraction requires additional setup. For best results, convert PDFs to DOCX before importing.`;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}


// ============================================
// MAIN CONVERTER FUNCTION
// ============================================

export interface ConversionResult {
  content: string | IWorkbookData;
  fileType: 'docx' | 'xlsx';
  metadata?: {
    originalFormat: string;
    convertedAt: Date;
  };
}


/**
 * Convert file to appropriate editor format
 */
export async function convertFileForEditor(file: File): Promise<ConversionResult> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Determine file category and convert
  if (
    fileName.endsWith('.html') ||
    fileName.endsWith('.htm') ||
    fileType.includes('html')
  ) {
    const content = await convertHtmlToTiptap(file);
    return {
      content,
      fileType: 'docx',
      metadata: {
        originalFormat: 'html',
        convertedAt: new Date(),
      },
    };
  }

  if (
    fileName.endsWith('.docx') ||
    fileType.includes('officedocument.wordprocessingml')
  ) {
    const content = await convertDocxToTiptap(file);
    return {
      content,
      fileType: 'docx',
      metadata: {
        originalFormat: 'docx',
        convertedAt: new Date(),
      },
    };
  }

  if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
    const content = await convertPdfToTiptap(file);
    return {
      content,
      fileType: 'docx',
      metadata: {
        originalFormat: 'pdf',
        convertedAt: new Date(),
      },
    };
  }

  if (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileType.includes('spreadsheet')
  ) {
    const content = await convertXlsxToUniver(file);
    return {
      content,
      fileType: 'xlsx',
      metadata: {
        originalFormat: fileName.endsWith('.xls') ? 'xls' : 'xlsx',
        convertedAt: new Date(),
      },
    };
  }

  if (fileName.endsWith('.csv') || fileType.includes('csv')) {
    const content = await convertCsvToUniver(file);
    return {
      content,
      fileType: 'xlsx',
      metadata: {
        originalFormat: 'csv',
        convertedAt: new Date(),
      },
    };
  }

  throw new Error(`Unsupported file format: ${fileName}`);
}