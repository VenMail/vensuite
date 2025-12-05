<template>
  <div
    :class="[
      'h-screen text-gray-900 transition-colors duration-200',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800'
    ]"
  >
    <!-- Loading bar -->
    <div v-if="fileStore.isSyncing" class="loading-bar">
      <div class="loading-progress"></div>
    </div>

    <!-- File browser -->
    <div class="flex-1 flex flex-col gap-6 p-6 overflow-hidden">
      <WorkspaceTopBar
        :title="currentTitle"
        :subtitle="documentsSubtitle"
        :breadcrumbs="breadcrumbs"
        :can-navigate-up="canNavigateUp"
        :actions="topBarActions"
        @navigate-up="handleNavigateUp"
        @navigate-breadcrumb="handleBreadcrumbNavigate"
      >
        <template #stats>
          <div
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
          >
            <span>{{ sortedDocuments.length }} items</span>
            <span v-if="selectedFiles.size > 0">• {{ selectedFiles.size }} selected</span>
          </div>
        </template>

        <template #extra>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  class="border-gray-300 dark:border-gray-600 dark:text-gray-100"
                >
                  <ArrowUpDown class="h-4 w-4 mr-2" />
                  Sort: {{ sortLabel }}
                  <ChevronDown class="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  v-for="option in sortOptions"
                  :key="option.value"
                  @click="handleSort(option.value)"
                >
                  <Check v-if="sortBy === option.value" class="mr-2 h-4 w-4" />
                  <span>{{ option.label }}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  class="border-gray-300 dark:border-gray-600 dark:text-gray-100"
                >
                  <Filter class="h-4 w-4 mr-2" />
                  {{ activeFilterLabel }}
                  <ChevronDown class="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  v-for="filter in filterOptions"
                  :key="filter.value"
                  @click="handleFilter(filter.value)"
                >
                  <Check v-if="currentFilter === filter.value" class="mr-2 h-4 w-4" />
                  <span>{{ filter.label }}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                v-for="option in viewControls"
                :key="option.value"
                variant="ghost"
                size="sm"
                :class="option.active ? 'bg-white dark:bg-gray-700 shadow-sm' : ''"
                @click="handleViewChange(option.value)"
              >
                <component v-if="option.icon" :is="option.icon" class="h-4 w-4" />
                <span v-else>{{ option.label }}</span>
              </Button>
            </div>
          </div>
        </template>

        <template #action-new-document>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                :class="actionIconClass"
              >
                <Plus class="h-5 w-5 text-primary-600" />
              </Button>
            </DialogTrigger>
            <DialogContent
              :class="[
                'rounded-lg shadow-2xl border',
                'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              ]"
            >
              <DialogHeader>
                <DialogTitle
                  :class="[
                    'text-xl font-semibold text-gray-800 dark:text-gray-100',
                  ]"
                >
                  {{$t('Views.Documents.heading.create_new_document')}}
                </DialogTitle>
              </DialogHeader>
              <div class="grid grid-cols-2 gap-4 p-2">
                <Button
                  v-for="template in documentTemplates"
                  :key="template.name"
                  variant="outline"
                  :class="[
                    'h-24 flex flex-col items-center justify-center transition-all',
                    'hover:bg-gray-50 hover:border-primary-400 dark:hover:bg-gray-700 dark:hover:border-primary-400',
                  ]"
                  @click="createNewDocument(template.name)"
                >
                  <component :is="template.icon" class="w-8 h-8 text-primary-600" />
                  <span class="mt-2 text-sm font-medium text-gray-800 dark:text-gray-100">{{ template.name }}</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </template>
      </WorkspaceTopBar>

      <!-- Content area -->
      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg shadow-sm border',
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        ]"
      >
        <div v-if="sortedDocuments.length > 0">
          <!-- Select All header for list view -->
          <div
            v-if="viewMode === 'list'"
            :class="[
              'flex items-center gap-3 px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700',
            ]"
          >
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @change="toggleSelectAll"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span
              :class="[
                'text-sm font-medium text-gray-800 dark:text-gray-100',
              ]"
            >
              {{ isAllSelected ? $t('Commons.text.deselect_all') : $t('Commons.label.select_all') }}
            </span>
          </div>

          <!-- Select All button for grid view -->
          <div
            v-else-if="viewMode === 'grid'"
            :class="[
              'flex items-center justify-between px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700',
            ]"
          >
            <Button
              variant="ghost"
              size="sm"
              @click="toggleSelectAll"
              :class="[
                'flex items-center gap-2',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
              ]"
            >
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isSomeSelected"
                @click.stop
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
              />
              <span
                :class="[
                  'text-sm font-medium text-gray-800 dark:text-gray-100',
                ]"
              >
                {{ isAllSelected ? $t('Commons.text.deselect_all') : $t('Commons.label.select_all') }}
              </span>
            </Button>

            <!-- Optional: Show count of total files -->
            <span
              :class="['text-xs', 'text-gray-500 dark:text-gray-400']"
            >
              {{ sortedDocuments.length }} document{{
                sortedDocuments.length !== 1 ? "s" : ""
              }}
            </span>
          </div>

          <div class="p-4">
            <div
              :class="{
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4':
                  viewMode === 'grid',
                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2':
                  viewMode === 'thumbnail',
                'space-y-1': viewMode === 'list',
              }"
            >
              <FileItem
                v-for="item in sortedDocuments"
                :key="item.id"
                :file="item"
                :viewMode="viewMode"
                :isSelected="selectedFiles.has(item.id || '')"
                @select-file="handleSelect"
                @open-file="openFile"
                @contextmenu-file="(event) => openContextMenu(event)"
              />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-icon-wrapper">
            <FolderOpen class="empty-icon" />
          </div>
          <h3 class="empty-title">{{$t('Views.Documents.heading.no_documents_found')}}</h3>
          <p class="empty-description">
            {{$t('Views.Documents.text.get_started_by_creating')}}
          </p>
          <div class="empty-actions">
            <Button
              @click="createNewDocument('Blank Document')"
              class="bg-primary-600 hover:bg-primary-700"
            >
              <Plus class="mr-2 h-4 w-4" />
              {{$t('Commons.button.new_document')}}
            </Button>
            <Button
              variant="outline"
              class="border-gray-300 hover:border-gray-400"
              @click="openUploadDialog"
            >
              <Upload class="mr-2 h-4 w-4" />
              {{$t('Commons.button.upload_document')}}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>

  <FileUploader
    v-if="isUploadDialogOpen"
    :file-type-filter="'documents'"
    :folder-id="currentFolderId"
    @close="isUploadDialogOpen = false"
    @upload="handleUploadComplete"
  />

  <FileContextMenu
    v-if="contextMenuState.visible"
    :state="contextMenuState"
    :actions="contextMenuActions"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useExplorerNavigation } from "@/composables/useExplorerNavigation";
import {
  ArrowUpDown,
  Grid,
  List,
  LayoutGrid,
  Plus,
  ChevronDown,
  FolderOpen,
  Upload,
  FolderPlus as FolderPlusIcon,
  Trash2,
  Edit,
  Download,
  Share2,
  Filter,
  Check,
  FileText,
  FileIcon,
  X,
} from "lucide-vue-next";
import { useFileStore } from "@/store/files";
import Button from "@/components/ui/button/Button.vue";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import FileItem from "@/components/FileItem.vue";
import { toast } from "@/composables/useToast";
import FileUploader from "@/components/FileUploader.vue";
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import {
  useFileExplorer,
  type ContextMenuAction,
  type ContextMenuBuilderContext,
} from "@/composables/useFileExplorer";
import FileContextMenu from "@/components/FileContextMenu.vue";
import WorkspaceTopBar from "@/components/layout/WorkspaceTopBar.vue";
import type { FileData } from "@/types";

const router = useRouter();
const fileStore = useFileStore();

type DocumentViewMode = "grid" | "list" | "thumbnail";
type DocumentSort = "name" | "date";
type DocumentFilter = "all" | "word" | "pdf" | "text" | "other";

type SortOption = {
  value: DocumentSort;
  label: string;
};

type FilterOption = {
  key: string;
  label: string;
  value: DocumentFilter;
  icon: any;
  active: boolean;
};

type ViewModeOption = {
  value: DocumentViewMode;
  icon?: any;
  label: string;
  active: boolean;
};

const viewMode = ref<DocumentViewMode>("grid");
const sortBy = ref<DocumentSort>("date");
const isUploadDialogOpen = ref(false);
const searchQuery = ref("");
const currentFilter = ref<DocumentFilter>("all");

// Initialize explorer navigation
const {
  currentFolderId,
  breadcrumbs,
  currentTitle,
  canNavigateUp,
  openFolder,
  navigateToBreadcrumb,
  navigateUp,
  refresh,
  initialize,
} = useExplorerNavigation({
  rootTitle: 'Documents',
  onNavigate: () => clearSelection(),
});

const documentsSubtitle = computed(() => {
  switch (currentFilter.value) {
    case "word":
      return "Word documents";
    case "pdf":
      return "PDF files";
    case "text":
      return "Text documents";
    case "other":
      return "Other documents";
    default:
      return "All documents";
  }
});

const documentTypeGroups: Record<Exclude<DocumentFilter, "all">, string[]> = {
  word: ["doc", "docx", "odt", "rtf"],
  pdf: ["pdf"],
  text: ["txt", "md", "markdown"],
  other: ["csv", "ppt", "pptx"],
};

const allDocumentTypes = computed(() => {
  const types = new Set<string>();
  Object.values(documentTypeGroups).forEach(group => group.forEach(type => types.add(type)));
  return Array.from(types);
});

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

const {
  selectedFiles,
  isAllSelected,
  isSomeSelected,
  handleSelect,
  toggleSelectAll,
  clearSelection,
  handleContextMenu: openContextMenu,
  contextMenuState,
  contextMenuActions,
  closeContextMenu,
} = useFileExplorer({
  getFiles: () => sortedDocuments.value,
  buildContextMenuActions,
});

const documentTemplates = [
  { name: "Blank Document", icon: defaultIcons.IconMicrosoftWord },
  { name: "Resume", icon: defaultIcons.IconMicrosoftWord },
  { name: "Letter", icon: defaultIcons.IconMicrosoftWord },
];

// Remove folder items - Documents view should only show document files
const folderItems = computed(() => []);

const documentFiles = computed(() => {
  return fileStore.allFiles.filter((file) => {
    if (file.is_folder) return false;
    const type = file.file_type?.toLowerCase();
    if (!type) return false;
    return allDocumentTypes.value.includes(type);
  });
});

const getDocumentCategory = (fileType?: string | null): DocumentFilter => {
  const type = fileType?.toLowerCase();
  if (!type) return "other";
  if (documentTypeGroups.word.includes(type)) return "word";
  if (documentTypeGroups.pdf.includes(type)) return "pdf";
  if (documentTypeGroups.text.includes(type)) return "text";
  return "other";
};

const filteredDocuments = computed(() => {
  let docs = [...documentFiles.value];

  if (currentFilter.value !== "all") {
    docs = docs.filter(file => getDocumentCategory(file.file_type) === currentFilter.value);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    docs = docs.filter(file => {
      const title = file.title?.toLowerCase() || "";
      const name = file.file_name?.toLowerCase() || "";
      return title.includes(query) || name.includes(query);
    });
  }

  return docs;
});

const sortedDocumentFiles = computed(() => {
  const docs = [...filteredDocuments.value];

  if (sortBy.value === "date") {
    return docs.sort((a, b) => {
      // Sort by most recently accessed (last_viewed), then updated_at, then created_at
      const aTime = new Date(a.last_viewed || a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.last_viewed || b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }

  return docs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
});

const sortedDocuments = computed(() => [...folderItems.value, ...sortedDocumentFiles.value]);

const sortOptions: SortOption[] = [
  { value: "name", label: "Name" },
  { value: "date", label: "Date" },
];

const sortLabel = computed(() => (sortBy.value === "date" ? "Date" : "Name"));

const filterOptions = computed<FilterOption[]>(() => [
  { key: "all", label: "All", value: "all", icon: FileIcon, active: currentFilter.value === "all" },
  { key: "word", label: "Word", value: "word", icon: FileText, active: currentFilter.value === "word" },
  { key: "pdf", label: "PDF", value: "pdf", icon: FileText, active: currentFilter.value === "pdf" },
  { key: "text", label: "Text", value: "text", icon: FileText, active: currentFilter.value === "text" },
  { key: "other", label: "Other", value: "other", icon: FileText, active: currentFilter.value === "other" },
]);

const activeFilterLabel = computed(() => {
  return filterOptions.value.find((option) => option.value === currentFilter.value)?.label || "All";
});

const viewControls = computed<ViewModeOption[]>(() => [
  { value: "grid", icon: Grid, label: "Grid", active: viewMode.value === "grid" },
  { value: "list", icon: List, label: "List", active: viewMode.value === "list" },
  { value: "thumbnail", icon: LayoutGrid, label: "Thumbnail", active: viewMode.value === "thumbnail" },
]);

const actionIconClass = computed(
  () =>
    "relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700",
);

const firstSelectedId = computed(() =>
  selectedFiles.value.size > 0 ? Array.from(selectedFiles.value)[0] : null,
);

const topBarActions = computed(() => {
  const actions = [
    {
      key: "create-folder",
      icon: FolderPlusIcon,
      component: Button,
      props: { variant: "ghost", size: "icon", class: actionIconClass.value },
      onClick: createNewFolder,
    },
    {
      key: "upload",
      icon: Upload,
      component: Button,
      props: { variant: "ghost", size: "icon", class: actionIconClass.value },
      onClick: openUploadDialog,
    },
    {
      key: "new-document",
      component: "div",
      slot: "new-document",
    },
  ];

  if (selectedFiles.value.size > 0) {
    if (selectedFiles.value.size === 1 && firstSelectedId.value) {
      actions.push({
        key: "open",
        icon: FolderOpen,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => openFile(firstSelectedId.value as string),
      });

      actions.push({
        key: "rename",
        icon: Edit,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: handleRename,
      });
    }

    actions.push(
      {
        key: "download",
        icon: Download,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: handleBulkDownload,
      },
      {
        key: "delete",
        icon: Trash2,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: handleBulkDelete,
      },
      {
        key: "clear",
        icon: X,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => clearSelection(),
      },
    );
  }

  return actions;
});

const handleFilter = (filter: DocumentFilter) => {
  currentFilter.value = filter;
  clearSelection();
};

const handleSort = (sort: DocumentSort) => {
  sortBy.value = sort;
  clearSelection();
};

const handleViewChange = (mode: DocumentViewMode) => {
  viewMode.value = mode;
};

const handleNavigateUp = async () => {
  await navigateUp();
};

const handleBreadcrumbNavigate = async (index: number) => {
  await navigateToBreadcrumb(index);
};

function createNewDocument(template: string) {
  if (template.toLowerCase().includes("blank")) {
    router.push("/docs/new");
  } else {
    router.push("/docs/t/" + template);
  }
}

async function createNewFolder() {
  try {
    const result = await fileStore.makeFolder({
      title: "New Folder",
      is_folder: true,
      folder_id: currentFolderId.value,
      file_type: "folder",
    } as FileData);
    if (result?.id) {
      toast.success("Folder created");
      await refresh();
    }
  } catch (error) {
    console.error("Error creating document folder:", error);
    toast.error("Failed to create folder");
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
  await refresh();
}

async function openFile(id: string) {
  const file = fileStore.allFiles.find((f) => f.id === id);
  if (file?.is_folder) {
    await openFolder(id, file.title);
    return;
  }
  router.push(`/docs/${id}`);
}

async function handleBulkDelete() {
  try {
    const promises = Array.from(selectedFiles.value).map((id) =>
      fileStore.moveToTrash(id)
    );
    await Promise.all(promises);
    clearSelection();
    await refresh();
    toast.success(
      `Successfully deleted ${promises.length} document${promises.length > 1 ? "s" : ""}`
    );
  } catch (error) {
    console.error("Error deleting documents:", error);
    toast.error("Failed to delete some documents");
  }
}

function handleBulkDownload() {
  console.log("Download documents:", Array.from(selectedFiles.value));
}

function handleRename() {
  if (selectedFiles.value.size === 1) {
    const fileItemElement = document.getElementById(
      `fileItem-${Array.from(selectedFiles.value)[0]}`
    );
    if (fileItemElement) {
      const renameEvent = new CustomEvent("start-rename");
      fileItemElement.dispatchEvent(renameEvent);
    }
  }
}

onMounted(async () => {
  document.title = currentTitle.value;

  document.addEventListener("click", handleOutsideClick);

  await initialize();
});

watch(currentTitle, (newTitle) => {
  document.title = newTitle;
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
});

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".file-item") && !target.closest(".context-menu")) {
    clearSelection();
  }
  if (!target.closest("#context-menu")) {
    closeContextMenu();
  }
}
</script>

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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
}

.empty-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  border-radius: 9999px;
  margin-bottom: 1.5rem;
  background-color: rgb(243 244 246);
}

.dark .empty-icon-wrapper {
  background-color: rgb(55 65 81);
}

.empty-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: rgb(37 99 235);
}

.dark .empty-icon {
  color: rgb(59 130 246);
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: rgb(17 24 39);
}

.dark .empty-title {
  color: rgb(243 244 246);
}

.empty-description {
  font-size: 0.875rem;
  margin-bottom: 2rem;
  max-width: 28rem;
  color: rgb(107 114 128);
}

.dark .empty-description {
  color: rgb(156 163 175);
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
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
</style>
