/**
 * Page Node Extension
 * 
 * Represents a single page in the document. Each page has fixed dimensions
 * and contains content that flows within its boundaries.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface PageNodeAttributes {
  pageNumber: number;
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const PageNode = Node.create({
  name: 'page',

  group: 'block',
  
  // A page can contain any block content
  content: 'block+',
  
  // Pages are isolating - selections don't cross page boundaries easily
  isolating: true,
  
  // Pages are not draggable
  draggable: false,

  addAttributes() {
    return {
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
      width: {
        default: 794, // A4 width at 96 DPI
        parseHTML: (element) => {
          const w = element.getAttribute('data-width');
          return w ? parseInt(w, 10) : 794;
        },
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
        }),
      },
      height: {
        default: 1123, // A4 height at 96 DPI
        parseHTML: (element) => {
          const h = element.getAttribute('data-height');
          return h ? parseInt(h, 10) : 1123;
        },
        renderHTML: (attributes) => ({
          'data-height': attributes.height,
        }),
      },
      marginTop: {
        default: 72,
        parseHTML: (element) => {
          const m = element.getAttribute('data-margin-top');
          return m ? parseInt(m, 10) : 72;
        },
        renderHTML: (attributes) => ({
          'data-margin-top': attributes.marginTop,
        }),
      },
      marginBottom: {
        default: 72,
        parseHTML: (element) => {
          const m = element.getAttribute('data-margin-bottom');
          return m ? parseInt(m, 10) : 72;
        },
        renderHTML: (attributes) => ({
          'data-margin-bottom': attributes.marginBottom,
        }),
      },
      marginLeft: {
        default: 72,
        parseHTML: (element) => {
          const m = element.getAttribute('data-margin-left');
          return m ? parseInt(m, 10) : 72;
        },
        renderHTML: (attributes) => ({
          'data-margin-left': attributes.marginLeft,
        }),
      },
      marginRight: {
        default: 72,
        parseHTML: (element) => {
          const m = element.getAttribute('data-margin-right');
          return m ? parseInt(m, 10) : 72;
        },
        renderHTML: (attributes) => ({
          'data-margin-right': attributes.marginRight,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'section[data-page]',
      },
      {
        tag: 'div[data-page]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as PageNodeAttributes;
    
    const style = [
      `width: ${attrs.width}px`,
      `min-height: ${attrs.height}px`,
      `padding: ${attrs.marginTop}px ${attrs.marginRight}px ${attrs.marginBottom}px ${attrs.marginLeft}px`,
      'position: relative',
      'background: var(--page-background, #ffffff)',
      'box-sizing: border-box',
      'overflow: hidden',
    ].join('; ');

    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-page': 'true',
        'class': 'pagination-page',
        style,
      }),
      0, // Content hole
    ];
  },
});
