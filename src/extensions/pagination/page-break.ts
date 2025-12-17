/**
 * Page Break Node Extension
 * 
 * Represents an explicit page break inserted by the user.
 * This forces content after it to start on a new page.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const PageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',
  
  // Page breaks are atomic - no content inside
  atom: true,
  
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      // Whether this is a soft break (can be removed by auto-pagination)
      // or a hard break (user-inserted, preserved)
      breakType: {
        default: 'hard',
        parseHTML: (element) => element.getAttribute('data-break-type') || 'hard',
        renderHTML: (attributes) => ({
          'data-break-type': attributes.breakType,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-page-break]',
      },
      {
        tag: 'hr[data-page-break]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const style = [
      'display: block',
      'width: 100%',
      'height: 0',
      'border: none',
      'border-top: 2px dashed #d1d5db',
      'margin: 16px 0',
      'page-break-after: always',
      'break-after: page',
    ].join('; ');

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-page-break': 'true',
        'class': 'pagination-break',
        style,
        contenteditable: 'false',
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        return this.editor.commands.insertContent({
          type: this.name,
          attrs: { breakType: 'hard' },
        });
      },
    };
  },
});
