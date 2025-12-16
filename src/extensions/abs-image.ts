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

export const AbsImage = Node.create({
  name: 'absImage',

  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      x: { default: 0 },
      y: { default: 0 },
      width: { default: null },
      height: { default: null },
      src: { default: '' },
      alt: { default: null },
      page: { default: null },
      opacity: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-abs-image]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            x: parseCssPx(node.getAttribute('data-x')) ?? parseCssPx(getInlineStyle(node, 'left')) ?? 0,
            y: parseCssPx(node.getAttribute('data-y')) ?? parseCssPx(getInlineStyle(node, 'top')) ?? 0,
            width: parseCssPx(node.getAttribute('data-width')) ?? parseCssPx(getInlineStyle(node, 'width')),
            height: parseCssPx(node.getAttribute('data-height')) ?? parseCssPx(getInlineStyle(node, 'height')),
            src: node.getAttribute('src') || node.getAttribute('data-src') || '',
            alt: node.getAttribute('alt') || null,
            page: node.getAttribute('data-page') ? Number(node.getAttribute('data-page')) : null,
            opacity: parseCssPx(node.getAttribute('data-opacity')),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { x, y, width, height, src, alt, page, opacity } = node.attrs as any;

    const styleParts = [
      'position:absolute',
      `left:${Number(x) || 0}px`,
      `top:${Number(y) || 0}px`,
      'z-index:2',
      'pointer-events:none',
      'margin:0',
      'max-width:none',
      width != null ? `width:${width}px` : '',
      height != null ? `height:${height}px` : '',
      opacity != null ? `opacity:${opacity}` : '',
    ].filter(Boolean);

    const dataAttrs: Record<string, any> = {
      'data-abs-image': 'true',
      'data-x': x,
      'data-y': y,
      src,
    };

    if (width != null) dataAttrs['data-width'] = width;
    if (height != null) dataAttrs['data-height'] = height;
    if (alt) dataAttrs.alt = alt;
    if (page != null) dataAttrs['data-page'] = page;
    if (opacity != null) dataAttrs['data-opacity'] = opacity;

    return ['img', mergeAttributes(dataAttrs, { style: styleParts.join(';') })];
  },
});
