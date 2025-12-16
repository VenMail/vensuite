import { Node, mergeAttributes } from '@tiptap/core';

function parseCssPx(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = String(input).trim().match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getInlineStyle(el: HTMLElement, prop: keyof CSSStyleDeclaration): string {
  const anyStyle = el.style as any;
  const v = anyStyle?.[prop];
  return typeof v === 'string' ? v : '';
}

export const AbsTable = Node.create({
  name: 'absTable',

  group: 'block',
  content: 'table',
  isolating: true,

  addAttributes() {
    return {
      x: { default: 0 },
      y: { default: 0 },
      width: { default: null },
      height: { default: null },
      tableId: { default: null },
      page: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-abs-table]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            x: parseCssPx(node.getAttribute('data-x')) ?? parseCssPx(getInlineStyle(node, 'left')) ?? 0,
            y: parseCssPx(node.getAttribute('data-y')) ?? parseCssPx(getInlineStyle(node, 'top')) ?? 0,
            width: parseCssPx(node.getAttribute('data-width')) ?? parseCssPx(getInlineStyle(node, 'width')),
            height: parseCssPx(node.getAttribute('data-height')) ?? parseCssPx(getInlineStyle(node, 'height')),
            tableId: node.getAttribute('data-table-id') || null,
            page: node.getAttribute('data-page') ? Number(node.getAttribute('data-page')) : null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { x, y, width, height, tableId, page } = node.attrs as any;

    const styleParts = [
      'position:absolute',
      `left:${Number(x) || 0}px`,
      `top:${Number(y) || 0}px`,
      'z-index:3',
      width != null ? `width:${width}px` : '',
      height != null ? `height:${height}px` : '',
    ].filter(Boolean);

    const dataAttrs: Record<string, any> = {
      'data-abs-table': 'true',
      'data-x': x,
      'data-y': y,
    };

    if (width != null) dataAttrs['data-width'] = width;
    if (height != null) dataAttrs['data-height'] = height;
    if (tableId) dataAttrs['data-table-id'] = tableId;
    if (page != null) dataAttrs['data-page'] = page;

    return ['div', mergeAttributes(dataAttrs, { style: styleParts.join(';') }), 0];
  },
});
