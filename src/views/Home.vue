<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  nextTick,
  onUnmounted,
  watchEffect,
  inject,
} from "vue";
import { useRouter, useRoute } from "vue-router";
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

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const fileStore = useFileStore();
const { isAuthenticated } = storeToRefs(authStore);
const theme = inject("theme") as { isDark: { value: boolean } };

const viewMode = ref<"grid" | "list" | "thumbnail">("grid");
const showRecentFiles = ref(false);
const sortBy = ref("name");
const groupByFileType = ref(false);
const currentFolderId = ref<string | null>(null);
const currentFolderTitle = ref<string>("");
const breadcrumbs = ref<Array<{ id: string | null; title: string }>>([
  { id: null, title: "All Files" },
]);
const searchValue = ref("");
const isUploadDialogOpen = ref(false);

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
    if (route.params.id) {
      console.log("importing..", route.params.id);
      const attachId = route.params?.id as string;
      const doc = await fileStore.importAttachment(attachId);
      if (doc) {
        toast.info(doc.file_name + " imported successfully");
      }
      router.replace("/");
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

  document.title = "Home";
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEscapeKey);
});

const selectedFilesList = computed(() => {
  const uniqueFiles = new Map<string, FileData>();
  const sourceFiles = showRecentFiles.value ? fileStore.recentFiles : fileStore.allFiles;

  sourceFiles.forEach((file) => {
    if (file.id && !uniqueFiles.has(file.id)) {
      uniqueFiles.set(file.id, file);
    }
  });

  return Array.from(uniqueFiles.values()).filter((file) => {
    const folderMatch = currentFolderId.value
      ? file.folder_id === currentFolderId.value
      : !file.folder_id;

    const searchMatch =
      !searchValue.value ||
      file.title?.toLowerCase().includes(searchValue.value.toLowerCase()) ||
      file.file_name?.toLowerCase().includes(searchValue.value.toLowerCase());

    return folderMatch && searchMatch;
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
      groupName = "Folders";
    } else {
      const fileType = item.file_type?.toLowerCase();
      switch (fileType) {
        case "docx":
        case "doc":
        case "pdf":
        case "txt":
        case "rtf":
          groupName = "Documents";
          break;
        case "xlsx":
        case "xls":
        case "csv":
        case "ods":
          groupName = "Spreadsheets";
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
          groupName = "Videos";
          break;
        case "mp3":
        case "wav":
        case "flac":
        case "aac":
        case "ogg":
          groupName = "Audio";
          break;
        default:
          groupName = "Other";
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

async function openFolder(id: string) {
  try {
    const docs = await fileStore.fetchFiles(id);
    fileStore.allFiles = docs;
    currentFolderId.value = id;
    const existing = fileStore.allFiles.find((f) => f.id === id && f.is_folder);
    if (existing && existing.title) {
      currentFolderTitle.value = existing.title;
    } else {
      try {
        const folderDoc = await fileStore.loadFromAPI(id);
        currentFolderTitle.value =
          folderDoc?.title || currentFolderTitle.value || "Folder";
      } catch { }
    }
    const last = breadcrumbs.value[breadcrumbs.value.length - 1];
    if (!last || last.id !== id) {
      breadcrumbs.value.push({ id, title: currentFolderTitle.value || "Folder" });
    }
  } catch (error) {
    console.error("Error opening folder:", error);
  }
}

function openFile(id: string) {
  const file = fileStore.allFiles.find((f) => f.id === id);
  if (file) {
    if (file.is_folder) {
      openFolder(id);
    } else if (isViewableMedia(file.file_type)) {
      // Open media viewer instead of navigating
      handlePreview(file);
    } else {
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
  const newFolderName = "New Folder";
  try {
    const folder: FileData = {
      file_name: sluggify(newFolderName),
      title: newFolderName,
      is_folder: true,
      folder_id: currentFolderId.value,
      url: false,
      thumbnail_url: "",
      file_type: "folder",
    };
    const result = await fileStore.makeFolder(folder);
    if (result && result.id) {
      setSelected([result.id]);
      nextTick(() => {
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
  toast.success(
    `Successfully uploaded ${files.length} file${files.length !== 1 ? "s" : ""}`
  );
  try {
    if (currentFolderId.value) {
      const docs = await fileStore.fetchFiles(currentFolderId.value);
      fileStore.allFiles = docs;
    } else {
      await fileStore.loadDocuments();
    }
  } catch (e) {
    console.warn("Failed to refresh after upload", e);
  }
  isUploadDialogOpen.value = false;
}

function navigateToBreadcrumb(index: number) {
  const target = breadcrumbs.value[index];
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  if (!target.id) {
    currentFolderId.value = null;
    currentFolderTitle.value = "";
    fileStore.loadDocuments().then((docs) => {
      fileStore.allFiles = docs;
    });
  } else {
    openFolder(target.id);
  }
}

function goUpOneLevel() {
  if (breadcrumbs.value.length > 1) {
    navigateToBreadcrumb(breadcrumbs.value.length - 2);
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
  // Handle file update if needed
  console.log("File updated:", fileId);
};

const handleFileDeleted = (fileId: string) => {
  // Remove the deleted file from selected files
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
    .map((id) => fileStore.allFiles.find((f) => f.id === id))
    .filter((f) => f && !f.is_folder);

  console.log("Downloading files:", filesToDownload);
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
    <div
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
        <div v-if="fileStore.isSyncing" class="loading-bar">
          <div class="loading-progress"></div>
        </div>

        <!-- File browser -->
        <div class="flex-1 p-4 sm:p-6 overflow-hidden">
          <!-- Header with responsive layout -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <!-- Breadcrumbs and navigation -->
              <div class="flex items-center space-x-2">
                <!-- Up one level button -->
                <button
                  class="inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors shrink-0"
                  :class="[
                    theme.isDark.value
                      ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                      : 'bg-white border-gray-200 hover:bg-gray-100',
                    breadcrumbs.length > 1
                      ? 'opacity-100'
                      : 'opacity-50 cursor-not-allowed',
                  ]" :disabled="breadcrumbs.length <= 1" aria-label="Up one level" title="Up one level"
                  @click="goUpOneLevel">
                  <ArrowUp class="h-4 w-4 text-primary-600" />
                </button>
                <!-- Breadcrumbs - hide on very small screens -->
                <nav aria-label="Breadcrumb" class="hidden sm:flex items-center text-sm">
                  <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.id ?? 'root'">
                    <button class="text-primary-600 hover:underline" @click="navigateToBreadcrumb(idx)">
                      {{ crumb.title }}
                    </button>
                    <span v-if="idx < breadcrumbs.length - 1" class="mx-2 text-gray-400">/</span>
                  </template>
                </nav>
              </div>

              <h2 :class="[
                'text-xl sm:text-2xl font-semibold',
                theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
              ]">
                {{ showRecentFiles ? "Recent Files" : "All Files" }}
              </h2>

              <!-- Action buttons -->
              <div class="flex items-center space-x-2">
                <Button variant="ghost" size="icon" :class="[
                  'relative group rounded-full transition-all duration-200 shrink-0',
                  theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
                ]" @click="createNewFolder">
                  <FolderPlusIcon class="h-5 w-5 text-primary-600" />
                </Button>
                <Button variant="ghost" size="icon" :class="[
                  'relative group rounded-full transition-all duration-200 shrink-0',
                  theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
                ]" @click="openUploadDialog">
                  <Upload class="h-5 w-5 text-primary-600" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" :class="[
                      'relative group rounded-full transition-all duration-200 shrink-0',
                      theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
                    ]">
                      <Plus class="h-5 w-5 text-primary-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent :class="[
                    'rounded-lg shadow-2xl border',
                    theme.isDark.value
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200',
                  ]">
                    <DialogHeader>
                      <DialogTitle :class="[
                        'text-xl font-semibold',
                        theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
                      ]">
                        Choose a Template
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs default-value="Documents">
                      <TabsList :class="[theme.isDark.value ? 'bg-gray-700' : 'bg-gray-100']">
                        <TabsTrigger v-for="category in Object.keys(templates)" :key="category" :value="category"
                          :class="[
                            'data-[state=active]:text-primary-600',
                            theme.isDark.value
                              ? 'data-[state=active]:bg-gray-800'
                              : 'data-[state=active]:bg-white',
                          ]">
                          {{ category }}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent v-for="(items, category) in templates" :key="category" :value="category" class="p-2">
                        <div class="grid grid-cols-2 gap-4">
                          <Button v-for="template in items" :key="template.name" variant="outline" :class="[
                            'h-24 flex flex-col items-center justify-center transition-all',
                            theme.isDark.value
                              ? 'hover:bg-gray-700 hover:border-primary-400'
                              : 'hover:bg-gray-50 hover:border-primary-400',
                          ]" @click="createNewFile(category?.toLowerCase(), template.name)">
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

            <!-- Right controls with responsive layout -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <template v-if="selectedFiles.size > 0">
                <!-- Selection info -->
                <div class="flex items-center space-x-2">
                  <span :class="[
                    'text-sm font-medium',
                    theme.isDark.value ? 'text-gray-300' : 'text-gray-700',
                  ]">
                    {{ selectedFiles.size }} selected
                  </span>
                </div>
                <div :class="[
                  'h-4 w-px',
                  theme.isDark.value ? 'bg-gray-600' : 'bg-gray-300',
                ]"></div>
                <!-- Selection actions with responsive wrapping -->
                <div class="flex items-center flex-wrap gap-2">
                  <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm"
                    @click="openFile(Array.from(selectedFiles)[0])">
                    <FolderOpen class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">Open</span>
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleBulkDelete">
                    <Trash2 class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">Delete</span>
                  </Button>
                  <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm" @click="handleRename">
                    <Edit class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">Rename</span>
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleBulkDownload">
                    <Download class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">Download</span>
                  </Button>
                  <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm">
                    <Share2 class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">Share</span>
                  </Button>
                  <Button variant="ghost" size="sm" @click="clearSelection()">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-3 w-full sm:w-auto">
                  <!-- Items Count - minimalist design -->
                  <div v-if="sortedItems.length > 0" :class="[
                    'flex items-center gap-2 text-sm',
                    theme.isDark.value ? 'text-gray-400' : 'text-gray-600',
                  ]">
                    <span>{{ sortedItems.length }} items</span>
                    <template v-if="fileTypeStats.folderCount > 0">
                      <span>•</span>
                      <span>{{ fileTypeStats.folderCount }} folders</span>
                    </template>
                    <template v-if="Object.keys(fileTypeStats.fileTypes).length > 0">
                      <span>•</span>
                      <span>
                        {{
                          Object.values(fileTypeStats.fileTypes).reduce((a, b) => a + b, 0)
                        }}
                        files
                      </span>
                    </template>
                  </div>

                  <!-- Sort dropdown -->
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" :class="[
                        'flex-1 sm:flex-initial',
                        theme.isDark.value
                          ? 'border-gray-600 text-gray-100'
                          : 'border-gray-300',
                      ]">
                        <span class="hidden sm:inline">Sort: </span>
                        {{
                          sortBy === "name"
                            ? "Name"
                            : sortBy === "date"
                              ? "Date"
                              : sortBy === "type"
                                ? "Type"
                                : "Size"
                        }}
                        <ChevronDown class="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem @click="sortBy = 'name'">
                        Sort by Name
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="sortBy = 'date'">
                        Sort by Date
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="sortBy = 'type'">
                        Sort by Type
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="sortBy = 'size'">
                        Sort by Size
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- Filter/Group dropdown -->
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" :class="[
                        'shrink-0',
                        theme.isDark.value
                          ? 'border-gray-600 text-gray-100'
                          : 'border-gray-300',
                      ]">
                        <Filter class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div class="px-2 py-1.5">
                        <div class="flex items-center justify-between space-x-2">
                          <span :class="[
                            'text-sm',
                            theme.isDark.value ? 'text-gray-300' : 'text-gray-600',
                          ]">
                            Group by Type
                          </span>
                          <Switch v-model="groupByFileType" />
                        </div>
                      </div>
                      <div class="px-2 py-1.5">
                        <div class="flex items-center justify-between space-x-2">
                          <span :class="[
                            'text-sm',
                            theme.isDark.value ? 'text-gray-300' : 'text-gray-600',
                          ]">
                            Recent Files
                          </span>
                          <Switch v-model="showRecentFiles" />
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- Inline View Toggle (matching other components) -->
                  <div :class="[
                    'flex items-center rounded-lg p-1 shrink-0',
                    theme.isDark.value ? 'bg-gray-800' : 'bg-gray-100',
                  ]">
                    <Button variant="ghost" size="sm" :class="[
                      'px-2 py-2',
                      viewMode === 'grid'
                        ? theme.isDark.value
                          ? 'bg-gray-700 shadow-sm'
                          : 'bg-white shadow-sm'
                        : '',
                    ]" @click="viewMode = 'grid'" title="Grid View">
                      <Grid class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" :class="[
                      'px-2 py-2',
                      viewMode === 'list'
                        ? theme.isDark.value
                          ? 'bg-gray-700 shadow-sm'
                          : 'bg-white shadow-sm'
                        : '',
                    ]" @click="viewMode = 'list'" title="List View">
                      <List class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" :class="[
                      'px-2 py-2',
                      viewMode === 'thumbnail'
                        ? theme.isDark.value
                          ? 'bg-gray-700 shadow-sm'
                          : 'bg-white shadow-sm'
                        : '',
                    ]" @click="viewMode = 'thumbnail'" title="Thumbnail View">
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
          <ScrollArea :class="[
            'h-[calc(100vh-240px)] sm:h-[calc(100vh-280px)] rounded-lg shadow-sm border',
            theme.isDark.value ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
          ]">
            <div v-if="Object.keys(groupedItems).length > 0 && sortedItems.length > 0">
              <template v-for="(items, groupName) in groupedItems" :key="groupName">
                <div class="p-2 sm:p-4">
                  <!-- Group header with Select All for all view modes -->
                  <div class="flex items-center justify-between mb-3 px-2">
                    <h3 v-if="groupByFileType" :class="[
                      'text-base font-semibold',
                      theme.isDark.value ? 'text-gray-100' : 'text-gray-700',
                    ]">
                      {{ formatGroupName(groupName) }}
                    </h3>

                    <!-- Select All controls -->
                    <div v-if="sortedItems.length > 0" class="flex items-center gap-2">
                      <input type="checkbox" :id="`select-all-${groupName}`" :checked="isAllSelected"
                        :indeterminate="isSomeSelected" @change="toggleSelectAll" :class="[
                          'rounded border text-primary-600 focus:ring-primary-500 focus:ring-offset-0',
                          theme.isDark.value
                            ? 'border-gray-600 bg-gray-700 focus:ring-offset-gray-800'
                            : 'border-gray-300 bg-white focus:ring-offset-white',
                        ]" />
                      <label :for="`select-all-${groupName}`" :class="[
                        'text-sm font-medium cursor-pointer select-none',
                        theme.isDark.value ? 'text-gray-300' : 'text-gray-700',
                      ]">
                        Select All
                      </label>
                    </div>
                  </div>

                  <!-- Items -->
                  <div v-if="items.length === 0" :class="[
                    'text-center text-sm py-4',
                    theme.isDark.value ? 'text-gray-400' : 'text-gray-500',
                  ]">
                    No items available in this category.
                  </div>
                  <div v-else :class="{
                    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4':
                      viewMode === 'grid',
                    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2':
                      viewMode === 'thumbnail',
                    'space-y-1': viewMode === 'list',
                  }">
                    <FileItem v-for="item in items" :key="item.id" :file="item" :view-mode="viewMode"
                      :is-selected="!!(item.id && selectedFiles.has(item.id))" @select-file="handleSelect"
                      @open-file="openFile" @update-file="handleFileUpdated" @delete-file="handleFileDeleted"
                      @contextmenu-file="handleFileContextMenu" />
                  </div>
                </div>
              </template>
            </div>
            <template v-else-if="fileStore.isSyncing">
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
                <div :class="[
                  'flex items-center justify-center w-16 h-16 rounded-full mb-6',
                  theme.isDark.value ? 'bg-gray-700' : 'bg-gray-100',
                ]">
                  <FolderOpen :class="[
                    'h-8 w-8',
                    theme.isDark.value ? 'text-gray-400' : 'text-gray-500',
                  ]" />
                </div>
                <h3 :class="[
                  'text-xl font-semibold mb-2 text-center',
                  theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
                ]">
                  {{ searchValue ? "No matching files found" : "No files found" }}
                </h3>
                <p :class="[
                  'text-center mb-8 max-w-md',
                  theme.isDark.value ? 'text-gray-400' : 'text-gray-600',
                ]">
                  {{
                    searchValue
                      ? "Try adjusting your search or filters."
                      : "Get started by creating a new file or uploading an existing one."
                  }}
                </p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button @click="createNewFile('documents')"
                    class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2">
                    <Plus class="mr-2 h-4 w-4" />
                    New Document
                  </Button>
                  <Button @click="createNewFile('spreadsheets')"
                    class="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
                    <Plus class="mr-2 h-4 w-4" />
                    New Spreadsheet
                  </Button>
                  <Button variant="outline" :class="[
                    'px-6 py-2',
                    theme.isDark.value
                      ? 'border-gray-600 text-gray-100 hover:bg-gray-700'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
                  ]" @click="openUploadDialog">
                    <Upload class="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </div>
              </div>
            </template>
          </ScrollArea>
        </div>
      </div>

      <!-- Context Menu and Dialogs -->
      <FileContextMenu v-if="contextMenuState.visible" :state="contextMenuState" :actions="contextMenuActions"
        :is-dark="theme.isDark.value" />

      <MediaViewer :is-open="isViewerOpen" :current-file="currentViewFile" :files="viewableFiles"
        :current-index="currentViewIndex" @close="closeViewer" @download="handleViewerDownload"
        @navigate="handleViewerNavigate" />

      <FileUploader v-if="isUploadDialogOpen" @close="isUploadDialogOpen = false" @upload="handleUploadComplete"
        :folderId="currentFolderId" :fileTypeFilter="'all'" />
    </div>
  </template>

  <!-- Login screen -->
  <template v-else>
    <div class="h-screen w-full flex items-center justify-center">
      <div :class="[
        'backdrop-filter backdrop-blur-lg p-10 rounded-lg shadow-xl border max-w-md w-full mx-4',
        theme.isDark.value ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
      ]">
        <img :src="theme.isDark.value ? '/logo-white.png' : '/logo-black.png'" alt="VenMail Logo" class="h-6 w-full" />
        <h2 :class="[theme.isDark.value ? 'text-gray-100' : 'text-gray-800']">
          Welcome to Venmail File Manager
        </h2>
        <Button class="w-full bg-primary-600 hover:bg-primary-700" @click="loginWithVenmail">
          Login with Venmail
        </Button>
        <p :class="[
          'text-sm mt-4 text-center',
          theme.isDark.value ? 'text-gray-400' : 'text-gray-500',
        ]">
          Login to manage your files and folders on Venmail.
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
