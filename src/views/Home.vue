<script setup lang="ts">
import { onMounted, onUnmounted, watchEffect, watch } from "vue"
import { useExplorerNavigation } from "@/composables/useExplorerNavigation"
import { useMobileFirst } from "@/composables/useMobileFirst"
import { useFileManager } from "@/composables/useFileManager"
import { useMobileFileManager } from "@/composables/useMobileFileManager"
import { useHomeUIState } from "@/composables/useHomeUIState"
import { useFileOperations } from "@/composables/useFileOperations"
import { toast } from "@/composables/useToast"
import {
  Plus,
  FolderOpen,
  Upload,
  FolderPlus as FolderPlusIcon,
  FileText,
  Loader,
} from "lucide-vue-next"
import { storeToRefs } from "pinia"
import { useAuthStore } from "@/store/auth"
import { useFileStore } from "@/store/files"
import Button from "@/components/ui/button/Button.vue"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileData } from "@/types"
import MediaViewer from "@/components/media/MediaViewer.vue"
import FileContextMenu from "@/components/FileContextMenu.vue"
import FileUploader from "@/components/FileUploader.vue"
import FileItem from "@/components/FileItem.vue"
import Landing from "./Landing.vue"

// Mobile components
import MobileHeader from "@/components/home/MobileHeader.vue"
import MobileBottomNav from "@/components/home/MobileBottomNav.vue"

const authStore = useAuthStore()
const fileStore = useFileStore()
const { isAuthenticated } = storeToRefs(authStore)

// Initialize composables
const { isMobile } = useMobileFirst()
const fileManager = useFileManager()
const mobileFileManager = useMobileFileManager()
const uiState = useHomeUIState()
const fileOperations = useFileOperations()
const explorer = useExplorerNavigation({
  rootTitle: 'All Files',
  onNavigate: () => fileManager.clearSelection(),
})

// Initialize explorer navigation
const {
  currentFolderId,
  breadcrumbs,
  currentTitle,
  canNavigateUp,
  navigateToBreadcrumb,
  navigateUp,
  refresh,
  initialize,
  isLoading: explorerLoading,
} = explorer

// File upload handler
const handleUploadComplete = (_files: FileData[]) => {
  fileManager.isUploadDialogOpen.value = false
  refresh()
}

// Mobile handlers
const handleMobileTabNavigation = (tab: 'files' | 'recent' | 'search' | 'settings') => {
  mobileFileManager.handleMobileTabNavigation(tab, (show: boolean) => {
    fileManager.showRecentFiles.value = show
  })
}

// Sync mobile search with file manager
watch(() => mobileFileManager.mobileSearchQuery.value, (query: string) => {
  fileManager.searchValue.value = query
})

const handleExpandAll = () => {
  // Expand all folders in the current view
  fileManager.sortedItems.value.forEach(item => {
    if (item.is_folder) {
      // Logic to expand folder - this would depend on your folder expansion implementation
      console.log('Expanding folder:', item.title)
    }
  })
  toast.info('Expanding all folders...')
}

// Lifecycle hooks
onMounted(async () => {
  window.addEventListener("resize", () => {}) // Handled by useMobileFirst
  window.addEventListener("click", fileOperations.handleOutsideClick)
  window.addEventListener("keydown", fileOperations.handleEscapeKey)

  watchEffect(async () => {
    await uiState.handleAttachmentImport(refresh, fileOperations.openFile)
  })

  if (authStore.getToken()) {
    const offlineDocs = fileStore.loadOfflineDocuments()
    if (!fileStore.isOnline) {
      fileStore.allFiles = offlineDocs
    }

    if (import.meta.env.DEV) {
      const filesWithMissingTypes = offlineDocs.filter(
        (doc) => !doc.file_type && !doc.is_folder
      )
      if (filesWithMissingTypes.length > 0) {
        console.warn(
          "Home: Found files with missing file_type:",
          filesWithMissingTypes.map((doc) => ({
            id: doc.id,
            title: doc.title,
          }))
        )
      }
    }

    if (fileStore.isOnline) {
      const onlineDocs = await fileStore.loadDocuments(true)
      const mergedFiles = new Map<string, FileData>()

      offlineDocs.forEach((doc) => {
        if (doc.id) {
          mergedFiles.set(doc.id, doc)
        }
      })

      onlineDocs.forEach((doc) => {
        if (doc.id) {
          mergedFiles.set(doc.id, doc)
        }
      })

      fileStore.allFiles = Array.from(mergedFiles.values())
    }

    await initialize()
  }
})

onUnmounted(() => {
  window.removeEventListener("resize", () => {})
  window.removeEventListener("click", fileOperations.handleOutsideClick)
  window.removeEventListener("keydown", fileOperations.handleEscapeKey)
})
</script>

<template>
  <template v-if="isAuthenticated">
    <div class="home-container">
      <!-- Mobile Layout -->
      <template v-if="isMobile">
        <div class="mobile-layout">
          <!-- Mobile Header -->
          <MobileHeader
            :title="fileManager.showRecentFiles.value ? $t('Commons.heading.recent_files') : currentTitle"
            :subtitle="fileManager.selectedFiles.value.size > 0 ? `${fileManager.selectedFiles.value.size} selected` : undefined"
            :show-back-button="canNavigateUp"
            :show-search="mobileFileManager.showMobileSearch.value"
            :search-query="mobileFileManager.mobileSearchQuery.value"
            :breadcrumbs="breadcrumbs.map(b => ({ id: b.id || undefined, title: b.title }))"
            :current-folder="currentTitle"
            :selected-count="fileManager.selectedFiles.value.size"
            @navigate-back="navigateUp"
            @toggle-search="mobileFileManager.toggleMobileSearch"
            @update:search-query="mobileFileManager.mobileSearchQuery.value = $event"
            @clear-search="mobileFileManager.clearMobileSearch"
            @create-folder="() => fileManager.createNewFolder(currentFolderId)"
            @upload-file="fileManager.isUploadDialogOpen.value = true"
            @create-document="fileManager.createNewFile('documents')"
            @toggle-view-mode="fileManager.toggleViewMode"
            @navigate-to-breadcrumb="navigateToBreadcrumb"
            @clear-selection="fileManager.clearSelection"
          />

          <!-- Mobile Content -->
          <div class="mobile-content">
            <!-- Empty State -->
            <div v-if="fileManager.sortedItems.value.length === 0 && !explorerLoading && !uiState.isLoading.value" class="empty-state">
              <div class="empty-state-content">
                <div class="empty-icon">
                  <FolderOpen class="h-16 w-16" />
                </div>
                <h3 class="empty-title">{{ $t('Views.Home.heading.no_files_found') }}</h3>
                <p class="empty-description">{{ $t('Views.Home.text.get_started_by_creating') }}</p>
                
                <div class="empty-actions">
                  <Button @click="async () => { await fileManager.createNewFile('documents') }" class="w-full mb-2">
                    <FileText class="h-4 w-4 mr-2" />
                    {{$t('Commons.button.new_document')}}
                  </Button>
                  <Button @click="fileManager.isUploadDialogOpen.value = true" variant="outline" class="w-full">
                    <Upload class="h-4 w-4 mr-2" />
                    {{$t('Commons.button.upload_files')}}
                  </Button>
                </div>
              </div>
            </div>

            <!-- File Items -->
            <div v-else class="mobile-file-items">
              <FileItem
                v-for="item in fileManager.sortedItems.value"
                :key="item.id"
                :file="item"
                :view-mode="'grid'"
                :is-selected="!!(item.id && fileManager.selectedFiles.value.has(item.id))"
                :is-touch-device="true"
                @select-file="fileOperations.handleSelect"
                @open-file="fileOperations.openFile"
                @update-file="fileOperations.handleFileUpdated"
                @delete-file="fileOperations.handleFileDeleted"
                @contextmenu-file="fileOperations.handleFileContextMenu"
              />
            </div>

            <!-- Loading State -->
            <div v-if="explorerLoading || uiState.isLoading.value" class="loading-state">
              <div class="loading-content">
                <Loader class="animate-spin h-8 w-8 mb-4" />
                <p class="loading-text">{{ $t('Views.Home.text.loading_your_files') }}</p>
              </div>
            </div>
          </div>

          <!-- Mobile Bottom Navigation -->
          <MobileBottomNav
            :show-fab="mobileFileManager.showFab.value"
            :active-tab="mobileFileManager.activeMobileTab.value"
            :selected-count="fileManager.selectedFiles.value.size"
            @fab-click="async () => { await fileManager.createNewFile('documents') }"
            @create-document="async () => { await fileManager.createNewFile('documents') }"
            @create-spreadsheet="async () => { await fileManager.createNewFile('spreadsheets') }"
            @create-presentation="async () => { await fileManager.createNewFile('presentations') }"
            @create-folder="async () => { await fileManager.createNewFolder(currentFolderId) }"
            @upload-file="fileManager.isUploadDialogOpen.value = true"
            @expand-all="handleExpandAll"
            @navigate="handleMobileTabNavigation"
            @clear-selection="fileManager.clearSelection"
            @open-selected="fileOperations.handleBulkOpen"
            @share-selected="fileOperations.handleBulkShare"
            @download-selected="fileManager.bulkDownload"
            @delete-selected="fileManager.bulkDelete"
          />
        </div>
      </template>

      <!-- Desktop Layout -->
      <template v-else>
        <!-- File browser -->
        <div class="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
          <!-- Clean Desktop Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <!-- Breadcrumbs -->
              <nav aria-label="Breadcrumb" class="flex items-center text-sm">
                <template v-for="(crumb, idx) in breadcrumbs.slice(0, -1)" :key="crumb.id ?? 'root'">
                  <button class="text-primary-600 hover:underline" @click="navigateToBreadcrumb(idx)">
                    {{ crumb.title }}
                  </button>
                  <span v-if="idx < breadcrumbs.slice(0, -1).length - 1" class="mx-2 text-gray-400">/</span>
                </template>
                <span class="text-gray-600">{{ currentTitle }}</span>
              </nav>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                @click="async () => { await fileManager.createNewFolder(currentFolderId) }"
              >
                <FolderPlusIcon class="h-4 w-4 mr-2" />
                {{$t('Commons.text.folder')}}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="fileManager.isUploadDialogOpen.value = true"
              >
                <Upload class="h-4 w-4 mr-2" />
                {{$t('Commons.button.upload_2')}}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus class="h-4 w-4 mr-2" />
                    {{$t('Commons.button.new')}}
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
                        v-for="category in Object.keys(uiState.templates)"
                        :key="category"
                        :value="category"
                        class="data-[state=active]:text-primary-600 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                        {{ category }}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent v-for="(items, category) in uiState.templates" :key="category" :value="category" class="p-2">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                          v-for="template in items"
                          :key="template.name"
                          variant="outline"
                          class="h-24 flex flex-col items-center justify-center transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-400"
                          @click="async () => { await fileManager.createNewFile(category?.toLowerCase(), template.name) }">
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

          <!-- Content area -->
          <ScrollArea class="flex-1 min-h-0 rounded-lg shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div v-if="Object.keys(fileManager.groupedItems.value).length > 0 && fileManager.sortedItems.value.length > 0">
              <template v-for="(items, groupName) in fileManager.groupedItems.value" :key="groupName">
                <div class="p-2 sm:p-4">
                  <!-- Group header with Select All -->
                  <div class="flex items-center justify-between mb-3 px-2">
                    <h3 v-if="fileManager.groupByFileType.value" class="text-base font-semibold text-gray-700 dark:text-gray-100">
                      {{ uiState.formatGroupName(groupName) }}
                    </h3>

                    <!-- Select All controls -->
                    <div v-if="fileManager.sortedItems.value.length > 0" class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :id="`select-all-${groupName}`"
                        :checked="fileManager.isAllSelected.value"
                        :indeterminate="fileManager.isSomeSelected.value"
                        @change="fileManager.toggleSelectAll"
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
                      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4': fileManager.viewMode.value === 'grid',
                      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2': fileManager.viewMode.value === 'thumbnail',
                      'space-y-1': fileManager.viewMode.value === 'list',
                    }">
                    <FileItem
                      v-for="item in items"
                      :key="item.id"
                      :file="item"
                      :view-mode="fileManager.viewMode.value"
                      :is-selected="!!(item.id && fileManager.selectedFiles.value.has(item.id))"
                      @select-file="fileOperations.handleSelect"
                      @open-file="fileOperations.openFile"
                      @update-file="fileOperations.handleFileUpdated"
                      @delete-file="fileOperations.handleFileDeleted"
                      @contextmenu-file="fileOperations.handleFileContextMenu"
                    />
                  </div>
                </div>
              </template>
            </div>
            <template v-else-if="explorerLoading || uiState.isLoading.value">
              <div class="loading-state">
                <div class="flex flex-col items-center justify-center py-16 px-6">
                  <div class="loading-spinner"></div>
                  <p class="loading-text">{{$t('Views.Home.text.loading_your_files')}}</p>
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
                  {{ fileManager.searchValue.value ? $t('Views.Home.heading.no_matching_files_found') : $t('Views.Home.heading.no_files_found') }}
                </h3>
                <p class="text-center mb-8 max-w-md text-gray-600 dark:text-gray-400">
                  {{ fileManager.searchValue.value ? $t('Views.Home.text.try_adjusting_your_search') : $t('Views.Home.text.get_started_by_creating') }}
                </p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button @click="async () => { await fileManager.createNewFile('documents') }" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2">
                    <Plus class="mr-2 h-4 w-4" />
                    {{$t('Commons.button.new_document')}}
                  </Button>
                  <Button @click="async () => { await fileManager.createNewFile('spreadsheets') }" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
                    <Plus class="mr-2 h-4 w-4" />
                    {{$t('Commons.button.new_spreadsheet')}}
                  </Button>
                  <Button variant="outline" class="px-6 py-2 border-gray-300 dark:border-gray-600 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700" @click="fileManager.isUploadDialogOpen.value = true">
                    <Upload class="mr-2 h-4 w-4" />
                    {{$t('Commons.button.upload_file')}}
                  </Button>
                </div>
              </div>
            </template>
          </ScrollArea>
        </div>
      </template>
    </div>

    <!-- Context Menu and Dialogs (Common) -->
    <FileContextMenu
      v-if="fileOperations.contextMenuState.value.visible"
      :state="{
        visible: fileOperations.contextMenuState.value.visible,
        x: fileOperations.contextMenuState.value.x,
        y: fileOperations.contextMenuState.value.y,
        targetId: fileOperations.contextMenuState.value.fileId
      }"
      :actions="fileOperations.contextMenuActions.value" />

    <MediaViewer
      :is-open="fileManager.isViewerOpen.value"
      :current-file="fileManager.currentViewFile.value"
      :files="fileManager.viewableFiles.value"
      :current-index="fileManager.currentViewIndex.value"
      @close="fileManager.closeViewer"
      @download="() => fileManager.downloadFiles([fileManager.currentViewFile.value?.id!])"
      @navigate="(index: number) => {
        if (index > fileManager.currentViewIndex.value) {
          fileManager.navigateViewer('next')
        } else {
          fileManager.navigateViewer('prev')
        }
      }" />

    <FileUploader
      v-if="fileManager.isUploadDialogOpen.value"
      @close="fileManager.isUploadDialogOpen.value = false"
      @upload="handleUploadComplete"
      :folderId="currentFolderId"
      :fileTypeFilter="'all'" />
  </template>

  <!-- Landing for guests -->
  <template v-else>
    <Landing />
  </template>
</template>

<style scoped>
/* Mobile-first layout styles */
.home-container {
  height: 100vh;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

.mobile-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* Safe area support for iPhone X+ */
  padding-bottom: env(safe-area-inset-bottom);
}

.mobile-content {
  flex: 1;
  overflow: hidden;
  /* Safe area support for iPhone X+ */
  padding-top: env(safe-area-inset-top);
}

.mobile-file-items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

/* Empty state styles */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 0 1.5rem;
}

.empty-state-content {
  text-align: center;
  max-width: 24rem;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  border-radius: 9999px;
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.empty-title {
  font-size: 1.125rem;
  line-height: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.5rem;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Desktop layout styles (original) */
@media (min-width: 768px) {
  .home-container {
    display: flex;
    color: rgb(17 24 39);
    background: linear-gradient(to bottom right, rgb(243 244 246), rgb(229 231 235));
  }
}

@media (prefers-color-scheme: dark) {
  @media (min-width: 768px) {
    .home-container {
      background: linear-gradient(to bottom right, rgb(17 24 39), rgb(31 41 55));
      color: rgb(243 244 246);
    }
  }
}

/* Loading state */
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .mobile-layout {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}

/* Touch-friendly interactions */
@media (hover: none) and (pointer: coarse) {
  .mobile-layout * {
    -webkit-tap-highlight-color: transparent;
  }
}

/* Performance optimizations for mobile */
@media (max-width: 767px) {
  * {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
  
  .mobile-layout {
    will-change: transform;
  }
}
</style>
