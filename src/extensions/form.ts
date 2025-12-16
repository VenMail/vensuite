import { Node, mergeAttributes } from '@tiptap/core';

export interface FormAttrs {
  id?: string | null;
  name?: string | null;
  action?: string | null;
  method?: string | null;
}

export const FormExtension = Node.create({
  name: 'form',

  group: 'block',

  content: 'block*',

  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('id') || null,
        renderHTML: (attributes: { id?: string | null }) => (attributes.id ? { id: attributes.id } : {}),
      },
      name: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('name') || null,
        renderHTML: (attributes: { name?: string | null }) => (attributes.name ? { name: attributes.name } : {}),
      },
      action: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('action') || null,
        renderHTML: (attributes: { action?: string | null }) => (attributes.action ? { action: attributes.action } : {}),
      },
      method: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('method') || null,
        renderHTML: (attributes: { method?: string | null }) => (attributes.method ? { method: attributes.method } : {}),
      },
    } satisfies Record<string, any>;
  },

  parseHTML() {
    return [
      {
        tag: 'form',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['form', mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-type', 'form-node');
      dom.style.border = '1px dashed rgba(0,0,0,0.2)';
      dom.style.padding = '8px';
      dom.style.borderRadius = '6px';
      dom.style.margin = '8px 0';

      const header = document.createElement('div');
      header.textContent = 'Form';
      header.style.fontSize = '12px';
      header.style.opacity = '0.7';
      header.style.userSelect = 'none';
      header.style.marginBottom = '6px';

      const contentDOM = document.createElement('div');

      dom.appendChild(header);
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          return true;
        },
      };
    };
  },
});
