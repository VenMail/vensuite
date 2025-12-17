/**
 * Page Header Node Extension
 * 
 * Renders at the top of each page with support for left/center/right content
 * and page number placeholders.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const PageHeader = Node.create({
  name: 'pageHeader',

  group: 'block',
  content: 'inline*',
  
  // Headers are not directly editable in flow - managed by pagination
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      leftContent: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-left') || '',
        renderHTML: (attributes) => ({
          'data-left': attributes.leftContent,
        }),
      },
      centerContent: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-center') || '',
        renderHTML: (attributes) => ({
          'data-center': attributes.centerContent,
        }),
      },
      rightContent: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-right') || '',
        renderHTML: (attributes) => ({
          'data-right': attributes.rightContent,
        }),
      },
      pageNumber: {
        default: 1,
        parseHTML: (element) => {
          const num = element.getAttribute('data-page-number');
          return num ? parseInt(num, 10) : 1;
        },
        renderHTML: (attributes) => ({
          'data-page-number': attributes.pageNumber,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'header[data-page-header]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs;
    
    // Replace {page} placeholder with actual page number
    const formatContent = (content: string) => {
      return content
        .replace(/\{page\}/g, String(attrs.pageNumber))
        .replace(/\{PAGE\}/g, String(attrs.pageNumber));
    };

    const style = [
      'display: flex',
      'justify-content: space-between',
      'align-items: center',
      'width: 100%',
      'padding-bottom: 8px',
      'border-bottom: 1px solid var(--page-border-color, #e5e7eb)',
      'margin-bottom: 16px',
      'font-size: 11px',
      'color: #6b7280',
    ].join('; ');

    return [
      'header',
      mergeAttributes(HTMLAttributes, {
        'data-page-header': 'true',
        'class': 'pagination-header',
        style,
      }),
      [
        'span',
        { class: 'header-left', style: 'flex: 1; text-align: left;' },
        formatContent(attrs.leftContent || ''),
      ],
      [
        'span',
        { class: 'header-center', style: 'flex: 1; text-align: center;' },
        formatContent(attrs.centerContent || ''),
      ],
      [
        'span',
        { class: 'header-right', style: 'flex: 1; text-align: right;' },
        formatContent(attrs.rightContent || ''),
      ],
    ];
  },
});
