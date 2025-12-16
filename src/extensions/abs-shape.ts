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

export const AbsShape = Node.create({
  name: 'absShape',

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
      strokeColor: { default: null },
      strokeWidth: { default: null },
      fillColor: { default: null },
      radius: { default: null },
      opacity: { default: null },
      page: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-abs-shape]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            x: parseCssPx(node.getAttribute('data-x')) ?? parseCssPx(getInlineStyle(node, 'left')) ?? 0,
            y: parseCssPx(node.getAttribute('data-y')) ?? parseCssPx(getInlineStyle(node, 'top')) ?? 0,
            width: parseCssPx(node.getAttribute('data-width')) ?? parseCssPx(getInlineStyle(node, 'width')),
            height: parseCssPx(node.getAttribute('data-height')) ?? parseCssPx(getInlineStyle(node, 'height')),
            strokeColor: node.getAttribute('data-stroke-color') || null,
            strokeWidth: parseCssPx(node.getAttribute('data-stroke-width')),
            fillColor: node.getAttribute('data-fill-color') || null,
            radius: parseCssPx(node.getAttribute('data-radius')),
            opacity: parseCssPx(node.getAttribute('data-opacity')),
            page: node.getAttribute('data-page') ? Number(node.getAttribute('data-page')) : null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { x, y, width, height, strokeColor, strokeWidth, fillColor, radius, opacity, page } = node.attrs as any;

    const styleParts = [
      'position:absolute',
      `left:${Number(x) || 0}px`,
      `top:${Number(y) || 0}px`,
      'z-index:1',
      'pointer-events:none',
      'box-sizing:border-box',
      width != null ? `width:${width}px` : '',
      height != null ? `height:${height}px` : '',
      strokeWidth != null ? `border-width:${strokeWidth}px` : '',
      strokeColor ? `border-color:${strokeColor}` : '',
      strokeWidth != null ? 'border-style:solid' : '',
      fillColor ? `background-color:${fillColor}` : '',
      radius != null ? `border-radius:${radius}px` : '',
      opacity != null ? `opacity:${opacity}` : '',
    ].filter(Boolean);

    const dataAttrs: Record<string, any> = {
      'data-abs-shape': 'true',
      'data-x': x,
      'data-y': y,
    };

    if (width != null) dataAttrs['data-width'] = width;
    if (height != null) dataAttrs['data-height'] = height;
    if (strokeColor) dataAttrs['data-stroke-color'] = strokeColor;
    if (strokeWidth != null) dataAttrs['data-stroke-width'] = strokeWidth;
    if (fillColor) dataAttrs['data-fill-color'] = fillColor;
    if (radius != null) dataAttrs['data-radius'] = radius;
    if (opacity != null) dataAttrs['data-opacity'] = opacity;
    if (page != null) dataAttrs['data-page'] = page;

    return ['div', mergeAttributes(dataAttrs, { style: styleParts.join(';') })];
  },
});
