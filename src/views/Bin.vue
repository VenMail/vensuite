<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from "vue";
import { useRoute } from "vue-router";
import {
  Grid,
  List,
  ChevronDown,
  Trash2,
  Download,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Eye,
  Loader2,
  FileIcon,
  FolderIcon,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { useFileStore } from "@/store/files";
import Button from "@/components/ui/button/Button.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileData } from "@/types";
import MediaViewer from "@/components/media/MediaViewer.vue";
import FileContextMenu from "@/components/FileContextMenu.vue";
import { toast } from "@/composables/useToast";

const route = useRoute();
const authStore = useAuthStore();
const fileStore = useFileStore();
const { isAuthenticated } = storeToRefs(authStore);
const theme = inject("theme") as { isDark: { value: boolean } };

const contextMenuState = ref({
  visible: false,
  x: 0,
  y: 0,
  targetId: null as string | null,
});

const contextMenuActions = computed(() => [
  {
    label: `Restore ${selectedFiles.value.size} item(s)`,
    icon: RefreshCw,
    action: () => {
      if (selectedFiles.value.size > 0) {
        handleBulkAction("restore");
      }
      contextMenuState.value.visible = false;
    },
  },
  {
    label: `Delete ${selectedFiles.value.size} item(s)`,
    icon: AlertCircle,
    action: () => {
      if (selectedFiles.value.size > 0) {
        handleBulkAction("delete");
      }
      contextMenuState.value.visible = false;
    },
  },
]);

const viewMode = ref<"grid" | "list" | "thumbnail">("grid");
const selectedFiles = ref<Set<string>>(new Set());
const sortBy = ref("updated_at");
const sortDir = ref<"asc" | "desc">("desc");
const searchValue = ref("");
const isLoading = ref(false);
const trashItems = ref<FileData[]>([]);
const filters = ref<{ type: string; source: string }>({ type: "all", source: "all" });

// Dialog states
const showDetailsDialog = ref(false);
const selectedItemForDetails = ref<FileData | null>(null);
const showEmptyConfirm = ref(false);
const showBulkConfirm = ref(false);
const bulkAction = ref<"restore" | "delete">("restore");

// Media viewer state
const isViewerOpen = ref(false);
const currentViewFile = ref<FileData | null>(null);
const currentViewIndex = ref(0);

// Helper to check if file is viewable media
function isViewableMedia(fileType: string | null | undefined): boolean {
  if (!fileType) return false;
  const type = fileType.toLowerCase();
  return [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "mp4",
    "webm",
    "ogg",
    "mp3",
    "wav",
    "aac",
  ].includes(type);
}

// Computed properties
const sortValue = computed({
  get: () => `${sortBy.value}-${sortDir.value}`,
  set: (val: string) => {
    const [by, dir] = val.split("-");
    if (by && dir) {
      sortBy.value = by;
      sortDir.value = dir as "asc" | "desc";
    }
  },
});

const filteredAndSortedItems = computed(() => {
  let items = [...trashItems.value];

  // Search filter
  if (searchValue.value) {
    const query = searchValue.value.toLowerCase();
    items = items.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.file_name?.toLowerCase().includes(query) ||
        getFileType(item).toLowerCase().includes(query)
    );
  }

  // Type filter
  if (filters.value.type && filters.value.type !== "all") {
    items = items.filter((item) => {
      const fileType = getFileType(item).toLowerCase();
      return fileType.includes(filters.value.type.toLowerCase());
    });
  }

  // Source filter
  if (filters.value.source && filters.value.source !== "all") {
    items = items.filter((item) => (item.source || "Files") === filters.value.source);
  }

  // Sorting
  items.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortBy.value) {
      case "title":
        aVal = (a.title || "").toLowerCase();
        bVal = (b.title || "").toLowerCase();
        break;
      case "file_type":
        aVal = getFileType(a).toLowerCase();
        bVal = getFileType(b).toLowerCase();
        break;
      case "updated_at":
        aVal = new Date(a.updated_at || 0).getTime();
        bVal = new Date(b.updated_at || 0).getTime();
        break;
      case "size":
        const aSize =
          typeof a.file_size === "string" ? parseInt(a.file_size, 10) : a.file_size || 0;
        const bSize =
          typeof b.file_size === "string" ? parseInt(b.file_size, 10) : b.file_size || 0;
        aVal = aSize;
        bVal = bSize;
        break;
      default:
        aVal = (a.title || "").toLowerCase();
        bVal = (b.title || "").toLowerCase();
    }

    if (aVal < bVal) return sortDir.value === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir.value === "asc" ? 1 : -1;
    return 0;
  });

  return items;
});

const isAllSelected = computed(() => {
  return (
    filteredAndSortedItems.value.length > 0 &&
    filteredAndSortedItems.value.every((file) => selectedFiles.value.has(file.id || ""))
  );
});

const isSomeSelected = computed(() => {
  return selectedFiles.value.size > 0 && !isAllSelected.value;
});

const viewableFiles = computed(() => {
  return filteredAndSortedItems.value.filter(
    (file) => !file.is_folder && isViewableMedia(file.file_type)
  );
});

// Utility functions
function getFileType(item: FileData): string {
  if (item.is_folder) return "Folder";

  if (item.file_name) {
    const ext = item.file_name.split(".").pop()?.toLowerCase();
    if (ext) return ext.toUpperCase();
  }

  if (item.file_type) {
    return item.file_type.toUpperCase();
  }

  if (item.mime_type) {
    const mimeMap: Record<string, string> = {
      "application/pdf": "PDF",
      "application/json": "JSON",
      "text/plain": "TXT",
      "image/jpeg": "JPEG",
      "image/png": "PNG",
      "image/gif": "GIF",
      "application/zip": "ZIP",
      "application/vnd.folder": "Folder",
    };
    return mimeMap[item.mime_type] || "Unknown";
  }

  return "Unknown";
}

function formatDate(dateString?: string | Date): string {
  if (!dateString) return "Unknown";

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

function formatFileSize(bytes?: number | string): string {
  if (!bytes || bytes === 0) return "N/A";

  const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return "N/A";

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(1024));
  const size = (numBytes / Math.pow(1024, i)).toFixed(1);

  return `${size} ${sizes[i]}`;
}

// API functions
async function fetchTrashedItems() {
  if (!authStore.getToken()) return;

  try {
    isLoading.value = true;
    const trashedFiles = await fileStore.fetchTrashItems();
    trashItems.value = trashedFiles;
  } catch (error) {
    console.error("Error loading trash items:", error);
    toast.error("Failed to load trash items");
  } finally {
    isLoading.value = false;
  }
}

async function restoreItem(id: string) {
  if (!id) return;

  try {
    isLoading.value = true;
    const item = trashItems.value.find((i) => i.id === id);

    const success = await fileStore.restoreFromTrash(id);

    if (success) {
      toast.success(`Restored "${item?.title || "item"}"`);
      trashItems.value = trashItems.value.filter((i) => i.id !== id);
      selectedFiles.value.delete(id);
    } else {
      toast.error("Failed to restore item");
    }
  } catch (error) {
    console.error("Error restoring file:", error);
    toast.error("Failed to restore item");
  } finally {
    isLoading.value = false;
  }
}

async function deletePermanently(id: string) {
  if (!id) return;

  try {
    isLoading.value = true;
    const item = trashItems.value.find((i) => i.id === id);

    const success = await fileStore.deleteFromTrash(id);

    if (success) {
      toast.success(`Permanently deleted "${item?.title || "item"}"`);
      trashItems.value = trashItems.value.filter((i) => i.id !== id);
      selectedFiles.value.delete(id);
    } else {
      toast.error("Failed to delete item permanently");
    }
  } catch (error) {
    console.error("Error permanently deleting file:", error);
    toast.error("Failed to delete item permanently");
  } finally {
    isLoading.value = false;
  }
}

// Selection functions
function toggleSelection(id: string | undefined, event?: MouseEvent) {
  if (!id) return;

  if (event) {
    event.stopPropagation();
  }

  if (event?.ctrlKey || event?.metaKey) {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  } else if (event?.shiftKey && selectedFiles.value.size > 0) {
    const allFiles = filteredAndSortedItems.value;
    const lastSelected = Array.from(selectedFiles.value).pop();
    const lastSelectedIndex = allFiles.findIndex((f) => f.id === lastSelected);
    const currentIndex = allFiles.findIndex((f) => f.id === id);

    if (lastSelectedIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);

      allFiles.slice(start, end + 1).forEach((f) => {
        if (f.id) selectedFiles.value.add(f.id);
      });
    }
  } else {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedFiles.value.clear();
  } else {
    const newSelection = new Set<string>();
    filteredAndSortedItems.value.forEach((file) => {
      if (file.id) newSelection.add(file.id);
    });
    selectedFiles.value = newSelection;
  }
}

function clearSelection() {
  selectedFiles.value.clear();
}

// Action functions
function openDetails(item: FileData) {
  selectedItemForDetails.value = item;
  showDetailsDialog.value = true;
}

function handlePreview(file: FileData) {
  const index = viewableFiles.value.findIndex((f) => f.id === file.id);
  if (index !== -1) {
    currentViewFile.value = file;
    currentViewIndex.value = index;
    isViewerOpen.value = true;
  }
}

function closeViewer() {
  isViewerOpen.value = false;
  currentViewFile.value = null;
}

function handleViewerNavigate(index: number) {
  if (index >= 0 && index < viewableFiles.value.length) {
    currentViewIndex.value = index;
    currentViewFile.value = viewableFiles.value[index];
  }
}

function handleViewerDownload(file: FileData) {
  downloadItem(file);
}

function downloadItem(item: FileData) {
  if (!item.file_url || item.is_folder) {
    toast.error("Cannot download this item");
    return;
  }

  try {
    const link = document.createElement("a");
    link.href = item.file_url;
    link.download = item.file_name || item.title || "download";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading "${item.title}"`);
  } catch (err) {
    toast.error("Failed to download file");
  }
}

function previewItem(item: FileData) {
  if (!item.file_url || item.is_folder) {
    toast.info("Preview not available for this item");
    return;
  }

  if (isViewableMedia(item.file_type)) {
    handlePreview(item);
  } else {
    try {
      window.open(item.file_url, "_blank");
    } catch (err) {
      toast.error("Failed to preview file");
    }
  }
}

// Bulk actions
function emptyBin() {
  if (trashItems.value.length === 0) {
    toast.info("Trash is already empty");
    return;
  }
  showEmptyConfirm.value = true;
}

async function confirmEmptyBin() {
  try {
    isLoading.value = true;

    const result = await fileStore.emptyTrash();

    trashItems.value = [];
    selectedFiles.value.clear();
    showEmptyConfirm.value = false;

    if (result.failed.length === 0) {
      toast.success(`Bin emptied successfully - ${result.deleted.length} items deleted`);
    } else {
      toast.warning(
        `Bin partially emptied - ${result.deleted.length} deleted, ${result.failed.length} failed`
      );
    }
  } catch (err: any) {
    toast.error(err.message || "Failed to empty bin");
  } finally {
    isLoading.value = false;
  }
}

function handleBulkAction(action: "restore" | "delete") {
  if (selectedFiles.value.size === 0) {
    toast.info("No items selected");
    return;
  }

  bulkAction.value = action;
  showBulkConfirm.value = true;
}

async function performBulkAction() {
  try {
    isLoading.value = true;

    const itemIds = Array.from(selectedFiles.value);
    if (itemIds.length === 0) {
      showBulkConfirm.value = false;
      return;
    }

    if (bulkAction.value === "restore") {
      const result = await fileStore.restoreMany(itemIds, null);

      result.restored.forEach((restoredFile) => {
        trashItems.value = trashItems.value.filter((item) => item.id !== restoredFile.id);
        selectedFiles.value.delete(restoredFile.id || "");
      });

      if (result.failed.length === 0) {
        toast.success(`Successfully restored ${result.restored.length} item(s)`);
      } else {
        toast.warning(
          `Restored ${result.restored.length} item(s), ${result.failed.length} failed`
        );

        result.failed.forEach((failure) => {
          console.error(`Failed to restore ${failure.id}:`, failure.message);
        });
      }
    } else {
      const result = await fileStore.deleteMany(itemIds);

      result.deleted.forEach((id) => {
        trashItems.value = trashItems.value.filter((item) => item.id !== id);
        selectedFiles.value.delete(id);
      });

      if (result.failed.length === 0) {
        toast.success(
          `Successfully deleted ${result.deleted.length} item(s) permanently`
        );
      } else {
        toast.warning(
          `Deleted ${result.deleted.length} item(s), ${result.failed.length} failed`
        );
      }
    }

    selectedFiles.value.clear();
    showBulkConfirm.value = false;
  } catch (err: any) {
    const action = bulkAction.value === "restore" ? "restore" : "delete";
    toast.error(err.message || `Failed to ${action} items`);
  } finally {
    isLoading.value = false;
  }
}

// Event handlers
function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // Don't clear selection if clicking on file items, buttons, or interactive elements
  if (
    !target.closest(".file-item") &&
    !target.closest("button") &&
    !target.closest('[role="menuitem"]') &&
    !target.closest('[role="dialog"]')
  ) {
    selectedFiles.value.clear();
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (isViewerOpen.value) {
      closeViewer();
    } else {
      selectedFiles.value.clear();
    }
  } else if (event.key === "Delete" && selectedFiles.value.size > 0) {
    handleBulkAction("delete");
  }
}

function clearFilters() {
  searchValue.value = "";
  filters.value = { type: "all", source: "all" };
}

// Authentication check
function loginWithVenmail() {
  const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
  const currentPath = route.fullPath;
  localStorage.setItem("loginRedirect", currentPath);
  window.location.href = authStore.getAuthUrl(redirectUri);
}

// Global search handler
function handleGlobalSearch(event: CustomEvent) {
  const { query, filters: searchFilters } = event.detail;
  searchValue.value = query || "";

  if (searchFilters && searchFilters.length > 0) {
    const filterMap: Record<string, string> = {
      documents: "doc",
      spreadsheets: "xls",
      media: "image",
      folders: "folder",
    };

    const mappedFilter = filterMap[searchFilters[0]] || searchFilters[0];
    filters.value.type = mappedFilter;
  } else {
    filters.value.type = "all";
  }
}

// Lifecycle
onMounted(async () => {
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleEscapeKey);
  window.addEventListener("global-search", handleGlobalSearch as EventListener);

  if (authStore.getToken()) {
    await fetchTrashedItems();
  }

  document.title = "Trash - File Manager";
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEscapeKey);
  window.removeEventListener("global-search", handleGlobalSearch as EventListener);
});
</script>

<template>
  <div
    v-if="isAuthenticated"
    :class="[
      'flex h-screen text-gray-900 transition-colors duration-200',
      theme.isDark.value
        ? 'bg-gradient-to-br from-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-gray-50 to-gray-100',
    ]"
  >
    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Loading bar -->
      <div v-if="isLoading" class="loading-bar">
        <div class="loading-progress"></div>
      </div>

      <!-- File browser -->
      <div class="flex-1 p-4 sm:p-6 overflow-hidden">
        <!-- Header with responsive layout -->
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6"
        >
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
          >
            <div class="flex items-center space-x-2">
              <Trash2 class="h-6 w-6 text-red-500" />
              <h2
                :class="[
                  'text-xl sm:text-2xl font-semibold',
                  theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
                ]"
              >
                {{$t('Commons.heading.trash')}}
              </h2>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                @click="fetchTrashedItems"
                :disabled="isLoading"
              >
                <RefreshCw :class="['h-4 w-4', isLoading ? 'animate-spin' : '']" />
                <span class="ml-2 hidden sm:inline">{{$t('Commons.button.refresh')}}</span>
              </Button>
              <Button
                v-if="trashItems.length > 0"
                variant="destructive"
                size="sm"
                @click="emptyBin"
                :disabled="isLoading"
              >
                <Trash2 class="h-4 w-4" />
                <span class="ml-2 hidden sm:inline">{{$t('Commons.button.empty_bin')}}</span>
              </Button>
            </div>
          </div>

          <!-- Right controls with responsive layout -->
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto"
          >
            <template v-if="selectedFiles.size > 0">
              <!-- Selection info -->
              <div class="flex items-center space-x-2">
                <span
                  :class="[
                    'text-sm font-medium',
                    theme.isDark.value ? 'text-gray-300' : 'text-gray-700',
                  ]"
                >
                  {{ selectedFiles.size }} selected
                </span>
                <div
                  :class="[
                    'h-4 w-px',
                    theme.isDark.value ? 'bg-gray-600' : 'bg-gray-300',
                  ]"
                ></div>
              </div>
              <!-- Selection actions -->
              <div class="flex items-center flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click.stop="handleBulkAction('restore')"
                >
                  <RefreshCw class="h-4 w-4 mr-2" />
                  <span class="hidden sm:inline">{{$t('Commons.button.restore')}}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click.stop="handleBulkAction('delete')"
                >
                  <AlertCircle class="h-4 w-4 mr-2" />
                  <span class="hidden sm:inline">{{$t('Commons.button.delete')}}</span>
                </Button>
                <Button variant="ghost" size="sm" @click.stop="clearSelection">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center gap-3 w-full sm:w-auto">
                <!-- Items Count -->
                <div
                  v-if="filteredAndSortedItems.length > 0"
                  :class="[
                    'flex items-center gap-2 text-sm',
                    theme.isDark.value ? 'text-gray-400' : 'text-gray-600',
                  ]"
                >
                  <span>{{ filteredAndSortedItems.length }} items in trash</span>
                </div>

                <!-- Sort dropdown -->
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      :class="[
                        'flex-1 sm:flex-initial',
                        theme.isDark.value
                          ? 'border-gray-600 text-gray-100'
                          : 'border-gray-300',
                      ]"
                    >
                      <span class="hidden sm:inline">Sort: </span>
                      {{
                        sortBy === "title"
                          ? $t('Commons.button.name')
                          : sortBy === "updated_at"
                          ? $t('Commons.button.date')
                          : sortBy === "file_type"
                          ? $t('Commons.button.type')
                          : $t('Commons.button.size')
                      }}
                      <ChevronDown class="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem @click="sortValue = 'title-asc'">
                      {{$t('Views.Bin.text.sort_by_name')}}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="sortValue = 'updated_at-desc'">
                      Sort by Date (Newest)
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="sortValue = 'updated_at-asc'">
                      Sort by Date (Oldest)
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="sortValue = 'file_type-asc'">
                      {{$t('Views.Bin.text.sort_by_type')}}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="sortValue = 'size-desc'">
                      {{$t('Views.Bin.text.sort_by_size')}}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <!-- Inline View Toggle -->
                <div
                  :class="[
                    'flex items-center rounded-lg p-1 shrink-0',
                    theme.isDark.value ? 'bg-gray-800' : 'bg-gray-100',
                  ]"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    :class="[
                      'px-2 py-2',
                      viewMode === 'grid'
                        ? theme.isDark.value
                          ? 'bg-gray-700 shadow-sm'
                          : 'bg-white shadow-sm'
                        : '',
                    ]"
                    @click="viewMode = 'grid'"
                    title="Grid View"
                  >
                    <Grid class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    :class="[
                      'px-2 py-2',
                      viewMode === 'list'
                        ? theme.isDark.value
                          ? 'bg-gray-700 shadow-sm'
                          : 'bg-white shadow-sm'
                        : '',
                    ]"
                    @click="viewMode = 'list'"
                    title="List View"
                  >
                    <List class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    :class="[
                      'px-2 py-2',
                      viewMode === 'thumbnail'
                        ? theme.isDark.value
                          ? 'bg-gray-700 shadow-sm'
                          : 'bg-white shadow-sm'
                        : '',
                    ]"
                    @click="viewMode = 'thumbnail'"
                    title="Thumbnail View"
                  >
                    <svg
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Content area -->
        <ScrollArea
          :class="[
            'h-[calc(100vh-240px)] sm:h-[calc(100vh-280px)] rounded-lg shadow-sm border',
            theme.isDark.value
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200',
          ]"
        >
          <!-- Loading state -->
          <div
            v-if="isLoading && trashItems.length === 0"
            :class="[
              'flex flex-col items-center justify-center py-16 px-6 gap-12',
              theme.isDark.value ? 'bg-gray-900/40' : 'bg-gray-50',
            ]"
          >
            <div class="w-full max-w-5xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div
                v-for="n in 4"
                :key="`trash-skeleton-${n}`"
                :class="[
                  'rounded-xl border overflow-hidden shadow-sm relative isolate backdrop-blur-sm',
                  theme.isDark.value
                    ? 'border-gray-700 bg-gray-800/80'
                    : 'border-gray-200 bg-white/80',
                ]"
              >
                <div class="skeleton-hero"></div>
                <div class="p-4 space-y-3">
                  <div class="skeleton-line w-3/4"></div>
                  <div class="skeleton-line w-1/2"></div>
                  <div class="flex gap-2">
                    <span class="skeleton-pill w-20"></span>
                    <span class="skeleton-pill w-16"></span>
                  </div>
                </div>
              </div>
            </div>
            <div
              :class="[
                'flex items-center gap-3 text-sm font-medium',
                theme.isDark.value ? 'text-gray-400' : 'text-gray-600',
              ]"
            >
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>{{$t('Views.Bin.text.preparing_your_deleted_items')}}</span>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="!isLoading && filteredAndSortedItems.length === 0"
            class="flex flex-col items-center justify-center py-16 px-6"
          >
            <div
              :class="[
                'flex items-center justify-center w-16 h-16 rounded-full mb-6',
                theme.isDark.value ? 'bg-gray-700' : 'bg-gray-100',
              ]"
            >
              <Trash2
                :class="[
                  'h-8 w-8',
                  theme.isDark.value ? 'text-gray-400' : 'text-gray-500',
                ]"
              />
            </div>
            <h3
              :class="[
                'text-xl font-semibold mb-2 text-center',
                theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
              ]"
            >
              {{
                trashItems.length === 0
                  ? $t('Views.Bin.heading.trash_is_empty')
                  : searchValue || filters.type !== $t('Commons.heading.all') || filters.source !== $t('Commons.heading.all')
                  ? $t('Views.Bin.heading.no_matching_items_found')
                  : $t('Views.Bin.heading.no_items_found')
              }}
            </h3>
            <p
              :class="[
                'text-center mb-8 max-w-md',
                theme.isDark.value ? 'text-gray-400' : 'text-gray-600',
              ]"
            >
              {{
                trashItems.length === 0
                  ? $t('Views.Bin.text.deleted_files_will_appear')
                  : $t('Views.Bin.text.try_adjusting_your_search')
              }}
            </p>
            <div v-if="trashItems.length > 0" class="flex gap-3 justify-center">
              <Button variant="outline" @click="clearFilters"> {{$t('Commons.button.clear_filters')}} </Button>
              <Button variant="ghost" @click="fetchTrashedItems">
                <RefreshCw class="mr-2 h-4 w-4" />
                {{$t('Commons.button.refresh')}}
              </Button>
            </div>
          </div>

          <!-- Content Views -->
          <div v-else class="p-2 sm:p-4">
            <!-- Select All controls -->
            <div
              v-if="filteredAndSortedItems.length > 0"
              class="flex items-center justify-between mb-4 px-2"
            >
              <div class="flex items-center gap-2">
                <Checkbox
                  :checked="isAllSelected"
                  :indeterminate="isSomeSelected"
                  @update:checked="toggleSelectAll"
                  @click.stop
                  :class="[
                    'rounded border text-primary-600 focus:ring-primary-500 focus:ring-offset-0',
                    theme.isDark.value
                      ? 'border-gray-600 bg-gray-700 focus:ring-offset-gray-800'
                      : 'border-gray-300 bg-white focus:ring-offset-white',
                  ]"
                />
                <label
                  :class="[
                    'text-sm font-medium cursor-pointer select-none',
                    theme.isDark.value ? 'text-gray-300' : 'text-gray-700',
                  ]"
                  @click="toggleSelectAll"
                >
                  {{$t('Commons.label.select_all')}}
                </label>
              </div>

              <!-- Stats -->
              <div
                :class="[
                  'text-sm',
                  theme.isDark.value ? 'text-gray-400' : 'text-gray-600',
                ]"
              >
                {{ filteredAndSortedItems.length }} items
                <template v-if="selectedFiles.size > 0">
                  • {{ selectedFiles.size }} selected
                </template>
              </div>
            </div>

            <!-- Thumbnail View -->
            <div
              v-if="viewMode === 'thumbnail'"
              class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
            >
              <div
                v-for="item in filteredAndSortedItems"
                :key="item.id"
                :id="`fileItem-${item.id}`"
                class="relative group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer file-item"
                @click="openDetails(item)"
              >
                <!-- Top Controls -->
                <div class="flex items-center justify-between mb-3">
                  <Checkbox
                    :checked="selectedFiles.has(item.id || '')"
                    @update:checked="() => toggleSelection(item.id)"
                    @click.stop
                    class="bg-white/80 backdrop-blur-sm"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                        @click.stop
                      >
                        <MoreVertical class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        @click.stop="restoreItem(item.id || '')"
                        :disabled="isLoading"
                      >
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{$t('Commons.button.restore')}}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="!item.is_folder && item.file_url"
                        @click.stop="previewItem(item)"
                      >
                        <Eye class="h-4 w-4 mr-2" />
                        {{$t('Commons.alt.preview')}}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="!item.is_folder && item.file_url"
                        @click.stop="downloadItem(item)"
                      >
                        <Download class="h-4 w-4 mr-2" />
                        {{$t('Commons.button.download')}}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        @click.stop="deletePermanently(item.id || '')"
                        class="text-destructive focus:text-destructive"
                        :disabled="isLoading"
                      >
                        <AlertCircle class="h-4 w-4 mr-2" />
                        {{$t('Commons.text.delete_permanently')}}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <!-- File Icon and Title -->
                <div class="flex flex-col items-center text-center mb-4">
                  <div
                    class="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center mb-3"
                  >
                    <FolderIcon v-if="item.is_folder" class="h-8 w-8 text-blue-500" />
                    <FileIcon v-else class="h-8 w-8 text-gray-500" />
                  </div>
                  <h3
                    class="font-medium text-gray-900 dark:text-gray-100 text-sm truncate w-full"
                    :title="item.title"
                  >
                    {{ item.title }}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ getFileType(item) }}
                  </p>
                </div>

                <!-- File Info -->
                <div class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <div class="flex justify-between items-center">
                    <span>Size:</span>
                    <span class="font-medium">{{ formatFileSize(item.file_size) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span>Deleted:</span>
                    <span class="font-medium">{{ formatDate(item.updated_at) }}</span>
                  </div>
                  <div class="flex justify-center">
                    <Badge variant="outline" class="text-xs">
                      {{ item.source || $t('Commons.text.files') }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grid View -->
            <div
              v-else-if="viewMode === 'grid'"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <div
                v-for="item in filteredAndSortedItems"
                :key="item.id"
                :id="`fileItem-${item.id}`"
                class="relative group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer file-item"
                @click="openDetails(item)"
              >
                <div class="flex items-start justify-between mb-3">
                  <Checkbox
                    :checked="selectedFiles.has(item.id || '')"
                    @update:checked="() => toggleSelection(item.id)"
                    @click.stop
                    class="mt-0.5"
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        @click.stop
                      >
                        <MoreVertical class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        @click.stop="restoreItem(item.id || '')"
                        :disabled="isLoading"
                      >
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{$t('Commons.button.restore')}}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="!item.is_folder && item.file_url"
                        @click.stop="previewItem(item)"
                      >
                        <Eye class="h-4 w-4 mr-2" />
                        {{$t('Commons.alt.preview')}}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="!item.is_folder && item.file_url"
                        @click.stop="downloadItem(item)"
                      >
                        <Download class="h-4 w-4 mr-2" />
                        {{$t('Commons.button.download')}}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        @click.stop="deletePermanently(item.id || '')"
                        class="text-destructive focus:text-destructive"
                        :disabled="isLoading"
                      >
                        <AlertCircle class="h-4 w-4 mr-2" />
                        {{$t('Commons.text.delete_permanently')}}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div class="flex items-center mb-2">
                  <FolderIcon
                    v-if="item.is_folder"
                    class="h-8 w-8 text-gray-400 mr-3 flex-shrink-0"
                  />
                  <FileIcon v-else class="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
                  <div class="min-w-0 flex-1">
                    <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ item.title }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {{ getFileType(item) }}
                    </p>
                  </div>
                </div>

                <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <div class="flex justify-between">
                    <span>Source:</span>
                    <span>{{ item.source || $t('Commons.text.files') }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Size:</span>
                    <span>{{ formatFileSize(item.file_size) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Deleted:</span>
                    <span>{{ formatDate(item.updated_at) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- List View (Table) -->
            <div v-else-if="viewMode === 'list'" class="overflow-x-auto">
              <table class="w-full">
                <thead class="sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <tr class="border-b border-gray-200 dark:border-gray-800">
                    <th class="px-4 py-3 text-left">
                      <Checkbox
                        :checked="isAllSelected"
                        :indeterminate="isSomeSelected"
                        @update:checked="toggleSelectAll"
                      />
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{$t('Commons.button.name')}}
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{$t('Commons.button.type')}}
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{$t('Commons.heading.source')}}
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{$t('Commons.button.size')}}
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{$t('Commons.text.delete')}}
                    </th>
                    <th
                      class="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      {{$t('Commons.text.actions')}}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in filteredAndSortedItems"
                    :key="item.id"
                    :id="`fileItem-${item.id}`"
                    class="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 file-item"
                  >
                    <td class="px-4 py-3">
                      <Checkbox
                        :checked="selectedFiles.has(item.id || '')"
                        @update:checked="() => toggleSelection(item.id)"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center">
                        <FolderIcon
                          v-if="item.is_folder"
                          class="h-4 w-4 mr-3 text-gray-500 flex-shrink-0"
                        />
                        <FileIcon
                          v-else
                          class="h-4 w-4 mr-3 text-gray-500 flex-shrink-0"
                        />
                        <span
                          class="text-gray-900 dark:text-gray-100 cursor-pointer hover:underline"
                          @click="openDetails(item)"
                        >
                          {{ item.title }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <Badge variant="secondary">
                        {{ getFileType(item) }}
                      </Badge>
                    </td>
                    <td class="px-4 py-3">
                      <Badge
                        :variant="
                          (item.source || 'Files') === 'Files' ? 'default' : 'outline'
                        "
                      >
                        {{ item.source || $t('Commons.text.files') }}
                      </Badge>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {{ formatFileSize(item.file_size) }}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {{ formatDate(item.updated_at) }}
                    </td>
                    <td class="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                            <MoreVertical class="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            @click="restoreItem(item.id || '')"
                            :disabled="isLoading"
                          >
                            <RefreshCw class="h-4 w-4 mr-2" />
                            {{$t('Commons.button.restore')}}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            v-if="!item.is_folder && item.file_url"
                            @click="previewItem(item)"
                          >
                            <Eye class="h-4 w-4 mr-2" />
                            {{$t('Commons.alt.preview')}}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            v-if="!item.is_folder && item.file_url"
                            @click="downloadItem(item)"
                          >
                            <Download class="h-4 w-4 mr-2" />
                            {{$t('Commons.button.download')}}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            @click="deletePermanently(item.id || '')"
                            class="text-destructive focus:text-destructive"
                            :disabled="isLoading"
                          >
                            <AlertCircle class="h-4 w-4 mr-2" />
                            {{$t('Commons.text.delete_permanently')}}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>

  <!-- Login screen -->
  <div
    v-else
    :class="[
      'h-screen w-full flex flex-col items-center justify-center transition-colors duration-200',
      theme.isDark.value
        ? 'bg-gradient-to-br from-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-gray-50 to-gray-100',
    ]"
  >
    <div
      :class="[
        'backdrop-filter backdrop-blur-lg p-10 rounded-lg shadow-xl border',
        theme.isDark.value ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
      ]"
    >
      <div class="flex items-center justify-center mb-6">
        <img
          :src="theme.isDark.value ? '/logo-white.png' : '/logo-black.png'"
          alt="VenMail Logo"
          class="h-6 w-full"
        />
      </div>
      <h2
        :class="[
          'text-2xl font-bold mb-6 text-center',
          theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
        ]"
      >
        {{$t('Views.Bin.heading.welcome_to_venmail_file')}}
      </h2>
      <Button
        class="w-full bg-primary-600 hover:bg-primary-700"
        @click="loginWithVenmail"
      >
        {{$t('Views.Bin.button.login_with_venmail')}}
      </Button>
      <p
        :class="[
          'text-sm mt-4 text-center',
          theme.isDark.value ? 'text-gray-400' : 'text-gray-500',
        ]"
      >
        {{$t('Views.Bin.text.login_to_access_your')}}
      </p>
    </div>
  </div>

  <!-- Context Menu -->
  <FileContextMenu
    v-if="contextMenuState.visible"
    :state="contextMenuState"
    :actions="contextMenuActions"
    :is-dark="theme.isDark.value"
  />

  <!-- Dialogs -->
  <Dialog v-model:open="showDetailsDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Details: {{ selectedItemForDetails?.title }}</DialogTitle>
      </DialogHeader>
      <div v-if="selectedItemForDetails" class="space-y-4">
        <div>
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.type')}}</h4>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getFileType(selectedItemForDetails) }}
          </p>
        </div>
        <div>
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.source')}}</h4>
          <p class="text-gray-600 dark:text-gray-400">
            {{ selectedItemForDetails.source || $t('Commons.text.files') }}
          </p>
        </div>
        <div v-if="selectedItemForDetails.file_name">
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.original_filename')}}</h4>
          <p class="text-gray-600 dark:text-gray-400">
            {{ selectedItemForDetails.file_name }}
          </p>
        </div>
        <div>
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.size')}}</h4>
          <p class="text-gray-600 dark:text-gray-400">
            {{ formatFileSize(selectedItemForDetails.file_size) }}
          </p>
        </div>
        <div>
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.deleted_at')}}</h4>
          <p class="text-gray-600 dark:text-gray-400">
            {{ formatDate(selectedItemForDetails.updated_at) }}
          </p>
        </div>
        <div v-if="selectedItemForDetails.mime_type">
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.mime_type')}}</h4>
          <p class="text-gray-600 dark:text-gray-400">
            {{ selectedItemForDetails.mime_type }}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showDetailsDialog = false">{{$t('Commons.button.close')}}</Button>
        <Button
          @click="
            restoreItem(selectedItemForDetails?.id || '');
            showDetailsDialog = false;
          "
          :disabled="isLoading"
        >
          <RefreshCw class="h-4 w-4 mr-2" />
          {{$t('Commons.button.restore')}}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Empty Bin Confirm -->
  <Dialog v-model:open="showEmptyConfirm">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{$t('Views.Bin.heading.empty_bin')}}</DialogTitle>
      </DialogHeader>
      <p class="text-gray-600 dark:text-gray-400">
        This will permanently delete all {{ trashItems.length }} items in the trash. This
        action cannot be undone.
      </p>
      <DialogFooter>
        <Button variant="outline" @click="showEmptyConfirm = false" :disabled="isLoading"
          >{{$t('Commons.button.cancel')}}</Button
        >
        <Button variant="destructive" @click="confirmEmptyBin" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
          {{$t('Commons.button.empty_bin')}}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Bulk Action Confirm -->
  <Dialog v-model:open="showBulkConfirm">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{
          bulkAction === "restore"
            ? $t('Views.Bin.heading.restore_selected_items')
            : $t('Views.Bin.heading.delete_selected_items_permanently')
        }}</DialogTitle>
      </DialogHeader>
      <p class="text-gray-600 dark:text-gray-400" v-if="bulkAction === 'restore'">
        This will restore {{ selectedFiles.size }} item(s) to their original location.
      </p>
      <p class="text-gray-600 dark:text-gray-400" v-else>
        This will permanently delete {{ selectedFiles.size }} item(s). This action cannot
        be undone.
      </p>
      <DialogFooter>
        <Button variant="outline" @click="showBulkConfirm = false" :disabled="isLoading"
          >{{$t('Commons.button.cancel')}}</Button
        >
        <Button
          :variant="bulkAction === 'restore' ? 'default' : 'destructive'"
          @click="performBulkAction"
          :disabled="isLoading"
        >
          <Loader2 v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
          {{ bulkAction === "restore" ? $t('Commons.button.restore') : $t('Commons.button.delete') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <MediaViewer
    :is-open="isViewerOpen"
    :current-file="currentViewFile"
    :files="viewableFiles"
    :current-index="currentViewIndex"
    @close="closeViewer"
    @download="handleViewerDownload"
    @navigate="handleViewerNavigate"
  />
</template>

<style scoped>
.loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 0.25rem;
  z-index: 50;
  overflow: hidden;
  background-color: rgb(229 231 235);
}

.dark .loading-bar {
  background-color: rgb(55 65 81);
}

.loading-progress {
  height: 100%;
  background-color: orangered;
  width: 30%;
  animation: loading 2s infinite ease-in-out;
}

.dark .loading-progress {
  background-color: orangered;
}
</style>
