import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// A4 height constant
const A4_HEIGHT_PX = Math.round(11.69 * 96);

// Plugin key for managing spacer decorations
const simpleSpacerKey = new PluginKey('simpleSpacer');

interface SpacerInfo {
  pos: number;
  height: number;
  id: string;
  to?: number;
  from?: number;
}

/**
 * Simple crossing elements detection and spacer insertion
 * Based on DocExCore's updateDecorations approach
 * 
 * Detects when elements cross page boundaries and inserts spacers
 * to push them to the next page
 */
export function useCrossingElements(
  editor: Ref<Editor | null>,
  pageMargin: number,
  pageGap: number
) {
  const isProcessing = ref(false);

  /**
   * Check if a node crosses page boundaries
   * Simplified version of DocExCore's isNodeCrossing
   */
  const isNodeCrossing = (
    offsetTop: number,
    offsetBottom: number
  ): { isCrossing: boolean; startPage: number; endPage: number } => {
    const pageHeight = A4_HEIGHT_PX + pageGap;
    const startPage = Math.floor(offsetTop / pageHeight);
    const endPage = Math.floor(offsetBottom / pageHeight);
    const contentEnd = startPage * pageHeight + A4_HEIGHT_PX - pageMargin;
    
    const topCrossing = offsetTop > contentEnd;
    const bottomCrossing = offsetBottom > contentEnd;
    const isCrossing = topCrossing || bottomCrossing || startPage !== endPage;

    return {
      isCrossing,
      startPage,
      endPage: startPage !== endPage ? endPage - 1 : endPage,
    };
  };

  /**
   * Update decorations for crossing elements
   * Based on DocExCore's updateDecorations function
   */
  const updateDecorations = () => {
    if (!editor.value || isProcessing.value) return;
    
    try {
      isProcessing.value = true;
      const doc = editor.value.state.doc;
      const crossingElements: SpacerInfo[] = [];
      const offsetTopDict: Record<string, boolean> = {};
      let curMargin = 0;

      // Traverse the document and find crossing elements
      doc.nodesBetween(0, doc.content.size, (node, pos) => {
        // Skip certain node types (DocExCore blacklist approach)
        const blacklist = ["orderedList", "bulletList", "listItem", "table"];
        if (blacklist.includes(node.type.name)) return true;

        const dom = editor.value!.view.nodeDOM(pos);
        if (dom && dom instanceof HTMLElement) {
          
          // Calculate margins (simplified from DocExCore)
          const nodeBefore = dom.previousElementSibling as HTMLElement;
          const nodeBeforeIsSpacer = nodeBefore?.classList.contains("spacer");
          
          const marginTop = parseInt(getComputedStyle(dom).marginTop) || 0;
          const marginBottom = parseInt(getComputedStyle(dom).marginBottom) || 0;

          // Adjust for existing spacers
          if (nodeBeforeIsSpacer) {
            const spacerHeight = parseInt(getComputedStyle(nodeBefore).height) || 0;
            curMargin -= spacerHeight;
          }

          // Calculate position
          const offsetTop = Math.ceil(dom.offsetTop + curMargin);
          const offsetBottom = offsetTop + dom.offsetHeight + marginBottom + marginTop;

          // Check if crossing
          const { isCrossing, endPage } = isNodeCrossing(offsetTop, offsetBottom);
          
          // Check if node is too tall for page
          const usableHeight = A4_HEIGHT_PX - 2 * pageMargin;
          const nodeHeight = dom.offsetHeight + marginTop + marginBottom;
          
          if (nodeHeight > usableHeight) {
            // For very tall nodes, try to split paragraphs/headings (DocExCore approach)
            if ((node.type.name === "paragraph" || node.type.name === "heading") && node.textContent && node.textContent.length > 1) {
              // Simple splitting logic - could be enhanced
              const text = node.textContent;
              const mid = Math.floor(text.length / 2);
              let splitIdx = text.lastIndexOf(" ", mid);
              if (splitIdx === -1) splitIdx = mid;
              
              const first = text.slice(0, splitIdx).trim();
              const second = text.slice(splitIdx).trim();
              
              if (first && second) {
                // Create two nodes instead of one
                const { schema } = editor.value!;
                const newNodes = [
                  schema.nodes[node.type.name].create({}, schema.text(first)),
                  schema.nodes[node.type.name].create({}, schema.text(second)),
                ];
                
                const tr = editor.value!.state.tr.replaceWith(
                  pos,
                  pos + node.nodeSize,
                  newNodes
                );
                editor.value!.view.dispatch(tr);
                return false; // Stop traversal, doc has changed
              }
            }
            return true; // Don't add spacer for very tall nodes
          }

          if (isCrossing) {
            // Calculate target position (DocExCore approach)
            const targetOffsetTop = (endPage + 1) * (A4_HEIGHT_PX + pageGap) + pageMargin + marginTop;
            const marginToFix = Math.ceil(targetOffsetTop - offsetTop);
            
            // Ensure we only count margin once per offsetTop
            const offsetKey = offsetTop.toString();
            if (!offsetTopDict[offsetKey]) {
              curMargin += marginToFix;
              offsetTopDict[offsetKey] = true;
              
              crossingElements.push({
                pos,
                height: marginToFix,
                id: `spacer-${pos}-${Date.now()}`,
              });
            }
            return false;
          }
        }
      });

      // Apply decorations via plugin state
      const tr = editor.value.state.tr.setMeta(simpleSpacerKey, {
        spacers: crossingElements,
      });
      editor.value.view.dispatch(tr);
      
    } catch (error) {
      console.warn('[useCrossingElements] Failed to update decorations:', error);
    } finally {
      isProcessing.value = false;
    }
  };

  // Throttled update to prevent excessive calculations
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const throttledUpdate = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(updateDecorations, 100);
  };

  // Set up ResizeObserver (DocExCore approach)
  let resizeObserver: ResizeObserver | null = null;
  let previousHeight = 0;

  onMounted(() => {
    if (!editor.value) return;
    
    // Initial calculation
    updateDecorations();
    
    // Set up MutationObserver to watch for changes in the editor DOM
    resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      
      const newHeight = Math.floor(entries[0].contentRect.height);
      if (newHeight !== previousHeight) {
        previousHeight = newHeight;
        throttledUpdate();
      }
    });
    
    // Observe changes to the editor DOM
    resizeObserver.observe(editor.value.view.dom);
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  // Watch for page margin/gap changes
  watch([pageMargin, pageGap], () => {
    throttledUpdate();
  });

  return {
    updateDecorations: throttledUpdate,
    isProcessing,
  };
}

/**
 * Simple spacer extension for ProseMirror
 * Minimal decoration plugin that renders spacer divs
 */
export const SimpleSpacerExtension = {
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
                return spacerEl;
              })
            );
            
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
};
