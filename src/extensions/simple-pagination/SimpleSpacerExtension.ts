import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Plugin key for managing spacer decorations
export const simpleSpacerKey = new PluginKey('simpleSpacer');

interface SpacerInfo {
  pos: number;
  height: number;
  id: string;
}

/**
 * Simple spacer extension for ProseMirror
 * Minimal decoration plugin that renders spacer divs
 * Based on DocExCore's RedHighlightDecoration approach
 */
export const SimpleSpacerExtension = Extension.create({
  name: 'simpleSpacer',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: simpleSpacerKey,
        state: {
          init() {
            return { spacers: [] as SpacerInfo[] };
          },
          apply(tr, value) {
            const meta = tr.getMeta(simpleSpacerKey);
            return meta ? meta : value;
          },
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            if (!pluginState?.spacers.length) return null;
            
            const decorations = pluginState.spacers.map(spacer => 
              Decoration.widget(spacer.pos, () => {
                const spacerEl = document.createElement('div');
                spacerEl.style.height = `${spacer.height}px`;
                spacerEl.className = 'spacer';
                spacerEl.setAttribute('data-spacer-id', spacer.id);
                spacerEl.style.display = 'block';
                spacerEl.style.width = '100%';
                spacerEl.style.pointerEvents = 'none';
                return spacerEl;
              })
            );
            
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export default SimpleSpacerExtension;
