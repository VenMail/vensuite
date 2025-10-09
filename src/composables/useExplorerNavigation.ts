import { ref, computed } from 'vue';
import { useFileStore } from '@/store/files';
import type { FileData } from '@/types';

export interface ExplorerNavigationOptions {
  rootTitle?: string;
  onNavigate?: (folderId: string | null) => void;
}

export function useExplorerNavigation(options: ExplorerNavigationOptions = {}) {
  const fileStore = useFileStore();
  const { rootTitle = 'All Files', onNavigate } = options;

  // Local state
  const currentFolderId = ref<string | null>(null);
  const breadcrumbs = ref<Array<{ id: string | null; title: string }>>([
    { id: null, title: rootTitle },
  ]);
  const explorerItems = ref<FileData[]>([]);
  const isLoading = ref(false);

  // Computed
  const currentTitle = computed(() => {
    const trail = breadcrumbs.value;
    return trail[trail.length - 1]?.title || rootTitle;
  });

  const canNavigateUp = computed(() => breadcrumbs.value.length > 1);

  // Methods
  async function loadFolder(folderId: string | null) {
    isLoading.value = true;
    try {
      await fileStore.openFolder(folderId);
      currentFolderId.value = folderId;

      if (folderId) {
        // In a subfolder: show files that belong to this folder
        explorerItems.value = fileStore.allFiles.filter((doc: FileData) => doc.folder_id === folderId);
      } else {
        // At root: show files that don't belong to any folder
        explorerItems.value = fileStore.allFiles.filter((doc: FileData) => !doc.folder_id);
      }

      onNavigate?.(folderId);
    } catch (error) {
      console.error('Failed to load folder:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function resolveFolderTitle(folderId: string, fallback?: string): Promise<string> {
    if (fallback && fallback.trim().length > 0) return fallback;

    try {
      const folderDoc = await fileStore.loadFromAPI(folderId);
      return folderDoc?.title || 'Folder';
    } catch (error) {
      console.warn('Failed to resolve folder title:', error);
      return 'Folder';
    }
  }

  async function openFolder(folderId: string, title?: string) {
    await loadFolder(folderId);
    const resolvedTitle = await resolveFolderTitle(folderId, title);
    
    const existing = breadcrumbs.value.find((crumb) => crumb.id === folderId);
    if (existing) {
      existing.title = resolvedTitle;
    } else {
      breadcrumbs.value = [...breadcrumbs.value, { id: folderId, title: resolvedTitle }];
    }
  }

  async function navigateToBreadcrumb(index: number) {
    const target = breadcrumbs.value[index];
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
    await loadFolder(target?.id ?? null);
  }

  async function navigateUp() {
    if (breadcrumbs.value.length > 1) {
      await navigateToBreadcrumb(breadcrumbs.value.length - 2);
    }
  }

  async function refresh() {
    await loadFolder(currentFolderId.value);
  }

  async function initialize() {
    await loadFolder(null);
  }

  return {
    // State
    currentFolderId,
    breadcrumbs,
    explorerItems,
    isLoading,

    // Computed
    currentTitle,
    canNavigateUp,

    // Methods
    loadFolder,
    openFolder,
    navigateToBreadcrumb,
    navigateUp,
    refresh,
    initialize,
  };
}
