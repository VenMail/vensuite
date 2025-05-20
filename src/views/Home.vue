<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted, watchEffect } from "vue";
import { useRouter, useRoute } from "vue-router";
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
  Share2,
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
import { sluggify } from "@/utils/lib";
import { useFavicon } from "@vueuse/core";
import { toast } from 'vue-sonner'
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const fileStore = useFileStore();
const { isAuthenticated } = storeToRefs(authStore);

const viewMode = ref<"grid"|"tree"|"thumbnail"|"list">("grid");
const selectedFiles = ref<Set<string>>(new Set());
const showRecentFiles = ref(false);
const sortBy = ref("name");
const groupByFileType = ref(false);
const currentFolderId = ref<string | null>(null);
const searchValue = ref('');

const showContextMenu = computed(() => selectedFiles.value.size > 0);

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

function loginWithVenmail() {
  const redirectUri = encodeURIComponent(
    `${window.location.origin}/oauth/callback`
  );
  const currentPath = route.fullPath;
  localStorage.setItem("loginRedirect", currentPath);
  window.location.href = authStore.getAuthUrl(redirectUri);
}

onMounted(async () => {
  watchEffect(async () => {
    if (route.params.id) {
      console.log('importing..', route.params.id)
      const attachId = route.params?.id as string
      const doc = await fileStore.importAttachment(attachId)
      if (doc) {
        toast({
          description: doc.file_name + " imported successfully"
        })
      }
      router.replace("/")
    }
  })

  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleEscapeKey);

  if (authStore.getToken()) {
    // Load offline documents first
    const offlineDocs = fileStore.loadOfflineDocuments();
    fileStore.allFiles = offlineDocs;

    // If online, load online documents and merge
    if (fileStore.isOnline) {
      const onlineDocs = await fileStore.loadDocuments();
      fileStore.allFiles = fileStore.mergeDocuments(onlineDocs, offlineDocs);
    }
  }
  
  document.title = "Home";
  useFavicon("/logo-black.png")
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleEscapeKey);
});

const selectedFilesList = computed(() => {
  const uniqueFiles = new Map<string, FileData>();
  
  // Process both recent and all files
  const sourceFiles = showRecentFiles.value 
    ? fileStore.recentFiles 
    : fileStore.allFiles;

  // Deduplicate files by ID
  sourceFiles.forEach(file => {
    if (file.id && !uniqueFiles.has(file.id)) {
      uniqueFiles.set(file.id, file);
    }
  });

  // Apply folder filtering
  return Array.from(uniqueFiles.values()).filter(file => {
    const folderMatch = currentFolderId.value 
      ? file.folder_id === currentFolderId.value
      : !file.folder_id;
    
    const searchMatch = !searchValue.value ||
      file.title?.toLowerCase().includes(searchValue.value.toLowerCase()) ||
      file.file_name?.toLowerCase().includes(searchValue.value.toLowerCase());

    return folderMatch && searchMatch;
  });
});

const folders = computed(() => {
  return selectedFilesList.value.filter(file => file.is_folder);
});

const files = computed(() => {
  return selectedFilesList.value.filter(file => !file.is_folder);
});

const sortedItems = computed(() => {
  const sortFn = (a: FileData, b: FileData) => {
    if (sortBy.value === "name" && a.title && b.title) {
      return a.title.localeCompare(b.title);
    } else if (sortBy.value === "date" && a.last_viewed && b.last_viewed) {
      return new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime();
    }
    return 0;
  };

  return [...folders.value, ...files.value].sort(sortFn);
});

// Group files and folders based on file type
const groupedItems = computed(() => {
  if (!groupByFileType.value) return { "All Items": sortedItems.value };

  return sortedItems.value.reduce((acc, item) => {
    const key = item.is_folder ? "Folders" : (item.file_type?.toLowerCase() || "Other");
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, FileData[]>);
});

async function openFolder(id: string) {
  try {
    await fileStore.fetchFiles(id)
    currentFolderId.value = id;
  } catch (error) {
    console.error("Error opening folder:", error);
  }
}

function handleSelect(id: string | undefined, event?: MouseEvent) {
  console.log('handleSelect', id, event)
  if (!id) return;
  
  // If event is from checkbox click, handle single selection
  if (event?.target && (event.target as HTMLElement).closest('.w-5.h-5, .w-4.h-4')) {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
    return;
  }
  
  // Handle multi-select with Ctrl/Cmd key
  if (event?.ctrlKey || event?.metaKey) {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  }
  // Handle range select with Shift key
  else if (event?.shiftKey && selectedFiles.value.size > 0) {
    const allFiles = sortedItems.value;
    const lastSelectedIndex = allFiles.findIndex(f => f.id === Array.from(selectedFiles.value).pop());
    const currentIndex = allFiles.findIndex(f => f.id === id);
    
    if (lastSelectedIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      
      allFiles.slice(start, end + 1).forEach(f => {
        if (f.id) selectedFiles.value.add(f.id);
      });
    }
  }
  // Normal single select
  else {
    selectedFiles.value = new Set([id]);
  }
}

function openFile(id: string) {
  const file = fileStore.allFiles.find((f) => f.id === id);
  if (file) {
    if (file.is_folder) {
      openFolder(id);
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
      }
    }
  }
}

async function createNewFolder() {
  const newFolderName = 'New Folder';
  try {
    const folder = {
      file_name: sluggify(newFolderName),
      title: newFolderName,
      is_folder: true,
      folder_id: currentFolderId.value
    };
    const result = await fileStore.makeFolder(folder);
    if (result && result.id) {
      selectedFiles.value = new Set([result.id]);
      // Trigger rename mode in FileItem component
      nextTick(() => {
        const fileItemElement = document.getElementById(`fileItem-${result.id}`);
        if (fileItemElement) {
          const renameEvent = new CustomEvent('start-rename');
          fileItemElement.dispatchEvent(renameEvent);
        }
      });
    }
  } catch (error) {
    console.error("Error creating folder:", error);
  }
}

function createNewFile(type: string, template?: string) {
  console.log('type', type)
  console.log('template', template)
  if (type === "spreadsheets") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/sheets");
    } else {
      router.push("/sheets/t/" + template);
    }
  } else if (type === "documents") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/docs");
    } else {
      router.push("/docs/t/" + template);
    }
  }
}

// uploader
function openUploadDialog() {
  //todo: launch a modal powered dropzone implemented via shadcn UI apple ui inspired
}

// Format group names for display
function formatGroupName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace("_", " ");
}

function handleRename() {
  if (selectedFiles.value.size === 1) {
    const fileItemElement = document.getElementById(`fileItem-${Array.from(selectedFiles.value)[0]}`);
    if (fileItemElement) {
      const renameEvent = new CustomEvent('start-rename');
      fileItemElement.dispatchEvent(renameEvent);
    }
  }
}

// Update the contextMenuActions computed property
const contextMenuActions = computed(() => {
  const numSelected = selectedFiles.value.size;
  if (numSelected === 0) return [];
  
  const selectedFilesList = Array.from(selectedFiles.value).map(id => 
    fileStore.allFiles.find(f => f.id === id)
  ).filter(Boolean);
  
  const hasFiles = selectedFilesList.some(f => !f?.is_folder);
  // Check for folders if needed in the future
  // const hasFolders = selectedFilesList.some(f => f?.is_folder);
  
  return [
    ...(numSelected === 1 ? [{
      label: "Open",
      icon: FolderOpen,
      action: () => openFile(Array.from(selectedFiles.value)[0])
    }] : []),
    {
      label: `Delete ${numSelected > 1 ? `(${numSelected})` : ''}`,
      icon: Trash2,
      action: handleBulkDelete
    },
    ...(numSelected === 1 ? [{
      label: "Rename",
      icon: Edit,
      action: handleRename
    }] : []),
    ...(hasFiles ? [{
      label: `Download ${numSelected > 1 ? `(${numSelected})` : ''}`,
      icon: Download,
      action: handleBulkDownload
    }] : []),
    ...(numSelected === 1 ? [{
      label: "Share",
      icon: Share2,
      action: () => console.log("Share")
    }] : [])
  ];
});

async function handleBulkDelete() {
  try {
    const promises = Array.from(selectedFiles.value).map(id => fileStore.deleteFile(id));
    await Promise.all(promises);
    selectedFiles.value.clear();
    toast.success(`Successfully deleted ${promises.length} item${promises.length > 1 ? 's' : ''}`);
  } catch (error) {
    console.error('Error deleting files:', error);
    toast.error('Failed to delete some items');
  }
}

function handleBulkDownload() {
  const selectedFilesList = Array.from(selectedFiles.value)
    .map(id => fileStore.allFiles.find(f => f.id === id))
    .filter(f => f && !f.is_folder);
  
  // Implement download logic here
  console.log('Downloading files:', selectedFilesList);
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.file-item') && !target.closest('.context-menu')) {
    selectedFiles.value.clear();
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    selectedFiles.value.clear();
  } else if (event.key === 'F2' && selectedFiles.value.size === 1) {
    event.preventDefault();
    handleRename();
  } else if (event.key === 'Delete' && selectedFiles.value.size > 0) {
    handleBulkDelete();
  }
}
</script>


<template>
  <div v-if="isAuthenticated" class="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Loading bar -->
      <div v-if="fileStore.isSyncing" class="loading-bar">
        <div class="loading-progress"></div>
      </div>

      <!-- File browser -->
      <div class="flex-1 p-6 overflow-hidden">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-4">
            <h2 class="text-2xl font-semibold text-gray-800">
              {{ showRecentFiles ? "Recent Files" : "All Files" }}
            </h2>
            <Button variant="outline" class="border-primary-400 hover:border-primary-500" @click="createNewFolder">
              <FolderPlusIcon class="mr-2 h-4 w-4 text-primary-600" />
              New Folder
            </Button>
            <Button variant="outline" class="border-primary-400 hover:border-primary-500" @click="openUploadDialog">
              <Upload class="mr-2 h-4 w-4 text-primary-600" />
              Upload
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" class="border-primary-400 hover:border-primary-500">
                  <Plus class="mr-2 h-4 w-4 text-primary-600" />
                  New from Template
                </Button>
              </DialogTrigger>
              <DialogContent class="bg-white rounded-lg shadow-2xl border border-gray-200">
                <DialogHeader>
                  <DialogTitle class="text-xl font-semibold text-gray-800">Choose a Template</DialogTitle>
                </DialogHeader>
                <Tabs default-value="Documents">
                  <TabsList class="bg-gray-100">
                    <TabsTrigger v-for="category in Object.keys(templates)" :key="category" :value="category"
                      class="data-[state=active]:bg-white data-[state=active]:text-primary-600">
                      {{ category }}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent v-for="(items, category) in templates" :key="category" :value="category">
                    <div class="grid grid-cols-2 gap-4 p-2">
                      <Button v-for="template in items" :key="template.name" variant="outline"
                        class="h-24 flex flex-col items-center justify-center hover:bg-gray-50 hover:border-primary-400 transition-all"
                        @click="createNewFile(category?.toLowerCase(), template.name)">
                        <component :is="template.icon" class="w-8 h-8 text-primary-600" />
                        <span class="mt-2 text-sm font-medium">{{ template.name }}</span>
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          <!-- Right sort actions / Selection actions -->
          <div class="flex items-center space-x-4">
            <template v-if="selectedFiles.size > 0">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-700">{{ selectedFiles.size }} selected</span>
                <div class="h-4 w-px bg-gray-300"></div>
              </div>
              <div class="flex items-center space-x-2">
                <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm" @click="openFile(Array.from(selectedFiles)[0])">
                  <FolderOpen class="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button variant="ghost" size="sm" @click="handleBulkDelete">
                  <Trash2 class="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm" @click="handleRename">
                  <Edit class="h-4 w-4 mr-2" />
                  Rename
                </Button>
                <Button variant="ghost" size="sm" @click="handleBulkDownload">
                  <Download class="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm">
                  <Share2 class="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="ghost" size="sm" class="!ml-2" @click="selectedFiles.clear()">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </template>
            <template v-else>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" class="border-gray-300">
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
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">Group by Type</span>
                <Switch v-model="groupByFileType" />
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">Recent Files</span>
                <Switch v-model="showRecentFiles" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" class="border-gray-300">
                    <component :is="viewMode === 'grid' ? Grid : List" class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem @click="viewMode = 'grid'">
                    <Grid class="mr-2 h-4 w-4" />
                    Grid View
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="viewMode = 'list'">
                    <List class="mr-2 h-4 w-4" />
                    List View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </template>
          </div>
          <!-- End of right sort actions / Selection actions -->
        </div>

        <!-- Search input -->
        <!-- <div class="relative mb-6">
          <Input v-model="searchValue" placeholder="Search files and folders..." 
            class="bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-400 pr-10" />
          <div v-if="searchValue" 
            class="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
            @click="searchValue = ''">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-500 hover:text-gray-700">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div> -->

        <!-- Loading state -->
        <div v-if="fileStore.isSyncing && Object.keys(groupedItems).length === 0" class="loading-state">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading your files...</p>
        </div>

        <!-- Content area -->
        <ScrollArea class="h-[calc(100vh-280px)] bg-white rounded-lg shadow-sm border border-gray-200">
          <div v-if="Object.keys(groupedItems).length > 0 && sortedItems.length > 0">
            <template v-for="(items, groupName) in groupedItems" :key="groupName">
              <div class="p-4">
                <h3 v-if="groupByFileType" class="text-base font-semibold text-gray-700 mb-3 px-2">
                  {{ formatGroupName(groupName) }}
                </h3>
                <div v-if="items.length === 0" class="text-center text-sm text-gray-500 py-4">
                  No items available in this category.
                </div>
                <div :class="{
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4': viewMode === 'grid',
                  'space-y-2': viewMode === 'list',
                }">
                  <FileItem v-for="item in items" :file="item" :viewMode="viewMode"
                    :isSelected="selectedFiles.has(item.id || item.local_id || '')"
                    @click.stop="handleSelect(item.id, $event)"
                    @select-file="handleSelect"
                    @open-file="openFile" />
                </div>
              </div>
            </template>
          </div>

          <!-- Empty state -->
          <div v-else-if="!fileStore.isSyncing || (fileStore.isSyncing && Object.keys(groupedItems).length === 0)" 
            class="empty-state">
            <div class="empty-icon-wrapper">
              <FolderOpen class="empty-icon" />
            </div>
            <h3 class="empty-title">
              {{ searchValue ? "No matching files found" : "No files found" }}
            </h3>
            <p class="empty-description">
              {{
                searchValue
                  ? "Try adjusting your search or filters."
                  : "Get started by creating a new file or uploading an existing one."
              }}
            </p>
            <div class="empty-actions">
              <Button @click="createNewFile('documents')" class="bg-primary-600 hover:bg-primary-700">
                <Plus class="mr-2 h-4 w-4" />
                New Document
              </Button>
              <Button @click="createNewFile('spreadsheets')" class="bg-green-600 hover:bg-green-700">
                <Plus class="mr-2 h-4 w-4" />
                New Spreadsheet
              </Button>
              <Button variant="outline" class="border-gray-300 hover:border-gray-400">
                <Upload class="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>
  <div v-else
    class="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
    <div class="bg-white backdrop-filter backdrop-blur-lg p-10 rounded-lg shadow-xl border border-gray-200">
      <div class="flex items-center justify-center mb-6">
        <img src="/logo-black.png" alt="VenMail Logo" class="h-8 w-full" />
      </div>
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">
        Welcome to Venmail File Manager
      </h2>
      <Button class="w-full bg-primary-600 hover:bg-primary-700" @click="loginWithVenmail">
        Login with Venmail
      </Button>
      <p class="text-sm text-gray-500 mt-4 text-center">
        Login to manage your files and folders on Venmail.
      </p>
    </div>
  </div>

  <!-- Add context menu -->
  <DropdownMenu v-if="showContextMenu">
    <DropdownMenuContent class="w-48">
      <DropdownMenuItem v-for="action in contextMenuActions" :key="action.label"
        @click="action.action">
        <component :is="action.icon" class="mr-2 h-4 w-4" />
        {{ action.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<style scoped>
.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden;
}

.loading-progress {
  @apply h-full bg-primary-600;
  width: 30%;
  animation: loading 2s infinite ease-in-out;
}

.loading-state {
  @apply flex flex-col items-center justify-center p-16;
}

.loading-spinner {
  @apply w-12 h-12 border-4 border-gray-300 rounded-full;
  border-top-color: #4d7cfe;
  animation: spin 1s linear infinite;
}

.loading-text {
  @apply mt-4 text-gray-600 font-medium;
}

.empty-state {
  @apply flex flex-col items-center justify-center p-16 text-center;
}

.empty-icon-wrapper {
  @apply flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6;
}

.empty-icon {
  @apply w-10 h-10 text-primary-600;
}

.empty-title {
  @apply text-xl font-bold text-gray-800 mb-2;
}

.empty-description {
  @apply text-sm text-gray-500 mb-8 max-w-md;
}

.empty-actions {
  @apply flex flex-wrap gap-4 justify-center;
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