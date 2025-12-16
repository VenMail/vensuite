import { Node, mergeAttributes } from '@tiptap/core';

export const AbsLayer = Node.create({
  name: 'absLayer',

  group: 'block',
  content: '(absTable|absBlock|absImage|absShape)*',
  isolating: true,

  addAttributes() {
    return {
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-abs-layer]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const width = node.getAttribute('data-width');
          const height = node.getAttribute('data-height');
          return {
            width: width ? Number(width) : null,
            height: height ? Number(height) : null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { width, height } = node.attrs as any;

    const styleParts = [
      'position:relative',
      'display:block',
      width != null ? `width:${width}px` : 'width:100%',
      height != null ? `height:${height}px` : '',
      height != null ? 'overflow:hidden' : 'overflow:visible',
    ].filter(Boolean);

    const dataAttrs: Record<string, any> = {
      'data-abs-layer': 'true',
    };

    if (width != null) dataAttrs['data-width'] = width;
    if (height != null) dataAttrs['data-height'] = height;

    return ['div', mergeAttributes(dataAttrs, { style: styleParts.join(';') }), 0];
  },
});
