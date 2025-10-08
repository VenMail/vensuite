import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { PracticalPagination } from './practical-pagination';
import type {
  PracticalPaginationConfig,
  PageNumberPosition,
} from './practical-pagination';

const DEFAULT_CONFIG: PracticalPaginationConfig = {
  pageHeight: 1123,
  marginTop: 48,
  marginBottom: 48,
  marginLeft: 56,
  marginRight: 56,
  pageHeaderHeight: 0,
  pageFooterHeight: 30,
  contentMarginTop: 32,
  contentMarginBottom: 40,
  pageGap: 24,
  showPageNumbers: true,
  pageNumberPosition: 'right',
};

export interface PracticalPaginationOptions {
  enabled?: boolean;
  config?: Partial<PracticalPaginationConfig>;
}

export interface PracticalPaginationStorage {
  instance: PracticalPagination | null;
  config: PracticalPaginationConfig;
}

function mergeConfig(partial?: Partial<PracticalPaginationConfig>): PracticalPaginationConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(partial ?? {}),
  };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    practicalPagination: {
      enablePagination: () => ReturnType;
      disablePagination: () => ReturnType;
      togglePagination: () => ReturnType;
      updatePaginationConfig: (config: Partial<PracticalPaginationConfig>) => ReturnType;
      setPaginationEnabled: (enabled: boolean) => ReturnType;
    };
  }

  interface Storage {
    practicalPagination: PracticalPaginationStorage;
  }
}

export const PracticalPaginationExtension = Extension.create<PracticalPaginationOptions>({
  name: 'practicalPagination',

  addOptions() {
    return {
      enabled: true,
      config: DEFAULT_CONFIG,
    } satisfies PracticalPaginationOptions;
  },

  addStorage() {
    return {
      practicalPagination: {
        instance: null,
        config: mergeConfig(this.options.config),
      },
    } satisfies { practicalPagination: PracticalPaginationStorage };
  },

  onCreate() {
    const config = mergeConfig(this.options.config);
    const storage = this.storage.practicalPagination;
    storage.config = config;
    const pagination = new PracticalPagination(this.editor, config);
    storage.instance = pagination;

    if (this.options.enabled !== false) {
      void pagination.enable();
    }
  },

  onDestroy() {
    const { instance } = this.storage.practicalPagination;
    instance?.destroy();
    this.storage.practicalPagination.instance = null;
  },

  addCommands() {
    const getInstance = (editor: Editor) => {
      return editor.storage.practicalPagination.instance;
    };

    const applyUpdate = (editor: Editor, partial: Partial<PracticalPaginationConfig>) => {
      const storage = editor.storage.practicalPagination;
      storage.config = { ...storage.config, ...partial };
      storage.instance?.updateConfig(storage.config);
    };

    return {
      enablePagination: () => ({ editor }) => {
        const instance = getInstance(editor);
        if (!instance) return false;
        void instance.enable();
        return true;
      },
      disablePagination: () => ({ editor }) => {
        const instance = getInstance(editor);
        if (!instance) return false;
        instance.disable();
        return true;
      },
      togglePagination: () => ({ editor }) => {
        const instance = getInstance(editor);
        if (!instance) return false;
        if (instance.enabled) {
          instance.disable();
        } else {
          void instance.enable();
        }
        return true;
      },
      updatePaginationConfig: (config) => ({ editor }) => {
        applyUpdate(editor, config);
        return true;
      },
      setPaginationEnabled: (enabled) => ({ editor }) => {
        const instance = getInstance(editor);
        if (!instance) return false;
        if (enabled) {
          void instance.enable();
        } else {
          instance.disable();
        }
        return true;
      },
    };
  },
});

export type { PracticalPaginationConfig, PageNumberPosition };
export { PracticalPagination };
