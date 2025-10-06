import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

type LineHeightOptions = {
  types: string[];
  values: string[];
};

const DEFAULT_LINE_HEIGHT_VALUES = ['1', '1.15', '1.25', '1.5', '1.75', '2', '2.5', '3'];

function sanitizeLineHeight(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/"|'/g, '');
  if (!trimmed || trimmed.toLowerCase() === 'normal' || trimmed === '1.0') return trimmed === '1.0' ? '1' : null;
  return trimmed;
}

function normalizeLineHeight(value: string | null, allowed: string[]): string | null {
  const sanitized = sanitizeLineHeight(value);
  if (!sanitized) return null;

  if (allowed.includes(sanitized)) {
    return sanitized;
  }

  if (sanitized.endsWith('%')) {
    const percent = parseFloat(sanitized);
    if (Number.isFinite(percent)) {
      const decimal = (percent / 100).toFixed(2);
      return normalizeLineHeight(decimal, allowed);
    }
  }

  if (!Number.isNaN(Number(sanitized))) {
    const valueNumber = Number(sanitized);
    const allowedNumbers = allowed.map((entry) => Number(entry));
    const closest = allowedNumbers.reduce((prev, curr) => {
      if (prev === null) return curr;
      return Math.abs(curr - valueNumber) < Math.abs(prev - valueNumber) ? curr : prev;
    }, null as number | null);

    if (closest !== null) {
      return closest.toString();
    }
  }

  return sanitized;
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem', 'taskItem'],
      values: DEFAULT_LINE_HEIGHT_VALUES,
    } satisfies LineHeightOptions;
  },

  addGlobalAttributes() {
    return this.options.types.map((type) => ({
      types: [type],
      attributes: {
        lineHeight: {
          default: null,
          renderHTML: (attributes) => {
            if (!attributes.lineHeight) {
              return {};
            }

            return {
              style: `line-height: ${attributes.lineHeight}`,
            };
          },
          parseHTML: (element) => normalizeLineHeight(element.style.lineHeight || null, this.options.values),
        },
      },
    }));
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ tr, state, dispatch }) => {
          const normalized = normalizeLineHeight(lineHeight, this.options.values);
          if (!normalized) {
            return this.editor.commands.unsetLineHeight();
          }

          const { from, to } = state.selection;
          let changed = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isTextblock) return;
            if (!this.options.types.includes(node.type.name)) return;

            const attrs = {
              ...node.attrs,
              lineHeight: normalized,
            };

            tr.setNodeMarkup(pos, undefined, attrs, node.marks);
            changed = true;
          });

          if (changed && dispatch) {
            dispatch(tr);
            return true;
          }

          return false;
        },
      unsetLineHeight: () => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection;
        let changed = false;

        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isTextblock) return;
          if (!this.options.types.includes(node.type.name)) return;
          if (!node.attrs.lineHeight) return;

          const attrs = { ...node.attrs } as Record<string, unknown>;
          delete attrs.lineHeight;

          tr.setNodeMarkup(pos, undefined, attrs, node.marks);
          changed = true;
        });

        if (changed && dispatch) {
          dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});
