<template>
  <div v-if="isAuthenticated" :class="[
    'flex h-screen text-gray-900 transition-colors duration-200',
    theme.isDark.value
      ? 'bg-gradient-to-br from-gray-900 to-gray-800'
      : 'bg-gradient-to-br from-gray-50 to-gray-100'
  ]">
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
            <h2 :class="[
              'text-2xl font-semibold',
              theme.isDark.value ? 'text-gray-100' : 'text-gray-800'
            ]">
              Documents
            </h2>
            <div class="flex items-center space-x-2">
              <Button variant="ghost" size="icon" 
                :class="[
                  'relative group rounded-full transition-all duration-200',
                  theme.isDark.value 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-100'
                ]"
                @click="createNewFolder">
                <FolderPlusIcon class="h-5 w-5 text-primary-600" />
              </Button>
              <Button variant="ghost" size="icon"
                :class="[
                  'relative group rounded-full transition-all duration-200',
                  theme.isDark.value 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-100'
                ]"
                @click="openUploadDialog">
                <Upload class="h-5 w-5 text-primary-600" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon"
                    :class="[
                      'relative group rounded-full transition-all duration-200',
                      theme.isDark.value 
                        ? 'hover:bg-gray-700' 
                        : 'hover:bg-gray-100'
                    ]">
                    <Plus class="h-5 w-5 text-primary-600" />
                  </Button>
                </DialogTrigger>
                <DialogContent :class="[
                  'rounded-lg shadow-2xl border',
                  theme.isDark.value
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                ]">
                  <DialogHeader>
                    <DialogTitle :class="[
                      'text-xl font-semibold',
                      theme.isDark.value ? 'text-gray-100' : 'text-gray-800'
                    ]">
                      Create New Document
                    </DialogTitle>
                  </DialogHeader>
                  <div class="grid grid-cols-2 gap-4 p-2">
                    <Button v-for="template in documentTemplates" :key="template.name" variant="outline" :class="[
                      'h-24 flex flex-col items-center justify-center transition-all',
                      theme.isDark.value
                        ? 'hover:bg-gray-700 hover:border-primary-400'
                        : 'hover:bg-gray-50 hover:border-primary-400'
                    ]" @click="createNewDocument(template.name)">
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
                <span :class="[
                  'text-sm font-medium',
                  theme.isDark.value ? 'text-gray-300' : 'text-gray-700'
                ]">
                  {{ selectedFiles.size }} selected
                </span>
                <div :class="[
                  'h-4 w-px',
                  theme.isDark.value ? 'bg-gray-600' : 'bg-gray-300'
                ]"></div>
              </div>
              <div class="flex items-center space-x-2">
                <Button v-if="selectedFiles.size === 1" variant="ghost" size="sm"
                  @click="openFile(Array.from(selectedFiles)[0])">
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
                <Button variant="ghost" size="sm" class="!ml-2" @click="selectedFiles.clear()">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </template>
            <template v-else>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" :class="[
                    theme.isDark.value
                      ? 'border-gray-600 text-gray-100'
                      : 'border-gray-300'
                  ]">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" :class="[
                    theme.isDark.value
                      ? 'border-gray-600 text-gray-100'
                      : 'border-gray-300'
                  ]">
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
        </div>

        <!-- Content area -->
        <ScrollArea :class="[
          'h-[calc(100vh-280px)] rounded-lg shadow-sm border',
          theme.isDark.value
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        ]">
          <div v-if="documentFiles.length > 0">
            <div class="p-4">
              <div :class="{
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4': viewMode === 'grid',
                'space-y-2': viewMode === 'list',
              }">
                <FileItem v-for="item in sortedDocuments" :key="item.id" :file="item" :viewMode="viewMode"
                  :isSelected="selectedFiles.has(item.id || '')"
                  @click.stop="handleSelect(item.id, $event)" @select-file="handleSelect" @open-file="openFile" />
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
              <Button @click="createNewDocument('Blank Document')" class="bg-primary-600 hover:bg-primary-700">
                <Plus class="mr-2 h-4 w-4" />
                New Document
              </Button>
              <Button variant="outline" class="border-gray-300 hover:border-gray-400" @click="openUploadDialog">
                <Upload class="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>

  <!-- Not authenticated state -->
  <div v-else :class="[
    'h-screen w-full flex flex-col items-center justify-center transition-colors duration-200',
    theme.isDark.value
      ? 'bg-gradient-to-br from-gray-900 to-gray-800'
      : 'bg-gradient-to-br from-gray-50 to-gray-100'
  ]">
    <div :class="[
      'backdrop-filter backdrop-blur-lg p-10 rounded-lg shadow-xl border',
      theme.isDark.value
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    ]">
      <div class="flex items-center justify-center mb-6">
        <img :src="theme.isDark.value ? '/logo-white.png' : '/logo-black.png'" alt="VenMail Logo" class="h-6 w-full" />
      </div>
      <h2 :class="[
        'text-2xl font-bold mb-6 text-center',
        theme.isDark.value ? 'text-gray-100' : 'text-gray-800'
      ]">
        Welcome to Documents
      </h2>
      <Button class="w-full bg-primary-600 hover:bg-primary-700" @click="loginWithVenmail">
        Login with Venmail
      </Button>
    </div>
  </div>

  <FileUploader
    v-if="isUploadDialogOpen"
    @close="isUploadDialogOpen = false"
    @upload="handleUploadComplete"
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
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
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
const authStore = useAuthStore();
const fileStore = useFileStore();
const { isAuthenticated } = storeToRefs(authStore);
const theme = inject('theme') as { isDark: { value: boolean } };

const viewMode = ref<"grid" | "list">("grid");
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
  return fileStore.allFiles.filter(file => {
    if (file.is_folder) return false;
    
    const documentTypes = ['docx', 'pdf', 'txt', 'rtf', 'doc', 'odt'];
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

function loginWithVenmail() {
  const redirectUri = encodeURIComponent(
    `${window.location.origin}/oauth/callback`
  );
  localStorage.setItem("loginRedirect", "/docs");
  window.location.href = authStore.getAuthUrl(redirectUri);
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
  console.log('Upload completed:', files);
  toast.success(`Successfully uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`);
}

function handleSelect(id: string | undefined, event?: MouseEvent) {
  if (!id) return;

  // Handle multi-select with Ctrl/Cmd key
  if (event?.ctrlKey || event?.metaKey) {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  }
  // Normal single select
  else {
    selectedFiles.value = new Set([id]);
  }
}

function openFile(id: string) {
  router.push(`/docs/${id}`);
}

async function handleBulkDelete() {
  try {
    const promises = Array.from(selectedFiles.value).map(id => fileStore.deleteFile(id));
    await Promise.all(promises);
    selectedFiles.value.clear();
    toast.success(`Successfully deleted ${promises.length} document${promises.length > 1 ? 's' : ''}`);
  } catch (error) {
    console.error('Error deleting documents:', error);
    toast.error('Failed to delete some documents');
  }
}

function handleBulkDownload() {
  console.log('Download documents:', Array.from(selectedFiles.value));
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

onMounted(async () => {
  document.title = "Documents";
  
  if (authStore.getToken()) {
    // Load documents if not already loaded
    if (fileStore.allFiles.length === 0) {
      await fileStore.loadDocuments();
    }
  }
});
</script>

<style scoped>
.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden;
  @apply bg-gray-200 dark:bg-gray-700;
}

.loading-progress {
  @apply h-full bg-primary-600 dark:bg-primary-500;
  width: 30%;
  animation: loading 2s infinite ease-in-out;
}

.empty-state {
  @apply flex flex-col items-center justify-center p-16 text-center;
}

.empty-icon-wrapper {
  @apply flex items-center justify-center w-20 h-20 rounded-full mb-6;
  @apply bg-gray-100 dark:bg-gray-700;
}

.empty-icon {
  @apply w-10 h-10 text-primary-600 dark:text-primary-500;
}

.empty-title {
  @apply text-xl font-bold mb-2;
  @apply text-gray-800 dark:text-gray-100;
}

.empty-description {
  @apply text-sm mb-8 max-w-md;
  @apply text-gray-500 dark:text-gray-400;
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
</style> 