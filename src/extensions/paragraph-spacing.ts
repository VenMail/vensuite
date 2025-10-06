import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (value: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

type ParagraphSpacingOptions = {
  types: string[];
  values: string[];
};

const DEFAULT_SPACING_VALUES = ['0px', '4px', '8px', '12px', '16px', '24px'];

function normalizeSpacing(value: string | null, allowed: string[]): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (allowed.includes(trimmed)) {
    return trimmed;
  }

  const numeric = parseFloat(trimmed);
  if (!Number.isFinite(numeric)) {
    return trimmed;
  }

  let unit = 'px';
  if (trimmed.endsWith('px')) {
    unit = 'px';
  } else if (trimmed.endsWith('rem')) {
    unit = 'rem';
  } else if (trimmed.endsWith('em')) {
    unit = 'em';
  }

  if (unit !== 'px') {
    return trimmed;
  }

  const allowedNumbers = allowed.map((entry) => parseFloat(entry));
  const target = allowedNumbers.reduce((closest, current) => {
    if (closest === null) return current;
    return Math.abs(current - numeric) < Math.abs(closest - numeric) ? current : closest;
  }, null as number | null);

  if (target === null) return trimmed;
  return `${target}px`;
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem', 'taskItem'],
      values: DEFAULT_SPACING_VALUES,
    } satisfies ParagraphSpacingOptions;
  },

  addGlobalAttributes() {
    return this.options.types.map((type) => ({
      types: [type],
      attributes: {
        paragraphSpacing: {
          default: null,
          renderHTML: (attributes) => {
            const spacing = attributes.paragraphSpacing as string | null;
            if (!spacing) {
              return {};
            }

            return {
              style: `margin-bottom: ${spacing}`,
            };
          },
          parseHTML: (element) => normalizeSpacing(element.style.marginBottom || null, this.options.values),
        },
      },
    }));
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing) =>
        ({ tr, state, dispatch }) => {
          const value = normalizeSpacing(spacing, this.options.values);
          if (!value) {
            return this.editor.commands.unsetParagraphSpacing();
          }

          const { from, to } = state.selection;
          let changed = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isTextblock) return;
            if (!this.options.types.includes(node.type.name)) return;

            const attrs = {
              ...node.attrs,
              paragraphSpacing: value,
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
      unsetParagraphSpacing: () => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection;
        let changed = false;

        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isTextblock) return;
          if (!this.options.types.includes(node.type.name)) return;
          if (!node.attrs.paragraphSpacing) return;

          const attrs = { ...node.attrs } as Record<string, unknown>;
          delete attrs.paragraphSpacing;

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
