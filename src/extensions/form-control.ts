import { Node, mergeAttributes } from '@tiptap/core';

export type FormControlTag = 'input' | 'select' | 'textarea' | 'button';

export interface FormControlOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormControlAttrs {
  tag: FormControlTag;
  inputType?: string;
  name?: string | null;
  id?: string | null;
  value?: string | null;
  placeholder?: string | null;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  options?: FormControlOption[];
  buttonType?: string;
  text?: string;
}

function normalizeTag(tag: unknown): FormControlTag {
  const t = String(tag || '').toLowerCase();
  if (t === 'select' || t === 'textarea' || t === 'button') return t;
  return 'input';
}

function parseBoolAttr(el: HTMLElement, attr: string): boolean {
  return el.hasAttribute(attr) && el.getAttribute(attr) !== 'false';
}

export const FormControlExtension = Node.create({
  name: 'formControl',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      tag: {
        default: 'input',
        parseHTML: (element: HTMLElement) => normalizeTag(element.tagName),
        renderHTML: (attributes: { tag?: FormControlTag }) => ({
          'data-form-tag': attributes.tag ?? 'input',
        }),
      },
      inputType: {
        default: 'text',
        parseHTML: (element: HTMLElement) => element.getAttribute('type') || 'text',
        renderHTML: (_attributes: { inputType?: string }) => ({}),
      },
      name: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('name') || null,
        renderHTML: (attributes: { name?: string | null }) => (attributes.name ? { name: attributes.name } : {}),
      },
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('id') || null,
        renderHTML: (attributes: { id?: string | null }) => (attributes.id ? { id: attributes.id } : {}),
      },
      value: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const tag = normalizeTag(element.tagName);
          if (tag === 'select') {
            try {
              const el = element as HTMLSelectElement;
              return typeof el.value === 'string' ? el.value : null;
            } catch {
              return element.getAttribute('value') || null;
            }
          }
          if (tag === 'textarea') return (element.textContent || '').toString();
          return element.getAttribute('value') || null;
        },
        renderHTML: (_attributes: { value?: string | null }) => ({}),
      },
      placeholder: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('placeholder') || null,
        renderHTML: (attributes: { placeholder?: string | null }) => (attributes.placeholder ? { placeholder: attributes.placeholder } : {}),
      },
      checked: {
        default: false,
        parseHTML: (element: HTMLElement) => parseBoolAttr(element, 'checked'),
        renderHTML: (_attributes: { checked?: boolean }) => ({}),
      },
      required: {
        default: false,
        parseHTML: (element: HTMLElement) => parseBoolAttr(element, 'required'),
        renderHTML: (_attributes: { required?: boolean }) => ({}),
      },
      disabled: {
        default: false,
        parseHTML: (element: HTMLElement) => parseBoolAttr(element, 'disabled'),
        renderHTML: (_attributes: { disabled?: boolean }) => ({}),
      },
      multiple: {
        default: false,
        parseHTML: (element: HTMLElement) => parseBoolAttr(element, 'multiple'),
        renderHTML: (_attributes: { multiple?: boolean }) => ({}),
      },
      options: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const tag = normalizeTag(element.tagName);
          if (tag !== 'select') return [];
          const opts = Array.from(element.querySelectorAll('option'));
          return opts.map((opt) => ({
            value: opt.getAttribute('value') || opt.textContent || '',
            label: (opt.textContent || '').toString(),
            disabled: opt.hasAttribute('disabled'),
          }));
        },
        renderHTML: (_attributes: { options?: FormControlOption[] }) => ({}),
      },
      buttonType: {
        default: 'button',
        parseHTML: (element: HTMLElement) => element.getAttribute('type') || 'button',
        renderHTML: (_attributes: { buttonType?: string }) => ({}),
      },
      text: {
        default: '',
        parseHTML: (element: HTMLElement) => {
          const tag = normalizeTag(element.tagName);
          if (tag !== 'button') return '';
          return (element.textContent || '').toString();
        },
        renderHTML: (_attributes: { text?: string }) => ({}),
      },
    } satisfies Record<string, any>;
  },

  parseHTML() {
    return [
      { tag: 'input' },
      { tag: 'select' },
      { tag: 'textarea' },
      { tag: 'button' },
    ];
  },

  renderHTML({ node }: { node: any }) {
    const attrs = (node?.attrs || {}) as FormControlAttrs;
    const tag = normalizeTag(attrs.tag);

    if (tag === 'select') {
      const selectAttrs: Record<string, any> = {
        name: attrs.name ?? undefined,
        id: attrs.id ?? undefined,
        disabled: attrs.disabled ? '' : undefined,
        required: attrs.required ? '' : undefined,
        multiple: attrs.multiple ? '' : undefined,
        'data-form-tag': 'select',
      };

      const options = Array.isArray(attrs.options) ? attrs.options : [];
      const children = options.map((o) => {
        const optionAttrs: Record<string, any> = {
          value: o.value,
          disabled: o.disabled ? '' : undefined,
        };
        if (attrs.value != null && String(attrs.value) === String(o.value)) {
          optionAttrs.selected = '';
        }
        return ['option', optionAttrs, o.label] as any;
      });

      return ['select', mergeAttributes(selectAttrs), ...children] as any;
    }

    if (tag === 'textarea') {
      const textareaAttrs: Record<string, any> = {
        name: attrs.name ?? undefined,
        id: attrs.id ?? undefined,
        placeholder: attrs.placeholder ?? undefined,
        disabled: attrs.disabled ? '' : undefined,
        required: attrs.required ? '' : undefined,
        'data-form-tag': 'textarea',
      };

      return ['textarea', mergeAttributes(textareaAttrs), attrs.value ?? ''] as any;
    }

    if (tag === 'button') {
      const buttonAttrs: Record<string, any> = {
        type: attrs.buttonType ?? 'button',
        name: attrs.name ?? undefined,
        id: attrs.id ?? undefined,
        disabled: attrs.disabled ? '' : undefined,
        'data-form-tag': 'button',
      };

      return ['button', mergeAttributes(buttonAttrs), attrs.text ?? ''] as any;
    }

    const inputType = typeof attrs.inputType === 'string' ? attrs.inputType : 'text';
    const inputAttrs: Record<string, any> = {
      type: inputType,
      name: attrs.name ?? undefined,
      id: attrs.id ?? undefined,
      value: attrs.value ?? undefined,
      placeholder: attrs.placeholder ?? undefined,
      checked: attrs.checked ? '' : undefined,
      disabled: attrs.disabled ? '' : undefined,
      required: attrs.required ? '' : undefined,
      'data-form-tag': 'input',
    };

    return ['input', mergeAttributes(inputAttrs)] as any;
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.setAttribute('data-type', 'form-control-node');
      dom.style.display = 'inline-block';
      dom.style.verticalAlign = 'middle';
      dom.style.margin = '0 2px';

      let currentAttrs = node.attrs as FormControlAttrs;

      const buildControl = (attrs: FormControlAttrs): HTMLElement => {
        const tag = normalizeTag(attrs.tag);

        if (tag === 'select') {
          const el = document.createElement('select');
          const options = Array.isArray(attrs.options) ? attrs.options : [];
          for (const o of options) {
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            opt.disabled = !!o.disabled;
            el.appendChild(opt);
          }
          if (attrs.value != null) el.value = String(attrs.value);
          el.multiple = !!attrs.multiple;
          el.disabled = !!attrs.disabled;
          el.required = !!attrs.required;
          if (attrs.name) el.name = attrs.name;
          if (attrs.id) el.id = attrs.id;
          return el;
        }

        if (tag === 'textarea') {
          const el = document.createElement('textarea');
          el.value = (attrs.value ?? '').toString();
          if (attrs.placeholder) el.placeholder = attrs.placeholder;
          el.disabled = !!attrs.disabled;
          el.required = !!attrs.required;
          if (attrs.name) el.name = attrs.name;
          if (attrs.id) el.id = attrs.id;
          el.rows = 2;
          el.cols = 18;
          return el;
        }

        if (tag === 'button') {
          const el = document.createElement('button');
          el.type = (attrs.buttonType as any) || 'button';
          el.textContent = (attrs.text ?? '').toString() || 'Button';
          el.disabled = !!attrs.disabled;
          if (attrs.name) el.name = attrs.name;
          if (attrs.id) el.id = attrs.id;
          return el;
        }

        const el = document.createElement('input');
        el.type = (attrs.inputType as any) || 'text';
        el.value = (attrs.value ?? '').toString();
        if (attrs.placeholder) el.placeholder = attrs.placeholder;
        el.disabled = !!attrs.disabled;
        el.required = !!attrs.required;
        if (el.type === 'checkbox' || el.type === 'radio') {
          (el as HTMLInputElement).checked = !!attrs.checked;
        }
        if (attrs.name) el.name = attrs.name;
        if (attrs.id) el.id = attrs.id;
        return el;
      };

      let control = buildControl(node.attrs as FormControlAttrs);
      (control as any).contentEditable = 'false';
      control.style.fontSize = '14px';
      control.style.padding = '4px 6px';
      control.style.border = '1px solid rgba(0,0,0,0.2)';
      control.style.borderRadius = '6px';
      control.style.background = 'white';

      const attachListeners = (el: HTMLElement) => {
        el.addEventListener('input', (e) => {
          const target = e.target as any;
          if (!target) return;
          if (target instanceof HTMLInputElement) {
            if (target.type === 'checkbox' || target.type === 'radio') {
              updateAttrs({ checked: target.checked });
            } else {
              updateAttrs({ value: target.value });
            }
          } else if (target instanceof HTMLTextAreaElement) {
            updateAttrs({ value: target.value });
          }
        });

        el.addEventListener('change', (e) => {
          const target = e.target as any;
          if (!target) return;
          if (target instanceof HTMLSelectElement) {
            updateAttrs({ value: target.value });
          }
        });
      };

      const updateAttrs = (partial: Partial<FormControlAttrs>) => {
        if (!editor || !getPos) return;
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (typeof pos !== 'number') return;
        const next = { ...(currentAttrs as any), ...partial };
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, next));
      };

      attachListeners(control);

      dom.appendChild(control);

      return {
        dom,
        stopEvent: (event) => {
          const t = event.target as any;
          return (
            t instanceof HTMLInputElement ||
            t instanceof HTMLSelectElement ||
            t instanceof HTMLTextAreaElement ||
            t instanceof HTMLButtonElement
          );
        },
        ignoreMutation: () => true,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          const nextAttrs = updatedNode.attrs as FormControlAttrs;
          const prevTag = normalizeTag((currentAttrs as any)?.tag);
          const nextTag = normalizeTag(nextAttrs?.tag);

          currentAttrs = nextAttrs;

          if (prevTag !== nextTag) {
            dom.removeChild(control);
            control = buildControl(nextAttrs);
            (control as any).contentEditable = 'false';
            control.style.fontSize = '14px';
            control.style.padding = '4px 6px';
            control.style.border = '1px solid rgba(0,0,0,0.2)';
            control.style.borderRadius = '6px';
            control.style.background = 'white';
            attachListeners(control);
            dom.appendChild(control);
            return true;
          }

          if (control instanceof HTMLInputElement) {
            if (control.type === 'checkbox' || control.type === 'radio') {
              control.checked = !!nextAttrs.checked;
            } else {
              control.value = (nextAttrs.value ?? '').toString();
            }
          } else if (control instanceof HTMLTextAreaElement) {
            control.value = (nextAttrs.value ?? '').toString();
          } else if (control instanceof HTMLSelectElement) {
            control.value = (nextAttrs.value ?? '').toString();
          } else if (control instanceof HTMLButtonElement) {
            control.textContent = (nextAttrs.text ?? '').toString() || 'Button';
          }

          return true;
        },
      };
    };
  },
});
