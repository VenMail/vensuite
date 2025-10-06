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
  // Allowed values can be unitless factors (e.g., '0.5', '1', '1.5') or absolute px (e.g., '8px')
  values: string[];
};

// Defaults use factors of line height to match user expectations
const DEFAULT_SPACING_VALUES = ['0', '0.5', '1', '1.15', '1.5', '2'];

function normalizeSpacing(value: string | null, allowed: string[]): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Accept exact allowed entries as-is
  if (allowed.includes(trimmed)) return trimmed;

  // Allow absolute px values pass-through
  if (trimmed.endsWith('px')) {
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? `${n}px` : trimmed;
  }

  // If value is unitless number, snap to closest allowed factor
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    const allowedNumbers = allowed
      .filter((v) => !v.endsWith('px'))
      .map((entry) => Number(entry));
    if (allowedNumbers.length) {
      const target = allowedNumbers.reduce((closest, current) => {
        if (closest === null) return current;
        return Math.abs(current - numeric) < Math.abs(closest - numeric) ? current : closest;
      }, null as number | null);
      if (target !== null) return String(target);
    }
    return String(numeric);
  }

  // For other units (em/rem), return trimmed as-is (parseHTML may translate when possible)
  return trimmed;
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
            if (!spacing) return {};

            // If explicit px provided, use directly
            if (typeof spacing === 'string' && spacing.endsWith('px')) {
              return { style: `margin-bottom: ${spacing}!important` };
            }

            // Treat unitless value as a factor of line-height
            const factor = Number(spacing);
            if (!Number.isFinite(factor)) return {};

            const lhRaw = (attributes as any).lineHeight as string | number | undefined;
            const lh = typeof lhRaw === 'number' ? lhRaw : Number(lhRaw);
            const lineHeightFactor = Number.isFinite(lh) && lh ? lh : 1;
            const em = factor * lineHeightFactor;
            return { style: `margin-bottom: ${em}em!important` };
          },
          parseHTML: (element) => {
            const mb = element.style.marginBottom || null;
            if (!mb) return null;

            // Preserve px exactly
            if (mb.endsWith('px')) return normalizeSpacing(mb, this.options.values);

            // If margin is in em and lineHeight is unitless, convert back to factor
            if (mb.endsWith('em')) {
              const emVal = parseFloat(mb);
              const lhStr = element.style.lineHeight || '';
              const lhNum = Number(lhStr);
              if (Number.isFinite(emVal) && Number.isFinite(lhNum) && lhNum) {
                const factor = (emVal / lhNum).toFixed(2);
                return normalizeSpacing(factor, this.options.values);
              }
              // Fallback: store em value as-is (will be rendered as-is on roundtrip)
              return mb;
            }

            // Otherwise, return normalized raw
            return normalizeSpacing(mb, this.options.values);
          },
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
