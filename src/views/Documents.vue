<template>
  <div
    :class="[
      'h-full text-gray-900 transition-colors duration-200',
      theme.isDark.value
        ? 'bg-gradient-to-br from-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-gray-50 to-gray-100',
    ]"
  >
    <!-- Loading bar -->
    <div v-if="fileStore.isSyncing" class="loading-bar">
      <div class="loading-progress"></div>
    </div>

    <!-- File browser -->
    <div class="h-full p-6 overflow-hidden">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-4">
          <h2
            :class="[
              'text-2xl font-semibold',
              theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
            ]"
          >
            Documents
          </h2>
          <div class="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              :class="[
                'relative group rounded-full transition-all duration-200',
                theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
              ]"
              @click="createNewFolder"
            >
              <FolderPlusIcon class="h-5 w-5 text-primary-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              :class="[
                'relative group rounded-full transition-all duration-200',
                theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
              ]"
              @click="openUploadDialog"
            >
              <Upload class="h-5 w-5 text-primary-600" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  :class="[
                    'relative group rounded-full transition-all duration-200',
                    theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
                  ]"
                >
                  <Plus class="h-5 w-5 text-primary-600" />
                </Button>
              </DialogTrigger>
              <DialogContent
                :class="[
                  'rounded-lg shadow-2xl border',
                  theme.isDark.value
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200',
                ]"
              >
                <DialogHeader>
                  <DialogTitle
                    :class="[
                      'text-xl font-semibold',
                      theme.isDark.value ? 'text-gray-100' : 'text-gray-800',
                    ]"
                  >
                    Create New Document
                  </DialogTitle>
                </DialogHeader>
                <div class="grid grid-cols-2 gap-4 p-2">
                  <Button
                    v-for="template in documentTemplates"
                    :key="template.name"
                    variant="outline"
                    :class="[
                      'h-24 flex flex-col items-center justify-center transition-all',
                      theme.isDark.value
                        ? 'hover:bg-gray-700 hover:border-primary-400'
                        : 'hover:bg-gray-50 hover:border-primary-400',
                    ]"
                    @click="createNewDocument(template.name)"
                  >
                    <component :is="template.icon" class="w-8 h-8 text-primary-600" />
                    <span class="mt-2 text-sm font-medium">{{ template.name }}</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <!-- Right sort actions / Selection actions -->
        <div class="flex items-center space-x-4">
          <template v-if="selectedFiles.size > 0">
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
                :class="['h-4 w-px', theme.isDark.value ? 'bg-gray-600' : 'bg-gray-300']"
              ></div>
            </div>
            <div class="flex items-center space-x-2">
              <Button
                v-if="selectedFiles.size === 1"
                variant="ghost"
                size="sm"
                @click="openFile(Array.from(selectedFiles)[0])"
              >
                <FolderOpen class="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button variant="ghost" size="sm" @click="handleBulkDelete">
                <Trash2 class="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                v-if="selectedFiles.size === 1"
                variant="ghost"
                size="sm"
                @click="handleRename"
              >
                <Edit class="h-4 w-4 mr-2" />
                Rename
              </Button>
              <Button variant="ghost" size="sm" @click="handleBulkDownload">
                <Download class="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="!ml-2"
                @click="selectedFiles.clear()"
              >
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  :class="[
                    theme.isDark.value
                      ? 'border-gray-600 text-gray-100'
                      : 'border-gray-300',
                  ]"
                >
                  Sort by: {{ sortBy === "name" ? "Name" : "Date" }}
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
              </DropdownMenuContent>
            </DropdownMenu>

            <!-- Inline View Toggle (matching media toolbar style) -->
            <div
              :class="[
                'flex items-center rounded-lg p-1',
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
          </template>
        </div>
      </div>

      <!-- Content area -->
      <ScrollArea
        :class="[
          'h-[calc(100vh-320px)] rounded-lg shadow-sm border',
          theme.isDark.value ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
        ]"
      >
        <div v-if="documentFiles.length > 0">
          <!-- Select All header for list view -->
          <div
            v-if="viewMode === 'list'"
            :class="[
              'flex items-center gap-3 px-4 py-3 border-b',
              theme.isDark.value ? 'border-gray-700' : 'border-gray-200',
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
                'text-sm font-medium',
                theme.isDark.value ? 'text-gray-300' : 'text-gray-700',
              ]"
            >
              {{ isAllSelected ? "Deselect All" : "Select All" }}
            </span>
          </div>

          <!-- Select All button for grid view -->
          <div
            v-else-if="viewMode === 'grid'"
            :class="[
              'flex items-center justify-between px-4 py-3 border-b',
              theme.isDark.value ? 'border-gray-700' : 'border-gray-200',
            ]"
          >
            <Button
              variant="ghost"
              size="sm"
              @click="toggleSelectAll"
              :class="[
                'flex items-center gap-2',
                theme.isDark.value ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
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
                  'text-sm font-medium',
                  theme.isDark.value ? 'text-gray-300' : 'text-gray-700',
                ]"
              >
                {{ isAllSelected ? "Deselect All" : "Select All" }}
              </span>
            </Button>

            <!-- Optional: Show count of total files -->
            <span
              :class="['text-xs', theme.isDark.value ? 'text-gray-400' : 'text-gray-500']"
            >
              {{ documentFiles.length }} document{{
                documentFiles.length !== 1 ? "s" : ""
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
                @click.stop="handleSelect(item.id, $event)"
                @select-file="handleSelect"
                @open-file="openFile"
              />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-icon-wrapper">
            <FolderOpen class="empty-icon" />
          </div>
          <h3 class="empty-title">No documents found</h3>
          <p class="empty-description">
            Get started by creating a new document or uploading an existing one.
          </p>
          <div class="empty-actions">
            <Button
              @click="createNewDocument('Blank Document')"
              class="bg-primary-600 hover:bg-primary-700"
            >
              <Plus class="mr-2 h-4 w-4" />
              New Document
            </Button>
            <Button
              variant="outline"
              class="border-gray-300 hover:border-gray-400"
              @click="openUploadDialog"
            >
              <Upload class="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>

  <FileUploader
    v-if="isUploadDialogOpen"
    @close="isUploadDialogOpen = false"
    @upload="handleUploadComplete"
    :file-type-filter="'documents'"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from "vue";
import { useRouter } from "vue-router";
import {
  Grid,
  List,
  Plus,
  ChevronDown,
  FolderOpen,
  Upload,
  FolderPlusIcon,
  Trash2,
  Edit,
  Download,
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
import { FileData } from "@/types";
import FileItem from "@/components/FileItem.vue";
import { toast } from "@/composables/useToast";
import FileUploader from "@/components/FileUploader.vue";
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";

const router = useRouter();
const fileStore = useFileStore();
const theme = inject("theme") as { isDark: { value: boolean } };

const viewMode = ref<"grid" | "list" | "thumbnail">("grid");
const selectedFiles = ref<Set<string>>(new Set());
const sortBy = ref("name");
const isUploadDialogOpen = ref(false);

const documentTemplates = [
  { name: "Blank Document", icon: defaultIcons.IconMicrosoftWord },
  { name: "Resume", icon: defaultIcons.IconMicrosoftWord },
  { name: "Letter", icon: defaultIcons.IconMicrosoftWord },
];

// Filter documents (docx, pdf, txt, etc.)
const documentFiles = computed(() => {
  return fileStore.allFiles.filter((file) => {
    if (file.is_folder) return false;

    const documentTypes = ["docx", "pdf", "txt", "rtf", "doc", "odt"];
    return file.file_type && documentTypes.includes(file.file_type.toLowerCase());
  });
});

const sortedDocuments = computed(() => {
  const sortFn = (a: FileData, b: FileData) => {
    if (sortBy.value === "name" && a.title && b.title) {
      return a.title.localeCompare(b.title);
    } else if (sortBy.value === "date" && a.last_viewed && b.last_viewed) {
      return new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime();
    }
    return 0;
  };

  return [...documentFiles.value].sort(sortFn);
});

// Select all functionality
const isAllSelected = computed(() => {
  return (
    documentFiles.value.length > 0 &&
    documentFiles.value.every((file) => selectedFiles.value.has(file.id || ""))
  );
});

const isSomeSelected = computed(() => {
  return selectedFiles.value.size > 0 && !isAllSelected.value;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedFiles.value.clear();
  } else {
    selectedFiles.value = new Set(
      documentFiles.value.map((file) => file.id || "").filter(Boolean)
    );
  }
}

function createNewDocument(template: string) {
  if (template.toLowerCase().includes("blank")) {
    router.push("/docs/new");
  } else {
    router.push("/docs/t/" + template);
  }
}

function createNewFolder() {
  // Implement folder creation for documents
  console.log("Create new folder in documents");
}

function openUploadDialog() {
  isUploadDialogOpen.value = true;
}

function handleUploadComplete(files: any[]) {
  console.log("Upload completed:", files);
  toast.success(
    `Successfully uploaded ${files.length} file${files.length !== 1 ? "s" : ""}`
  );
}

function handleSelect(id: string | undefined, event?: MouseEvent) {
  if (!id) return;

  // If Ctrl/Cmd is held, toggle selection of this item
  if (event?.ctrlKey || event?.metaKey) {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  }
  // If Shift is held, select range (basic implementation)
  else if (event?.shiftKey && selectedFiles.value.size > 0) {
    // For now, just add to selection - you could implement range selection later
    selectedFiles.value.add(id);
  }
  // Normal click - toggle individual selection (allows building selection)
  else {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  }
}

function openFile(id: string) {
  router.push(`/docs/${id}`);
}

async function handleBulkDelete() {
  try {
    const promises = Array.from(selectedFiles.value).map((id) =>
      fileStore.deleteFile(id)
    );
    await Promise.all(promises);
    selectedFiles.value.clear();
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
  document.title = "Documents";

  if (fileStore.allFiles.length === 0) {
    await fileStore.loadDocuments();
  }
});
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