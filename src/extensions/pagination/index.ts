import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';
import type { PaginationOptions, PaginationState } from './types';
import { calculatePageBreaks } from './layout-engine';
import { createPageBreakDecorations } from './renderer';

export * from './types';

const RECALC_DEBOUNCE_MS = 150;
const IDLE_TIMEOUT_MS = 500;

export interface SmartPaginationOptions extends Partial<PaginationOptions> {}

// Create a single plugin key instance to share across all uses
const paginationPluginKey = new PluginKey('smartPagination');

export const SmartPagination = Extension.create<SmartPaginationOptions>({
  name: 'smartPagination',

  addOptions() {
    return {
      pageSize: { width: 210, height: 297 }, // A4
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      headerHeight: 0,
      footerHeight: 10,
      showPageNumbers: true,
      pageNumberPosition: 'right',
    };
  },

  addProseMirrorPlugins() {
    const options = this.options as PaginationOptions;
    console.log('[SmartPagination] Plugin initialized with options:', options);
    
    return [
      new Plugin({
        key: paginationPluginKey,
        
        state: {
          init: (): PaginationState => {
            console.log('[SmartPagination] Plugin state initialized');
            return {
              pageBreaks: [],
              nodePositions: new Map(),
              totalPages: 1,
              contentHeight: 0,
              isDirty: true,
            };
          },
          
          apply: (tr, oldState): PaginationState => {
            // Check if we have new state from meta
            const meta = tr.getMeta('smartPagination');
            if (meta?.state) {
              console.log('[SmartPagination] Applying new state from meta:', meta.state.pageBreaks.length, 'breaks');
              return meta.state;
            }
            
            // Mark as dirty if document changed
            if (tr.docChanged) {
              return { ...oldState, isDirty: true };
            }
            return oldState;
          },
        },
        
        view: (editorView) => {
          let recalcTimeout: ReturnType<typeof setTimeout> | null = null;
          let idleTimeout: ReturnType<typeof setTimeout> | null = null;
          let rafId: number | null = null;
          let isRecalculating = false;
          
          // Performant recalculation using RAF and idle detection
          let lastDocSize = 0;
          
          const scheduleRecalc = () => {
            // Check if document actually changed
            const currentDocSize = editorView.state.doc.content.size;
            if (currentDocSize === lastDocSize && lastDocSize > 0) {
              console.log('[SmartPagination] Skipping recalc - no document changes');
              return;
            }
            
            // Clear existing timers
            if (recalcTimeout) clearTimeout(recalcTimeout);
            if (idleTimeout) clearTimeout(idleTimeout);
            if (rafId) cancelAnimationFrame(rafId);
            
            // Debounce rapid changes
            recalcTimeout = setTimeout(() => {
              // Wait for idle
              idleTimeout = setTimeout(() => {
                // Use RAF to avoid blocking
                rafId = requestAnimationFrame(() => {
                  if (isRecalculating) return;
                  
                  isRecalculating = true;
                  try {
                    const newState = calculatePageBreaks(editorView, options);
                    lastDocSize = editorView.state.doc.content.size;
                    
                    console.log('[SmartPagination] Calculated:', {
                      totalPages: newState.totalPages,
                      pageBreaks: newState.pageBreaks.length,
                      contentHeight: Math.round(newState.contentHeight),
                      nodePositions: newState.nodePositions.size,
                    });
                    
                    // Update plugin state
                    const tr = editorView.state.tr;
                    tr.setMeta('smartPagination', { state: newState });
                    editorView.dispatch(tr);
                  } catch (error) {
                    console.error('[SmartPagination] Error calculating page breaks:', error);
                  } finally {
                    isRecalculating = false;
                  }
                });
              }, IDLE_TIMEOUT_MS);
            }, RECALC_DEBOUNCE_MS);
          };
          
          // Initial calculation
          console.log('[SmartPagination] Editor view ready, scheduling initial calculation');
          console.log('[SmartPagination] Editor DOM:', editorView.dom);
          scheduleRecalc();
          
          // Recalculate on document changes
          const updateHandler = () => {
            scheduleRecalc();
          };
          
          // Listen to editor updates (but ignore decoration changes)
          const observer = new MutationObserver((mutations) => {
            // Only trigger if actual content changed, not decorations
            const hasContentChange = mutations.some(mutation => {
              // Ignore changes to decoration elements
              if (mutation.target instanceof HTMLElement) {
                const classList = mutation.target.classList;
                if (classList.contains('page-break-marker') || 
                    classList.contains('page-number-display') ||
                    classList.contains('page-numbers-preview')) {
                  return false;
                }
              }
              return true;
            });
            
            if (hasContentChange) {
              updateHandler();
            }
          });
          observer.observe(editorView.dom, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          
          // Recalculate on window resize
          const resizeHandler = () => scheduleRecalc();
          window.addEventListener('resize', resizeHandler);
          
          return {
            update: (view, prevState) => {
              // Only recalculate if document content actually changed
              if (view.state.doc !== prevState.doc && view.state.doc.content.size !== prevState.doc.content.size) {
                updateHandler();
              }
            },
            
            destroy: () => {
              if (recalcTimeout) clearTimeout(recalcTimeout);
              if (idleTimeout) clearTimeout(idleTimeout);
              if (rafId) cancelAnimationFrame(rafId);
              observer.disconnect();
              window.removeEventListener('resize', resizeHandler);
            },
          };
        },
        
        props: {
          decorations: (state) => {
            // Get plugin state using the shared key
            const pluginState = paginationPluginKey.getState(state) as PaginationState | undefined;
            
            if (pluginState) {
              console.log('[SmartPagination] Plugin state found:', {
                pageBreaks: pluginState.pageBreaks.length,
                totalPages: pluginState.totalPages,
                isDirty: pluginState.isDirty,
              });
              
              if (pluginState.pageBreaks.length > 0) {
                console.log('[SmartPagination] Rendering', pluginState.pageBreaks.length, 'page break decorations');
                const decoSet = createPageBreakDecorations(state, pluginState, options);
                console.log('[SmartPagination] Returning decoration set');
                return decoSet;
              } else {
                console.log('[SmartPagination] No page breaks to render yet');
              }
            } else {
              console.warn('[SmartPagination] Plugin state not found!');
            }
            
            return DecorationSet.empty;
          },
        },
      }),
    ];
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem', 'taskItem'],
        attributes: {
          'data-page': {
            default: null,
            parseHTML: element => element.getAttribute('data-page'),
            renderHTML: attributes => {
              if (!attributes['data-page']) {
                return {};
              }
              return { 'data-page': attributes['data-page'] };
            },
          },
        },
      },
    ];
  },
});
