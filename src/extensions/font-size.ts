import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    } as { types: string[] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
            parseHTML: element => element.style.fontSize || null,
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        fontSize =>
        ({ editor, chain }) => {
          if (!fontSize) {
            return true;
          }

          const existing = editor.getAttributes('textStyle') ?? {};
          const next = {
            ...existing,
            fontSize,
          };

          return chain().setMark('textStyle', next).run();
        },
      unsetFontSize:
        () =>
        ({ editor, chain }) => {
          const existing = { ...(editor.getAttributes('textStyle') ?? {}) } as Record<string, unknown>;
          delete existing.fontSize;

          if (Object.keys(existing).length === 0) {
            return chain().unsetMark('textStyle').run();
          }

          return chain().setMark('textStyle', existing).run();
        },
    };
  },
});
