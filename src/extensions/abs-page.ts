import { Node, mergeAttributes } from '@tiptap/core';

export const AbsPage = Node.create({
  name: 'absPage',

  group: 'block',
  content: 'absLayer',
  isolating: true,

  addAttributes() {
    return {
      pageNumber: { default: 1 },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-abs-page]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const pageNumber = node.getAttribute('data-page-number');
          const width = node.getAttribute('data-width');
          const height = node.getAttribute('data-height');
          return {
            pageNumber: pageNumber ? Number(pageNumber) : 1,
            width: width ? Number(width) : null,
            height: height ? Number(height) : null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { pageNumber, width, height } = node.attrs as any;

    const styleParts = [
      'position:relative',
      width != null ? `width:${width}px` : '',
      height != null ? `height:${height}px` : '',
    ].filter(Boolean);

    const dataAttrs: Record<string, any> = {
      'data-abs-page': 'true',
      'data-page-number': pageNumber,
    };

    if (width != null) dataAttrs['data-width'] = width;
    if (height != null) dataAttrs['data-height'] = height;

    return ['section', mergeAttributes(dataAttrs, { style: styleParts.join(';') }), 0];
  },
});
