<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  watchEffect,
  watch,
} from "vue";
import { useRouter, useRoute } from "vue-router";
import { useExplorerNavigation } from "@/composables/useExplorerNavigation";
import {
  Grid,
  List,
  Plus,
  ChevronDown,
  FolderOpen,
  Upload,
  FolderPlus as FolderPlusIcon,
  Trash2,
  Edit,
  Download,
  Share2,
  ArrowUp,
  Filter,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { useFileStore } from "@/store/files";
import Button from "@/components/ui/button/Button.vue";
import Switch from "@/components/ui/switch/Switch.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileData } from "@/types";
import FileItem from "@/components/FileItem.vue";
import MediaViewer from "@/components/media/MediaViewer.vue";
import FileContextMenu from "@/components/FileContextMenu.vue";
import { sluggify } from "@/utils/lib";
import { toast } from "@/composables/useToast";
import FileUploader from "@/components/FileUploader.vue";
import {
  useFileExplorer,
  type ContextMenuAction,
  type ContextMenuBuilderContext,
} from "@/composables/useFileExplorer";
import { t } from '@/i18n';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const fileStore = useFileStore();
const { isAuthenticated } = storeToRefs(authStore);

const viewMode = ref<"grid" | "list" | "thumbnail">("grid");
const showRecentFiles = ref(false);
const sortBy = ref("name");
const groupByFileType = ref(false);
const searchValue = ref("");
const isUploadDialogOpen = ref(false);
const isImportingAttachment = ref(false);
const isAttachmentDialogOpen = ref(false);
const attachmentDialogMessage = ref("");
const attachmentDialogError = ref<string | null>(null);

// Initialize explorer navigation
const {
  currentFolderId,
  breadcrumbs,
  explorerItems: navExplorerItems,
  currentTitle,
  canNavigateUp,
  openFolder,
  navigateToBreadcrumb,
  navigateUp,
  refresh,
  initialize,
  isLoading,
} = useExplorerNavigation({
  rootTitle: 'All Files',
  onNavigate: () => clearSelection(),
});

// Media viewer state
const isViewerOpen = ref(false);
const currentViewFile = ref<FileData | null>(null);
const currentViewIndex = ref(0);

const templates = {
  Documents: [
    { name: "Blank Document", icon: "IconMicrosoftWord" },
    { name: "Resume", icon: "IconMicrosoftWord" },
    { name: "Letter", icon: "IconMicrosoftWord" },
  ],
  Spreadsheets: [
    { name: "Blank Spreadsheet", icon: "IconMicrosoftExcel" },
    { name: "Budget", icon: "IconMicrosoftExcel" },
    { name: "Invoice", icon: "IconMicrosoftExcel" },
  ],
};

function buildContextMenuActions({
  selectedIds,
  selectedFiles: selectedFileItems,
  close,
}: ContextMenuBuilderContext): ContextMenuAction[] {
  const numSelected = selectedIds.length;
  if (numSelected === 0) return [];

  const hasFiles = selectedFileItems.some((file) => file && !file.is_folder);

  const actions: ContextMenuAction[] = [];

  if (numSelected === 1) {
    actions.push(
      {
        label: "Open",
        icon: FolderOpen,
        action: () => {
          const id = selectedIds[0];
          if (id) {
            openFile(id);
          }
          close();
        },
      },
      {
        label: "Rename",
        icon: Edit,
        action: () => {
          handleRename();
          close();
        },
      },
    );
  }

  if (hasFiles) {
    actions.push({
      label: `Download ${numSelected > 1 ? `(${numSelected})` : ""}`.trim(),
      icon: Download,
      action: () => {
        handleBulkDownload();
        close();
      },
    });
  }

  actions.push({
    label: `Delete ${numSelected > 1 ? `(${numSelected})` : ""}`.trim(),
    icon: Trash2,
    action: () => {
      handleBulkDelete();
      close();
    },
  });

  if (numSelected === 1) {
    actions.push({
      label: "Share",
      icon: Share2,
      action: () => {
        console.log("Share");
        close();
      },
    });
  }

  return actions;
}

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

// File type statistics with icons
const fileTypeStats = computed(() => {
  const stats: Record<string, number> = {};
  let folderCount = 0;

  sortedItems.value.forEach((item) => {
    if (item.is_folder) {
      folderCount++;
    } else {
      const fileType = item.file_type?.toUpperCase() || "UNKNOWN";
      stats[fileType] = (stats[fileType] || 0) + 1;
    }
  });

  return { folderCount, fileTypes: stats };
});

function loginWithVenmail() {
  const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
  const currentPath = route.fullPath;
  localStorage.setItem("loginRedirect", currentPath);
  window.location.href = authStore.getAuthUrl(redirectUri);
}

onMounted(async () => {
  watchEffect(async () => {
    const attachId = route.params?.id as string | undefined;
    if (!attachId) return;

    console.log("importing..", attachId);
    isAttachmentDialogOpen.value = true;
    attachmentDialogError.value = null;
    attachmentDialogMessage.value = t('Views.Home.text.attachment_import_importing');
    isImportingAttachment.value = true;
    try {
      const doc = await fileStore.importAttachment(attachId);
      if (doc) {
        attachmentDialogMessage.value = t('Views.Home.text.attachment_import_preparing_document');
        await refresh();
        if (doc.id) {
          attachmentDialogMessage.value = t('Views.Home.text.attachment_import_opening_document');
          await openFile(doc.id);
          isAttachmentDialogOpen.value = false;
        }
      } else {
        attachmentDialogError.value = t('Views.Home.text.attachment_import_failed');
      }
    } finally {
      isImportingAttachment.value = false;
    }
  });

  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleEscapeKey);

  if (authStore.getToken()) {
    const offlineDocs = fileStore.loadOfflineDocuments();
    if (!fileStore.isOnline) {
      fileStore.allFiles = offlineDocs;
    }

    if (import.meta.env.DEV) {
      const filesWithMissingTypes = offlineDocs.filter(
        (doc) => !doc.file_type && !doc.is_folder
      );
      if (filesWithMissingTypes.length > 0) {
        console.warn(
          "Home: Found files with missing file_type:",
          filesWithMissingTypes.map((doc) => ({
            id: doc.id,
            title: doc.title,
          }))
        );
      }
    }

    if (fileStore.isOnline) {
      const onlineDocs = await fileStore.loadDocuments(true);
      const mergedFiles = new Map<string, FileData>();

      offlineDocs.forEach((doc) => {
        if (doc.id) {
          mergedFiles.set(doc.id, doc);
        }
      });

      onlineDocs.forEach((doc) => {
        if (doc.id) {
          const offlineDoc = mergedFiles.get(doc.id);
          if (!offlineDoc || !offlineDoc.isDirty) {
            if (
              offlineDoc &&
              offlineDoc.title &&
              doc.title &&
              /^(Untitled|New Document|New Spreadsheet)$/i.test(doc.title)
            ) {
              mergedFiles.set(doc.id, { ...doc, title: offlineDoc.title });
            } else {
              mergedFiles.set(doc.id, doc);
            }
          }
        }
      });

      fileStore.allFiles = Array.from(mergedFiles.values());

      if (import.meta.env.DEV) {
        const finalFilesWithMissingTypes = fileStore.allFiles.filter(
          (doc) => !doc.file_type && !doc.is_folder
        );
        if (finalFilesWithMissingTypes.length > 0) {
          console.warn(
            "Home: Final files with missing file_type:",
            finalFilesWithMissingTypes.map((doc) => ({
              id: doc.id,
              title: doc.title,
            }))
          );
        }
      }
    }
  }

  await initialize();
  document.title = currentTitle.value;
});

watch(currentTitle, (newTitle) => {
  document.title = newTitle;
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEscapeKey);
});

const activeCollection = computed<FileData[]>(() =>
  showRecentFiles.value ? fileStore.recentFiles : navExplorerItems.value,
);

const selectedFilesList = computed(() => {
  const query = searchValue.value.trim().toLowerCase();
  if (!query) {
    return [...activeCollection.value];
  }

  return activeCollection.value.filter((file: FileData) => {
    const title = file.title?.toLowerCase() ?? "";
    const name = file.file_name?.toLowerCase() ?? "";
    return title.includes(query) || name.includes(query);
  });
});

const folders = computed(() => {
  return selectedFilesList.value.filter((file) => file.is_folder);
});
const files = computed(() => {
  return selectedFilesList.value.filter((file) => !file.is_folder);
});

const sortedItems = computed(() => {
  const sortFn = (a: FileData, b: FileData) => {
    switch (sortBy.value) {
      case "name":
        if (a.title && b.title) {
          return a.title.localeCompare(b.title);
        }
        break;
      case "date":
        if (a.last_viewed && b.last_viewed) {
          return new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime();
        }
        break;
      case "type":
        const aType = a.is_folder ? "folder" : a.file_type?.toLowerCase() || "unknown";
        const bType = b.is_folder ? "folder" : b.file_type?.toLowerCase() || "unknown";
        return aType.localeCompare(bType);
      case "size":
        const aSize =
          typeof a.file_size === "string" ? parseInt(a.file_size, 10) : a.file_size || 0;
        const bSize =
          typeof b.file_size === "string" ? parseInt(b.file_size, 10) : b.file_size || 0;
        return bSize - aSize;
      default:
        return 0;
    }
    return 0;
  };

  return [...folders.value, ...files.value].sort(sortFn);
});

const groupedItems = computed(() => {
  if (!groupByFileType.value) return { "All Items": sortedItems.value };

  const groups: Record<string, FileData[]> = {};

  sortedItems.value.forEach((item) => {
    let groupName: string;

    if (item.is_folder) {
      groupName = t('Commons.text.folders');
    } else {
      const fileType = item.file_type?.toLowerCase();
      switch (fileType) {
        case "docx":
        case "doc":
        case "pdf":
        case "txt":
        case "rtf":
          groupName = t('Commons.text.documents');
          break;
        case "xlsx":
        case "xls":
        case "csv":
        case "ods":
          groupName = t('Commons.text.spreadsheets');
          break;
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "bmp":
        case "svg":
        case "webp":
          groupName = "Images";
          break;
        case "mp4":
        case "avi":
        case "mkv":
        case "mov":
        case "wmv":
        case "flv":
          groupName = t('Commons.text.videos');
          break;
        case "mp3":
        case "wav":
        case "flac":
        case "aac":
        case "ogg":
          groupName = "Audio";
          break;
        default:
          groupName = t('Commons.text.other');
          break;
      }
    }

    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
  });

  return groups;
});

// Viewable files for media viewer
const viewableFiles = computed(() => {
  return sortedItems.value.filter(
    (file) => !file.is_folder && isViewableMedia(file.file_type)
  );
});

const {
  selectedFiles,
  isAllSelected,
  isSomeSelected,
  handleSelect,
  toggleSelectAll,
  clearSelection,
  setSelected,
  handleContextMenu: openContextMenu,
  contextMenuState,
  contextMenuActions,
  closeContextMenu,
} = useFileExplorer({
  getFiles: () => sortedItems.value,
  buildContextMenuActions,
});

async function openFile(id: string) {
  const fromActive = activeCollection.value.find((item) => item.id === id);
  const file = fromActive ?? fileStore.allFiles.find((item) => item.id === id);
  if (!file) return;

  if (file.is_folder) {
    await openFolder(id, file.title);
    return;
  }

  if (isViewableMedia(file.file_type)) {
    handlePreview(file);
    return;
  }

  switch (file.file_type?.toLowerCase()) {
    case "docx":
      router.push(`/docs/${id}`);
      break;
    case "xlsx":
      router.push(`/sheets/${id}`);
      break;
    default:
      router.push(`/files/${id}`);
      break;
  }
}

function handlePreview(file: FileData) {
  const index = viewableFiles.value.findIndex((f) => f.id === file.id);
  if (index !== -1) {
    currentViewFile.value = file;
    currentViewIndex.value = index;
    isViewerOpen.value = true;
  } else {
    console.log("File not found in viewable files:", file.title, file.file_type);
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
  if (file.file_url) {
    const link = document.createElement("a");
    link.href = file.file_url;
    link.download = file.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${file.title}`);
  }
}

async function createNewFolder() {
  const newFolderName = t('Commons.text.new_folder');
  try {
    const folder: FileData = {
      file_name: sluggify(newFolderName),
      title: newFolderName,
      is_folder: true,
      folder_id: currentFolderId.value,
      url: false,
      thumbnail_url: "",
      file_type: "folder",
      source: undefined,
      mime_type: undefined
    };
    const result = await fileStore.makeFolder(folder);
    await refresh();
    if (result && result.id) {
      setSelected([result.id]);
      await nextTick(() => {
        const fileItemElement = document.getElementById(`fileItem-${result.id}`);
        if (fileItemElement) {
          const renameEvent = new CustomEvent("start-rename");
          fileItemElement.dispatchEvent(renameEvent);
        }
      });
    }
  } catch (error) {
    console.error("Error creating folder:", error);
  }
}

function createNewFile(type: string, template?: string) {
  console.log("type", type);
  console.log("template", template);
  if (type === "spreadsheets") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/sheets/new");
    } else {
      router.push("/sheets/t/" + template);
    }
  } else if (type === "documents") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/docs/new");
    } else {
      router.push("/docs/t/" + template);
    }
  }
}

function openUploadDialog() {
  isUploadDialogOpen.value = true;
}

async function handleUploadComplete(files: any[]) {
  console.log("Upload completed:", files);

  const uploaded: FileData[] = Array.isArray(files)
    ? files.filter((f): f is FileData => !!f && typeof f === 'object')
    : [];

  const primary = uploaded.find((f) =>
    !!f.file_type && ['docx', 'xlsx'].includes(String(f.file_type).toLowerCase()),
  ) || uploaded[0];
  await refresh();
  isUploadDialogOpen.value = false;

  if (primary && primary.id) {
    try {
      await openFile(primary.id);
    } catch (e) {
      console.warn('Failed to auto-open uploaded file', e);
    }
  }
}

function formatGroupName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ");
}

function handleRename() {
  if (selectedFiles.value.size === 1) {
    const fileId = Array.from(selectedFiles.value)[0];
    const fileItemElement = document.getElementById(`fileItem-${fileId}`);
    if (fileItemElement) {
      const renameEvent = new CustomEvent("start-rename");
      fileItemElement.dispatchEvent(renameEvent);
    }
  }
}

const handleFileUpdated = (fileId: string) => {
  console.log("File updated:", fileId);
};

const handleFileDeleted = (fileId: string) => {
  if (selectedFiles.value.has(fileId)) {
    const newSelectedFiles = new Set(selectedFiles.value);
    newSelectedFiles.delete(fileId);
    setSelected(Array.from(newSelectedFiles));
  }
};

const handleFileContextMenu = (event: { id: string; x: number; y: number }) => {
  openContextMenu({
    id: event.id,
    x: event.x,
    y: event.y,
  });
};

async function handleBulkDelete() {
  try {
    const promises = Array.from(selectedFiles.value).map((id) =>
      fileStore.moveToTrash(id)
    );
    await Promise.all(promises);
    clearSelection();
    await refresh();
    toast.success(
      `Successfully deleted ${promises.length} item${promises.length > 1 ? "s" : ""}`
    );
  } catch (error) {
    console.error("Error deleting files:", error);
    toast.error("Failed to delete some items");
  }
}

function handleBulkDownload() {
  const filesToDownload = Array.from(selectedFiles.value)
    .map((id) => activeCollection.value.find((file) => file.id === id))
    .filter((file): file is FileData => Boolean(file && !file.is_folder));

  filesToDownload.forEach((file) => {
    if (file.file_url) {
      const link = document.createElement("a");
      link.href = file.file_url;
      link.download = file.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  });

  if (filesToDownload.length > 0) {
    toast.success(`Downloaded ${filesToDownload.length} file${filesToDownload.length !== 1 ? "s" : ""}`);
  }
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".file-item") && !target.closest(".context-menu")) {
    clearSelection();
  }
  if (!target.closest("#context-menu")) {
    closeContextMenu();
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (isViewerOpen.value) {
      closeViewer();
    } else {
      clearSelection();
    }
  } else if (event.key === "F2" && selectedFiles.value.size === 1) {
    event.preventDefault();
    handleRename();
  } else if (event.key === "Delete" && selectedFiles.value.size > 0) {
    handleBulkDelete();
  }
}
</script>

<template>
  <template v-if="isAuthenticated">
    <div class="flex h-screen text-gray-900 dark:text-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      <!-- Main content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Loading bar -->
        <div v-if="isLoading || fileStore.isSyncing || isImportingAttachment" class="loading-bar">
          <div class="loading-progress"></div>
        </div>

        <Dialog v-if="isAttachmentDialogOpen" :open="true">
          <DialogContent class="sm:max-w-md bg-white dark:bg-gray-900 border border-border/50">
            <DialogHeader>
              <DialogTitle class="text-lg font-semibold">
                {{
                  attachmentDialogError
                    ? $t('Views.Home.heading.attachment_import_failed')
                    : $t('Views.Home.heading.attachment_import_in_progress')
                }}
              </DialogTitle>
              <DialogDescription>
                <p class="text-sm" :class="attachmentDialogError ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'">
                  {{
                    attachmentDialogError
                      || attachmentDialogMessage
                      || $t('Views.Home.text.attachment_import_default_message')
                  }}
                </p>
              </DialogDescription>
            </DialogHeader>
            <div class="mt-2 space-y-3">
              <div v-if="!attachmentDialogError" class="flex items-center space-x-3">
                <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div class="h-1.5 w-1/2 bg-primary-500 animate-pulse"></div>
                </div>
              </div>
              <div v-else class="flex justify-end pt-2">
                <Button variant="outline" size="sm" @click="isAttachmentDialogOpen = false">
                  {{ $t('Commons.button.close') }}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <!-- File browser -->
        <div class="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
          <!-- Header with responsive layout -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <!-- Breadcrumbs and navigation -->
              <div class="flex items-center space-x-2">
                <!-- Up one level button -->
                <button
                  class="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canNavigateUp"
                  aria-label="Up one level"
                  title="Up one level"
                  @click="navigateUp">
                  <ArrowUp class="h-4 w-4 text-primary-600" />
                </button>
                <!-- Breadcrumbs -->
                <nav aria-label="Breadcrumb" class="hidden sm:flex items-center text-sm">
                  <template v-for="(crumb, idx) in breadcrumbs.slice(0, -1)" :key="crumb.id ?? 'root'">
                    <button class="text-primary-600 hover:underline" @click="navigateToBreadcrumb(idx)">
                      {{ crumb.title }}
                    </button>
                    <span v-if="idx < breadcrumbs.slice(0, -1).length - 1" class="mx-2 text-gray-400">/</span>
                  </template>
                </nav>
              </div>

              <h2 class="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                {{ showRecentFiles ? $t('Commons.heading.recent_files') : currentTitle }}
              </h2>

              <!-- Action buttons -->
              <div class="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  class="relative group rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0"
                  @click="createNewFolder">
                  <FolderPlusIcon class="h-5 w-5 text-primary-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="relative group rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0"
                  @click="openUploadDialog">
                  <Upload class="h-5 w-5 text-primary-600" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="relative group rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0">
                      <Plus class="h-5 w-5 text-primary-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent class="rounded-lg shadow-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-[calc(100vw-2rem)] sm:w-full max-w-lg sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        {{$t('Views.Home.heading.choose_a_template')}}
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs default-value="Documents">
                      <TabsList class="bg-gray-100 dark:bg-gray-700">
                        <TabsTrigger
                          v-for="category in Object.keys(templates)"
                          :key="category"
                          :value="category"
                          class="data-[state=active]:text-primary-600 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                          {{ category }}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent v-for="(items, category) in templates" :key="category" :value="category" class="p-2">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Button
                            v-for="template in items"
                            :key="template.name"
                            variant="outline"
                            class="h-24 flex flex-col items-center justify-center transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-400"
                            @click="createNewFile(category?.toLowerCase(), template.name)">
                            <component :is="template.icon" class="w-8 h-8 text-primary-600" />
                            <span class="mt-2 text-sm font-medium">
                              {{ template.name }}
                            </span>
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <!-- Right controls -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <template v-if="selectedFiles.size > 0">
                <!-- Selection info -->
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ selectedFiles.size }} selected
                  </span>
                </div>
                <div class="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                <!-- Selection actions -->
                <div class="flex items-center flex-wrap gap-2">
                  <Button
                    v-if="selectedFiles.size === 1"
                    variant="ghost"
                    size="sm"
                    class="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    @click="openFile(Array.from(selectedFiles)[0])">
                    <FolderOpen class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{$t('Commons.button.open')}}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    @click="handleBulkDelete">
                    <Trash2 class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{$t('Commons.button.delete')}}</span>
                  </Button>
                  <Button
                    v-if="selectedFiles.size === 1"
                    variant="ghost"
                    size="sm"
                    class="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    @click="handleRename">
                    <Edit class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{$t('Commons.button.rename')}}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    @click="handleBulkDownload">
                    <Download class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{$t('Commons.button.download')}}</span>
                  </Button>
                  <Button
                    v-if="selectedFiles.size === 1"
                    variant="ghost"
                    size="sm"
                    class="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <Share2 class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{$t('Commons.button.share')}}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    @click="clearSelection()">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-3 w-full sm:w-auto">
                  <!-- Items Count -->
                  <div v-if="sortedItems.length > 0" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{{ sortedItems.length }} items</span>
                    <template v-if="fileTypeStats.folderCount > 0">
                      <span>•</span>
                      <span>{{ fileTypeStats.folderCount }} folders</span>
                    </template>
                    <template v-if="Object.keys(fileTypeStats.fileTypes).length > 0">
                      <span>•</span>
                      <span>
                        {{ Object.values(fileTypeStats.fileTypes).reduce((a, b) => a + b, 0) }} files
                      </span>
                    </template>
                  </div>

                  <!-- Sort dropdown -->
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" class="flex-1 sm:flex-initial border-gray-300 dark:border-gray-600 dark:text-gray-100">
                        <span class="hidden sm:inline">Sort: </span>
                        {{ sortBy === "name" ? $t('Commons.button.name') : sortBy === "date" ? $t('Commons.button.date') : sortBy === "type" ? $t('Commons.button.type') : $t('Commons.button.size') }}
                        <ChevronDown class="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem @click="sortBy = 'name'">{{$t('Views.Home.text.sort_by_name')}}</DropdownMenuItem>
                      <DropdownMenuItem @click="sortBy = 'date'">{{$t('Views.Home.text.sort_by_date')}}</DropdownMenuItem>
                      <DropdownMenuItem @click="sortBy = 'type'">{{$t('Views.Home.text.sort_by_type')}}</DropdownMenuItem>
                      <DropdownMenuItem @click="sortBy = 'size'">{{$t('Views.Home.text.sort_by_size')}}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- Filter/Group dropdown -->
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" class="shrink-0 border-gray-300 dark:border-gray-600 dark:text-gray-100">
                        <Filter class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div class="px-2 py-1.5">
                        <div class="flex items-center justify-between space-x-2">
                          <span class="text-sm text-gray-600 dark:text-gray-300">{{$t('Views.Home.text.group_by_type')}}</span>
                          <Switch v-model="groupByFileType" />
                        </div>
                      </div>
                      <div class="px-2 py-1.5">
                        <div class="flex items-center justify-between space-x-2">
                          <span class="text-sm text-gray-600 dark:text-gray-300">{{$t('Commons.heading.recent_files')}}</span>
                          <Switch v-model="showRecentFiles" />
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- View Toggle -->
                  <div class="flex items-center rounded-lg p-1 shrink-0 bg-gray-100 dark:bg-gray-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      :class="['px-2 py-2', viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : '']"
                      @click="viewMode = 'grid'"
                      title="Grid View">
                      <Grid class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      :class="['px-2 py-2', viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : '']"
                      @click="viewMode = 'list'"
                      title="List View">
                      <List class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      :class="['px-2 py-2', viewMode === 'thumbnail' ? 'bg-white dark:bg-gray-700 shadow-sm' : '']"
                      @click="viewMode = 'thumbnail'"
                      title="Thumbnail View">
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <ScrollArea class="flex-1 min-h-0 rounded-lg shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div v-if="Object.keys(groupedItems).length > 0 && sortedItems.length > 0">
              <template v-for="(items, groupName) in groupedItems" :key="groupName">
                <div class="p-2 sm:p-4">
                  <!-- Group header with Select All -->
                  <div class="flex items-center justify-between mb-3 px-2">
                    <h3 v-if="groupByFileType" class="text-base font-semibold text-gray-700 dark:text-gray-100">
                      {{ formatGroupName(groupName) }}
                    </h3>

                    <!-- Select All controls -->
                    <div v-if="sortedItems.length > 0" class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :id="`select-all-${groupName}`"
                        :checked="isAllSelected"
                        :indeterminate="isSomeSelected"
                        @change="toggleSelectAll"
                        class="rounded border text-primary-600 focus:ring-primary-500 focus:ring-offset-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-offset-white dark:focus:ring-offset-gray-800" />
                      <label
                        :for="`select-all-${groupName}`"
                        class="text-sm font-medium cursor-pointer select-none text-gray-700 dark:text-gray-300">
                        {{$t('Commons.label.select_all')}}
                      </label>
                    </div>
                  </div>

                  <!-- Items -->
                  <div v-if="items.length === 0" class="text-center text-sm py-4 text-gray-500 dark:text-gray-400">
                    {{$t('Views.Home.text.no_items_available_in')}}
                  </div>
                  <div
                    v-else
                    :class="{
                      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4': viewMode === 'grid',
                      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2': viewMode === 'thumbnail',
                      'space-y-1': viewMode === 'list',
                    }">
                    <FileItem
                      v-for="item in items"
                      :key="item.id"
                      :file="item"
                      :view-mode="viewMode"
                      :is-selected="!!(item.id && selectedFiles.has(item.id))"
                      @select-file="handleSelect"
                      @open-file="openFile"
                      @update-file="handleFileUpdated"
                      @delete-file="handleFileDeleted"
                      @contextmenu-file="handleFileContextMenu" />
                  </div>
                </div>
              </template>
            </div>
            <template v-else-if="isLoading">
              <div class="loading-state">
                <div class="flex flex-col items-center justify-center py-16 px-6">
                  <div class="loading-spinner"></div>
                  <p class="loading-text">Loading your files...</p>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- Empty state -->
              <div class="flex flex-col items-center justify-center py-16 px-6">
                <div class="flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-gray-100 dark:bg-gray-700">
                  <FolderOpen class="h-8 w-8 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 class="text-xl font-semibold mb-2 text-center text-gray-800 dark:text-gray-100">
                  {{ searchValue ? $t('Views.Home.heading.no_matching_files_found') : $t('Views.Home.heading.no_files_found') }}
                </h3>
                <p class="text-center mb-8 max-w-md text-gray-600 dark:text-gray-400">
                  {{ searchValue ? $t('Views.Home.text.try_adjusting_your_search') : $t('Views.Home.text.get_started_by_creating') }}
                </p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button @click="createNewFile('documents')" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2">
                    <Plus class="mr-2 h-4 w-4" />
                    {{$t('Commons.button.new_document')}}
                  </Button>
                  <Button @click="createNewFile('spreadsheets')" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
                    <Plus class="mr-2 h-4 w-4" />
                    {{$t('Commons.button.new_spreadsheet')}}
                  </Button>
                  <Button variant="outline" class="px-6 py-2 border-gray-300 dark:border-gray-600 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700" @click="openUploadDialog">
                    <Upload class="mr-2 h-4 w-4" />
                    {{$t('Commons.button.upload_file')}}
                  </Button>
                </div>
              </div>
            </template>
          </ScrollArea>
        </div>
      </div>

      <!-- Context Menu and Dialogs -->
      <FileContextMenu
        v-if="contextMenuState.visible"
        :state="contextMenuState"
        :actions="contextMenuActions" />

      <MediaViewer
        :is-open="isViewerOpen"
        :current-file="currentViewFile"
        :files="viewableFiles"
        :current-index="currentViewIndex"
        @close="closeViewer"
        @download="handleViewerDownload"
        @navigate="handleViewerNavigate" />

      <FileUploader
        v-if="isUploadDialogOpen"
        @close="isUploadDialogOpen = false"
        @upload="handleUploadComplete"
        :folderId="currentFolderId"
        :fileTypeFilter="'all'" />
    </div>
  </template>

  <!-- Login screen -->
  <template v-else>
    <div class="h-screen w-full flex items-center justify-center">
      <div class="backdrop-filter backdrop-blur-lg p-10 rounded-lg shadow-xl border max-w-md w-full mx-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <img src="/logo-black.png" alt="VenMail Logo" class="h-6 w-full dark:hidden" />
        <img src="/logo-white.png" alt="VenMail Logo" class="h-6 w-full hidden dark:block" />
        <h2 class="text-gray-800 dark:text-gray-100">{{$t('Views.Home.heading.welcome_to_venmail_file')}}</h2>
        <Button class="w-full bg-primary-600 hover:bg-primary-700" @click="loginWithVenmail">
          {{$t('Views.Home.button.login_with_venmail')}}
        </Button>
        <p class="text-sm mt-4 text-center text-gray-500 dark:text-gray-400">
          {{$t('Views.Home.text.login_to_manage_your')}}
        </p>
      </div>
    </div>
  </template>
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
  background-color: rgb(37 99 235);
  width: 30%;
  animation: loading 2s infinite ease-in-out;
}

.dark .loading-progress {
  background-color: rgb(59 130 246);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.dark .loading-spinner {
  border-color: #374151;
  border-top-color: #60a5fa;
}

.loading-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.dark .loading-text {
  color: #9ca3af;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(300%);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
