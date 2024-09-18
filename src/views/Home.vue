<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  SearchIcon,
  Grid,
  List,
  Plus,
  Settings,
  ChevronDown,
  FolderOpen,
  Upload,
  FolderPlusIcon,
} from "lucide-vue-next";
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { useFileStore } from "@/store/files";
import Input from "@/components/ui/input/Input.vue";
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
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const fileStore = useFileStore();
const { isAuthenticated } = storeToRefs(authStore);

const searchValue = ref("");
const viewMode = ref<"grid"|"tree"|"thumbnail"|"list">("grid");
const selectedFile = ref<string | null>(null);
const showRecentFiles = ref(false);
const sortBy = ref("name");
const groupByFileType = ref(false);
const currentFolderId = ref<string | null>(null);

let debounceTimer: NodeJS.Timeout;
const debouncedSearch = ref(searchValue.value);

// Watcher for debouncing the search input
watch(searchValue, (newValue) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = newValue;
  }, 300);
});

const templates = {
  Documents: [
    { name: "Blank Document", icon: defaultIcons.IconMicrosoftWord },
    { name: "Resume", icon: defaultIcons.IconMicrosoftWord },
    { name: "Letter", icon: defaultIcons.IconMicrosoftWord },
  ],
  Spreadsheets: [
    { name: "Blank Spreadsheet", icon: defaultIcons.IconMicrosoftExcel },
    { name: "Budget", icon: defaultIcons.IconMicrosoftExcel },
    { name: "Invoice", icon: defaultIcons.IconMicrosoftExcel },
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
  if (authStore.getToken() && fileStore.allFiles.length == 0) {
    await fileStore.loadDocuments();
  }
  document.title = "Home";
});

const selectedFiles = computed(() => {
  let files = showRecentFiles.value ? fileStore.recentFiles : fileStore.allFiles;
  
  // Filter by current folder if set
  if (currentFolderId.value) {
    files = files.filter(file => file.folder_id === currentFolderId.value);
  } else {
    files = files.filter(file => !file.folder_id); // Show only root-level files/folders
  }

  // Filter files based on search value
  return files.filter((file) => {
    const fileName = file.title?.toLowerCase() || "";
    const search = debouncedSearch.value?.toLowerCase() || "";
    return fileName.includes(search);
  });
});

const folders = computed(() => {
  return selectedFiles.value.filter(file => file.is_folder);
});

const files = computed(() => {
  return selectedFiles.value.filter(file => !file.is_folder);
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
      selectedFile.value = result.id;
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

const contextMenuActions = computed(() => {
  if (!selectedFile.value) return [];
  return [
    { label: "Open", action: () => openFile(selectedFile.value!) },
    { label: "Rename", action: () => {
      const fileItemElement = document.getElementById(`fileItem-${selectedFile.value}`);
      if (fileItemElement) {
        const renameEvent = new CustomEvent('start-rename');
        fileItemElement.dispatchEvent(renameEvent);
      }
    }},
    { label: "Delete", action: () => fileStore.deleteFile(selectedFile.value!) },
    { label: "Download", action: () => console.log("Download") },
    { label: "Share", action: () => console.log("Share") },
  ];
});
</script>

<template>
  <div v-if="isAuthenticated" class="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900">
    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top menubar -->
      <div
        class="bg-white bg-opacity-50 backdrop-blur-lg border-b border-gray-200 p-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <Button variant="outline" size="icon" @click="currentFolderId = null">
            <ChevronDown class="h-4 w-4" />
          </Button>
          <div class="relative">
            <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <Input v-model="searchValue" placeholder="Search files..." class="pl-8 w-64" />
          </div>
        </div>
        <!-- Context-aware menu -->
        <div v-if="selectedFile"
          class="bg-white bg-opacity-50 backdrop-blur-sm border-b border-gray-200 p-2 flex items-center space-x-2">
          <Button v-for="action in contextMenuActions" :key="action.label" variant="ghost" size="sm"
            @click="action.action">
            {{ action.label }}
          </Button>
        </div>
        <div v-else class="flex items-center space-x-4">
          <Button variant="outline" @click="createNewFolder">
            <FolderPlusIcon class="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button variant="outline" @click="openUploadDialog">
            <Upload class="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus class="mr-2 h-4 w-4" />
                New from Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
              </DialogHeader>
              <Tabs default-value="Documents">
                <TabsList>
                  <TabsTrigger v-for="category in Object.keys(templates)" :key="category" :value="category">
                    {{ category }}
                  </TabsTrigger>
                </TabsList>
                <TabsContent v-for="(items, category) in templates" :key="category" :value="category">
                  <div class="grid grid-cols-2 gap-4">
                    <Button v-for="template in items" :key="template.name" variant="outline"
                      class="h-24 flex flex-col items-center justify-center"
                      @click="createNewFile(category?.toLowerCase(), template.name)">
                      <component :is="template.icon" class="w-8 h-8" />
                      <span class="mt-2 text-sm">{{ template.name }}</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
          <Button variant="ghost" size="icon">
            <Settings class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- File browser -->
      <div class="flex-1 p-6 overflow-hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold">
            {{ showRecentFiles ? "Recent Files" : "All Files" }}
          </h2>
          <div class="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
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
              <span class="text-sm text-gray-500">Group by File Type</span>
              <Switch v-model="groupByFileType" />
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">Show Recent Files</span>
              <Switch v-model="showRecentFiles" />
            </div>
          </div>
        </div>
        <ScrollArea class="h-[calc(100vh-280px)]">
          <div v-if="Object.keys(groupedItems).length > 0">
            <template v-for="(items, groupName) in groupedItems" :key="groupName">
              <h3 v-if="groupByFileType" class="text-lg font-semibold text-gray-800 mb-2">
                {{ formatGroupName(groupName) }}
              </h3>
              <div v-if="items.length === 0" class="text-center text-sm text-gray-500 mb-4">
                No items available in this category.
              </div>
              <div :class="{
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4': viewMode === 'grid',
                'space-y-2': viewMode === 'list',
              }">
                <FileItem v-for="item in items" :file="item" :viewMode="viewMode"
                  :isSelected="selectedFile === item.id" @select-file="(id) => selectedFile = id"
                  @open-file="openFile" />
              </div>
            </template>
          </div>
          <div v-else class="flex flex-col items-center justify-center h-full">
            <FolderOpen class="w-16 h-16 text-gray-400 mb-4" />
            <h3 class="text-2xl font-bold tracking-tight mb-2">
              No files found
            </h3>
            <p class="text-sm text-muted-foreground mb-4">
              {{
                searchValue
                  ? "Try adjusting your search or filters."
                  : "Get started by creating a new file or uploading an existing one."
              }}
            </p>
            <div class="flex space-x-4">
              <Button @click="createNewFile('document')">
                <Plus class="mr-2 h-4 w-4" />
                New Document
              </Button>
              <Button @click="createNewFile('spreadsheet')">
                <Plus class="mr-2 h-4 w-4" />
                New Spreadsheet
              </Button>
              <Button variant="outline">
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
    class="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
    <div class="bg-white bg-opacity-50 backdrop-blur-lg p-8 rounded-lg shadow-xl">
      <h2 class="text-2xl font-bold mb-4 text-center">
        Welcome to Venmail File Manager
      </h2>
      <Button class="w-full" @click="loginWithVenmail">
        Login with Venmail
      </Button>
      <p class="text-sm text-muted-foreground mt-4 text-center">
        Login to manage your files and folders on Venmail.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>