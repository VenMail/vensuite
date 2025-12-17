/**
 * Page Footer Node Extension
 * 
 * Renders at the bottom of each page with support for left/center/right content
 * and page number placeholders.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const PageFooter = Node.create({
  name: 'pageFooter',

  group: 'block',
  content: 'inline*',
  
  // Footers are not directly editable in flow - managed by pagination
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
        default: '{page}',
        parseHTML: (element) => element.getAttribute('data-right') || '{page}',
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
      totalPages: {
        default: 1,
        parseHTML: (element) => {
          const num = element.getAttribute('data-total-pages');
          return num ? parseInt(num, 10) : 1;
        },
        renderHTML: (attributes) => ({
          'data-total-pages': attributes.totalPages,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'footer[data-page-footer]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs;
    
    // Replace placeholders with actual values
    const formatContent = (content: string) => {
      return content
        .replace(/\{page\}/g, String(attrs.pageNumber))
        .replace(/\{PAGE\}/g, String(attrs.pageNumber))
        .replace(/\{total\}/g, String(attrs.totalPages))
        .replace(/\{TOTAL\}/g, String(attrs.totalPages))
        .replace(/\{pages\}/g, String(attrs.totalPages));
    };

    const style = [
      'display: flex',
      'justify-content: space-between',
      'align-items: center',
      'width: 100%',
      'padding-top: 8px',
      'border-top: 1px solid var(--page-border-color, #e5e7eb)',
      'margin-top: 16px',
      'font-size: 11px',
      'color: #6b7280',
      'position: absolute',
      'bottom: 0',
      'left: 0',
      'right: 0',
      'padding-left: inherit',
      'padding-right: inherit',
      'padding-bottom: inherit',
      'box-sizing: border-box',
    ].join('; ');

    return [
      'footer',
      mergeAttributes(HTMLAttributes, {
        'data-page-footer': 'true',
        'class': 'pagination-footer',
        style,
      }),
      [
        'span',
        { class: 'footer-left', style: 'flex: 1; text-align: left;' },
        formatContent(attrs.leftContent || ''),
      ],
      [
        'span',
        { class: 'footer-center', style: 'flex: 1; text-align: center;' },
        formatContent(attrs.centerContent || ''),
      ],
      [
        'span',
        { class: 'footer-right', style: 'flex: 1; text-align: right;' },
        formatContent(attrs.rightContent || ''),
      ],
    ];
  },
});
