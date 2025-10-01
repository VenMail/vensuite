import { computed, ref } from "vue";
import type { Component } from "vue";
import type { FileData } from "@/types";

export interface ContextMenuAction {
  label: string;
  icon: Component | string;
  action: () => void;
  visible?: boolean;
  disabled?: boolean;
}

export interface FileContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
}

export interface ContextMenuBuilderContext {
  selectedIds: string[];
  selectedFiles: FileData[];
  close: () => void;
}

interface UseFileExplorerOptions {
  getFiles: () => FileData[];
  buildContextMenuActions?: (context: ContextMenuBuilderContext) => ContextMenuAction[];
}

export function useFileExplorer(options: UseFileExplorerOptions) {
  const selectedFiles = ref<Set<string>>(new Set());
  const contextMenuState = ref<FileContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
  });

  let lastSelectedId: string | null = null;

  const setSelected = (ids: string[]) => {
    selectedFiles.value = new Set(ids);
    lastSelectedId = ids.length > 0 ? ids[ids.length - 1] : null;
  };

  const clearSelection = () => {
    selectedFiles.value = new Set();
    lastSelectedId = null;
  };

  const setAllSelected = (selected: boolean) => {
    if (selected) {
      const ids = options
        .getFiles()
        .map((file) => file.id)
        .filter((id): id is string => Boolean(id));
      setSelected(ids);
    } else {
      clearSelection();
    }
  };

  const toggleSelectAll = () => {
    if (isAllSelected.value) {
      clearSelection();
    } else {
      setAllSelected(true);
    }
  };

  const closeContextMenu = () => {
    contextMenuState.value = {
      ...contextMenuState.value,
      visible: false,
    };
  };

  const handleSelect = (id: string | undefined, event?: MouseEvent) => {
    if (!id) return;

    const isRightClick = event?.type === "contextmenu" || event?.button === 2;

    if (isRightClick) {
      setSelected([id]);
      lastSelectedId = id;
      return;
    }

    if (event?.ctrlKey || event?.metaKey) {
      const next = new Set(selectedFiles.value);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      selectedFiles.value = next;
    } else if (event?.shiftKey && lastSelectedId) {
      const files = options.getFiles();
      const startIndex = files.findIndex((file) => file.id === lastSelectedId);
      const endIndex = files.findIndex((file) => file.id === id);

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        const next = new Set(selectedFiles.value);
        for (let index = start; index <= end; index += 1) {
          const fileId = files[index]?.id;
          if (fileId) {
            next.add(fileId);
          }
        }
        selectedFiles.value = next;
      } else {
        selectedFiles.value = new Set([...selectedFiles.value, id]);
      }
    } else {
      const next = new Set(selectedFiles.value);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      selectedFiles.value = next;
    }

    lastSelectedId = id;
    closeContextMenu();
  };

  const openContextMenu = ({ id, x, y }: { id: string; x: number; y: number }) => {
    setSelected([id]);
    contextMenuState.value = {
      visible: true,
      x,
      y,
      targetId: id,
    };
  };

  const handleContextMenu = ({ id, x, y }: { id: string; x: number; y: number }) => {
    openContextMenu({ id, x, y });
  };

  const selectedIds = computed(() => Array.from(selectedFiles.value));

  const resolvedSelectedFiles = computed(() => {
    const files = options.getFiles();
    return selectedIds.value
      .map((selectedId) => files.find((file) => file.id === selectedId))
      .filter((file): file is FileData => Boolean(file));
  });

  const contextMenuActions = computed(() => {
    if (!contextMenuState.value.visible || !options.buildContextMenuActions) {
      return [] as ContextMenuAction[];
    }

    const actions =
      options.buildContextMenuActions({
        selectedIds: selectedIds.value,
        selectedFiles: resolvedSelectedFiles.value,
        close: closeContextMenu,
      }) ?? [];

    return actions.filter((action) => action && (action.visible ?? true));
  });

  const isAllSelected = computed(() => {
    const files = options.getFiles();
    if (files.length === 0) return false;
    return files.every((file) => file.id && selectedFiles.value.has(file.id));
  });

  const isSomeSelected = computed(
    () => selectedFiles.value.size > 0 && !isAllSelected.value,
  );

  return {
    selectedFiles,
    selectedIds,
    isAllSelected,
    isSomeSelected,
    handleSelect,
    toggleSelectAll,
    setAllSelected,
    setSelected,
    clearSelection,
    handleContextMenu,
    contextMenuState,
    contextMenuActions,
    closeContextMenu,
  };
}
