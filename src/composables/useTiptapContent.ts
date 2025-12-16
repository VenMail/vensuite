import type { Editor } from '@tiptap/vue-3';
import { maybeConvertHtmlToAnnotatedAbsoluteHtml } from '@/utils/html-to-tiptap';
import { preprocessHtmlEmbeds } from '@/utils/html-preprocess';

function tryParseJSON(input: string): any | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function isTiptapDoc(obj: any): boolean {
  return obj && typeof obj === 'object' && obj.type === 'doc';
}

function isLikelyHTML(input: string): boolean {
  return /<\s*(p|div|h\d|span|ul|ol|li|table|thead|tbody|tr|td|img|a|canvas|script|form|input|select|textarea|button)[^>]*>/i.test(input);
}

function isLikelyBase64(input: string): boolean {
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(input)) return false;
  return input.length > 64;
}

function safeAtob(input: string): string | null {
  try {
    const cleaned = input.replace(/\s+/g, '');
    return atob(cleaned);
  } catch {
    return null;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function applyContentToEditor(editor: Editor, raw: string): void {
  if (!editor) return;
  if (typeof raw !== 'string' || !raw.length) return;

  const countNodeTypes = (node: any, out: Record<string, number>) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.type === 'string') {
      out[node.type] = (out[node.type] || 0) + 1;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) countNodeTypes(child, out);
    }
  };

  const getDocStats = () => {
    try {
      const doc = editor.getJSON();
      const counts: Record<string, number> = {};
      countNodeTypes(doc, counts);
      return {
        topLevel: Array.isArray(doc?.content) ? doc.content.length : 0,
        counts,
      };
    } catch {
      return null;
    }
  };

  let applied = false;

  // 1) Tiptap JSON string
  const json = tryParseJSON(raw);
  if (json && isTiptapDoc(json)) {
    editor.commands.setContent(json);
    applied = true;
  }

  // 2) Base64 -> JSON/HTML
  if (!applied && isLikelyBase64(raw)) {
    const decoded = safeAtob(raw);
    if (decoded) {
      const decodedJson = tryParseJSON(decoded);
      if (decodedJson && isTiptapDoc(decodedJson)) {
        editor.commands.setContent(decodedJson);
        applied = true;
      } else if (isLikelyHTML(decoded)) {
        editor.commands.setContent(preprocessHtmlEmbeds(decoded));
        applied = true;
      }
    }
  }

  // 3) HTML
  if (!applied && isLikelyHTML(raw)) {
    const preprocessed = preprocessHtmlEmbeds(raw);
    const converted = maybeConvertHtmlToAnnotatedAbsoluteHtml(preprocessed, {
      pageWidthPx: 794,
      pageHeightPx: 1123,
    });
    const html = converted || preprocessed;
    editor.commands.setContent(html);

    const stats = getDocStats();
    console.info('[tiptap-content] applied HTML content', {
      usedConverted: !!converted,
      inputLength: html.length,
      stats,
    });

    if (converted && stats && stats.topLevel === 0) {
      console.warn('[tiptap-content] converted HTML produced empty doc, retrying with original HTML', {
        convertedLength: converted.length,
        originalLength: preprocessed.length,
      });
      editor.commands.setContent(preprocessed);
      console.info('[tiptap-content] after retrying original HTML', { stats: getDocStats() });
    }
    applied = true;
  }

  // 4) Plain text fallback
  if (!applied) {
    const escaped = escapeHtml(raw);
    editor.commands.setContent(`<p>${escaped.replace(/\n/g, '<br>')}</p>`);
  }
}

/**
 * Detect if the editor currently contains an embedded stringified Tiptap JSON
 * e.g. one paragraph with text starting with {"type":"doc" ... that is parseable.
 */
export function isEmbeddedDocJsonText(editor: Editor): boolean {
  try {
    const doc = editor.getJSON();
    if (!doc || !Array.isArray(doc.content) || doc.content.length !== 1) return false;
    const first = doc.content[0];
    if (first.type !== 'paragraph' || !Array.isArray(first.content) || first.content.length !== 1) return false;
    const textNode = first.content[0];
    if (textNode.type !== 'text' || typeof textNode.text !== 'string') return false;
    const txt = textNode.text.trim();
    if (!txt.startsWith('{')) return false;
    const parsed = tryParseJSON(txt);
    return !!(parsed && isTiptapDoc(parsed));
  } catch {
    return false;
  }
}

/**
 * If the editor contains embedded stringified Tiptap JSON as text, parse it
 * and replace the document with the parsed JSON.
 * Returns true if a repair was performed.
 */
export function repairEditorFromEmbeddedJsonText(editor: Editor): boolean {
  try {
    const doc = editor.getJSON();
    if (!doc || !Array.isArray(doc.content) || doc.content.length !== 1) return false;
    const first = doc.content[0];
    if (first.type !== 'paragraph' || !Array.isArray(first.content) || first.content.length !== 1) return false;
    const textNode = first.content[0];
    if (textNode.type !== 'text' || typeof textNode.text !== 'string') return false;
    const txt = textNode.text.trim();
    const parsed = tryParseJSON(txt);
    if (parsed && isTiptapDoc(parsed)) {
      editor.commands.setContent(parsed);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Guard before save: if the editor has embedded doc JSON as text, auto-repair it.
 * Returns true if it repaired; false otherwise.
 */
export function guardEditorBeforeSave(editor: Editor): boolean {
  if (isEmbeddedDocJsonText(editor)) {
    return repairEditorFromEmbeddedJsonText(editor);
  }
  return false;
}
