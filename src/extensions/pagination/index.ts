/**
 * Tiptap Pagination Extension
 * A robust, modular pagination solution for Tiptap editor
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { PaginationOptions } from './types';
import { DEFAULT_OPTIONS } from './types';
import { LayoutEngine } from './layout-engine';
import {
  type ExtendedPaginationStorage,
  getResolvedOptions,
  mountPagination,
  unmountPagination,  
  performLayout,
  debouncedLayout,
  cleanupObservers,
} from './extension-helpers';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pagination: {
      /**
       * Toggle pagination view
       */
      togglePagination: () => ReturnType;
      /**
       * Enable pagination view
       */
      enablePagination: () => ReturnType;
      /**
       * Disable pagination view
       */
      disablePagination: () => ReturnType;
      /**
       * Refresh pagination layout
       */
      refreshPagination: () => ReturnType;
      /**
       * Update pagination options
       */
      updatePaginationOptions: (options: Partial<PaginationOptions>) => ReturnType;
    };
  }
}


export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return DEFAULT_OPTIONS;
  },

  addStorage(): ExtendedPaginationStorage {
    return {
      pages: [],
      container: null,
      measureContainer: null,
      resizeObserver: null,
      mutationObserver: null,
      layoutDebounceTimer: null,
      isLayouting: false,
      lastLayoutHash: '',
      layoutEngine: undefined,
      originalDisplay: undefined,
      forceLayout: false,
    };
  },

  onCreate() {
    const storage = this.storage as ExtendedPaginationStorage;
    
    // Resolve page dimensions from format
    const resolvedOptions = getResolvedOptions(this.options);
    
    // Initialize layout engine
    storage.layoutEngine = new LayoutEngine(resolvedOptions);
    
    // Auto-enable if configured
    if (this.options.enabled) {
      this.editor.commands.enablePagination();
    }
  },

  onUpdate() {
    const storage = this.storage as ExtendedPaginationStorage;
    // Refresh pagination on content update if enabled
    if (storage.container) {
      debouncedLayout(this.editor, storage, this.options);
    }
  },

  onDestroy() {
    const storage = this.storage as ExtendedPaginationStorage;
    unmountPagination(this.editor, storage);
    cleanupObservers(storage);
    
    if (storage.layoutEngine) {
      storage.layoutEngine.destroy();
      storage.layoutEngine = undefined;
    }
  },

  addCommands() {
    const extension = this;
    
    return {
      togglePagination: () => ({ commands }) => {
        const storage = extension.storage as ExtendedPaginationStorage;
        if (storage.container) {
          return commands.disablePagination();
        } else {
          return commands.enablePagination();
        }
      },

      enablePagination: () => () => {
        const storage = extension.storage as ExtendedPaginationStorage;
        if (storage.container) return true;
        
        try {
          mountPagination(extension.editor, storage, extension.options);
          return true;
        } catch (error) {
          console.error('Failed to enable pagination:', error);
          return false;
        }
      },

      disablePagination: () => () => {
        const storage = extension.storage as ExtendedPaginationStorage;
        if (!storage.container) return true;
        
        try {
          unmountPagination(extension.editor, storage);
          return true;
        } catch (error) {
          console.error('Failed to disable pagination:', error);
          return false;
        }
      },

      refreshPagination: () => () => {
        const storage = extension.storage as ExtendedPaginationStorage;
        if (!storage.container) return false;
        
        try {
          performLayout(extension.editor, storage, extension.options);
          return true;
        } catch (error) {
          console.error('Failed to refresh pagination:', error);
          return false;
        }
      },

      updatePaginationOptions: (options: Partial<PaginationOptions>) => () => {
        const storage = extension.storage as ExtendedPaginationStorage;
        
        try {
          // Update options
          extension.options = { ...extension.options, ...options };
          
          // Resolve page dimensions if format changed
          const resolvedOptions = getResolvedOptions(extension.options);
          
          // Update layout engine
          if (storage.layoutEngine) {
            storage.layoutEngine.updateOptions(resolvedOptions);
          } else {
            storage.layoutEngine = new LayoutEngine(resolvedOptions);
          }
          
          // Refresh if pagination is active
          if (storage.container) {
            performLayout(extension.editor, storage, extension.options);
          }
          
          return true;
        } catch (error) {
          console.error('Failed to update pagination options:', error);
          return false;
        }
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin({
        key: new PluginKey('pagination'),
        
        view: () => {
          return {
            update: (view: EditorView, prevState) => {
              const storage = extension.storage as ExtendedPaginationStorage;
              // Check if content changed
              if (!view.state.doc.eq(prevState.doc) && storage.container) {
                debouncedLayout(extension.editor, storage, extension.options);
              }
            },
            
            destroy: () => {
              const storage = extension.storage as ExtendedPaginationStorage;
              unmountPagination(extension.editor, storage);
              cleanupObservers(storage);
            },
          };
        },
      }),
    ];
  },

});

// Re-export types for convenience
export * from './types';
export { LayoutEngine } from './layout-engine';
export { PageRenderer } from './renderer';
export { MeasureUtils } from './measure';
export { ContentSplitter } from './splitter';
