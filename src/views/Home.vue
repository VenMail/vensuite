<template>
  <div v-if="isAuthenticated" :class="homeContainerClass">
    <div v-if="fileStore.isSyncing" class="loading-bar">
      <div class="loading-progress"></div>
    </div>

    <div class="flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-hidden">
      <WorkspaceTopBar
        :title="currentTitle"
        :subtitle="homeSubtitle"
        :breadcrumbs="breadcrumbs"
        :can-navigate-up="canNavigateUp"
        :actions="topBarActions"
        :has-selection="selectedFiles.size > 0"
        :selected-count="selectedFiles.size"
        @navigate-up="handleNavigateUp"
        @navigate-breadcrumb="handleBreadcrumbNavigate"
      >
        <template #stats>
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200">
            <span>{{ sortedItems.length }} items</span>
            <span v-if="selectedFiles.size > 0">• {{ selectedFiles.size }} selected</span>
          </div>
        </template>

        <template #extra>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" class="border-gray-300 dark:border-gray-600 dark:text-gray-100">
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

        <template #action-new>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" :class="actionIconClass">
                <Plus class="h-5 w-5 text-primary-600" />
              </Button>
            </DialogTrigger>
            <DialogContent
              :class="['rounded-lg shadow-2xl border', 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700']"
            >
              <DialogHeader>
                <DialogTitle class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  {{ $t('Views.Home.heading.choose_a_template') }}
                </DialogTitle>
              </DialogHeader>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                <Button
                  variant="outline"
                  :class="['h-24 flex flex-col items-center justify-center', 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-400']"
                  @click="createNewDocument"
                >
                  <FileText class="w-8 h-8 text-primary-600" />
                  <span class="mt-2 text-sm font-medium">{{ $t('Commons.button.new_document') }}</span>
                </Button>
                <Button
                  variant="outline"
                  :class="['h-24 flex flex-col items-center justify-center', 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-400']"
                  @click="createNewSpreadsheet"
                >
                  <TableIcon class="w-8 h-8 text-primary-600" />
                  <span class="mt-2 text-sm font-medium">{{ $t('Commons.button.new_spreadsheet') }}</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </template>
      </WorkspaceTopBar>

      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg shadow-sm border',
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        ]"
      >
        <div v-if="sortedItems.length > 0">
          <div
            v-if="viewMode === 'list'"
            :class="['flex items-center gap-3 px-4 py-3 border-b', 'border-gray-200 dark:border-gray-700']"
          >
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @change="toggleSelectAll"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ isAllSelected ? $t('Commons.text.select_file') : $t('Commons.label.select_all') }}
            </span>
          </div>

          <div
            v-else
            :class="['flex items-center justify-between px-4 py-3 border-b', 'border-gray-200 dark:border-gray-700']"
          >
            <Button
              variant="ghost"
              size="sm"
              @click="toggleSelectAll"
              class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isSomeSelected"
                @click.stop
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ isAllSelected ? $t('Commons.text.select_file') : $t('Commons.label.select_all') }}
              </span>
            </Button>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ sortedItems.length }} {{ sortedItems.length === 1 ? 'item' : 'items' }}
            </span>
          </div>

          <div class="p-2 sm:p-4">
            <div
              :class="{
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4': viewMode === 'grid',
                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2': viewMode === 'thumbnail',
                'space-y-1': viewMode === 'list'
              }"
            >
              <FileItem
                v-for="item in sortedItems"
                :key="item.id"
                :file="item"
                :view-mode="viewMode"
                :is-selected="selectedFiles.has(item.id || '')"
                @select-file="handleSelect"
                @open-file="openFile"
                @contextmenu-file="(e) => openContextMenu(e)"
              />
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon-wrapper">
            <FolderOpen class="empty-icon" />
          </div>
          <h3 class="empty-title">{{ $t('Views.Home.heading.no_files_found') }}</h3>
          <p class="empty-description">{{ $t('Views.Home.text.get_started_by_creating') }}</p>
          <div class="empty-actions">
            <Button class="bg-primary-600 hover:bg-primary-700" @click="createNewDocument">
              <Plus class="mr-2 h-4 w-4" />
              {{ $t('Commons.button.new_document') }}
            </Button>
            <Button class="bg-green-600 hover:bg-green-700" @click="createNewSpreadsheet">
              <Plus class="mr-2 h-4 w-4" />
              {{ $t('Commons.button.new_spreadsheet') }}
            </Button>
            <Button variant="outline" class="border-gray-300 hover:border-gray-400" @click="openUploadDialog">
              <Upload class="mr-2 h-4 w-4" />
              {{ $t('Commons.button.upload_files') }}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>

    <FileUploader
      v-if="isUploadDialogOpen"
      @close="isUploadDialogOpen = false"
      @upload="handleUploadComplete"
      :folder-id="currentFolderId"
      :file-type-filter="'all'"
    />

    <FileContextMenu
      v-if="contextMenuState.visible"
      :state="contextMenuState"
      :actions="contextMenuActions"
    />

    <!-- Media Viewer -->
    <MediaViewer
      :is-open="isMediaViewerOpen"
      :current-file="currentMediaFile"
      :files="viewableMediaFiles"
      :current-index="currentMediaIndex"
      @close="closeMediaViewer"
      @download="handleMediaDownload"
      @navigate="handleMediaViewerNavigate"
    />
  </div>

  <Landing v-else />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/auth'
import { useFileStore } from '@/store/files'
import { useExplorerNavigation } from '@/composables/useExplorerNavigation'
import {
  useFileExplorer,
  type ContextMenuAction,
  type ContextMenuBuilderContext
} from '@/composables/useFileExplorer'
import { toast } from '@/composables/useToast'
import axios from 'axios'
import {
  Plus,
  FolderOpen,
  Upload,
  FolderPlus as FolderPlusIcon,
  FileText,
  ChevronDown,
  ArrowUpDown,
  Grid,
  List,
  LayoutGrid,
  Check,
  Edit,
  Download,
  Share2,
  Trash2,
  X,
  TableIcon
} from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import FileItem from '@/components/FileItem.vue'
import FileContextMenu from '@/components/FileContextMenu.vue'
import FileUploader from '@/components/FileUploader.vue'
import WorkspaceTopBar from '@/components/layout/WorkspaceTopBar.vue'
import MediaViewer from '@/components/media/MediaViewer.vue'
import Landing from './Landing.vue'
import type { FileData } from '@/types'
import { useMediaTypes } from '@/composables/useMediaTypes'

const router = useRouter()
const authStore = useAuthStore()
const fileStore = useFileStore()
const { isAuthenticated } = storeToRefs(authStore)
const { isMediaFile, isViewable } = useMediaTypes()

type HomeViewMode = 'grid' | 'list' | 'thumbnail'
type HomeSort = 'name' | 'date'

type SortOption = { value: HomeSort; label: string }
type ViewModeOption = { value: HomeViewMode; icon?: unknown; label: string; active: boolean }

const viewMode = ref<HomeViewMode>('grid')
const sortBy = ref<HomeSort>('date')
const isUploadDialogOpen = ref(false)

// Media viewer state
const isMediaViewerOpen = ref(false)
const currentMediaFile = ref<FileData | null>(null)
const currentMediaIndex = ref(0)

const {
  currentFolderId,
  breadcrumbs,
  currentTitle,
  canNavigateUp,
  openFolder,
  navigateToBreadcrumb,
  navigateUp,
  refresh,
  initialize
} = useExplorerNavigation({
  rootTitle: 'All Files',
  onNavigate: () => clearSelection()
})

const homeSubtitle = computed(() => 'All files')

const itemsInCurrentFolder = computed(() => {
  const folderId = currentFolderId.value
  return fileStore.allFiles.filter((f: FileData) =>
    folderId ? f.folder_id === folderId : !f.folder_id
  )
})

// Filter media files that can be viewed in the media viewer
const viewableMediaFiles = computed(() => {
  return itemsInCurrentFolder.value.filter(file => 
    !file.is_folder && isMediaFile(file.file_type) && isViewable(file.file_type)
  )
})

const sortedItems = computed(() => {
  const list = [...itemsInCurrentFolder.value]
  if (sortBy.value === 'date') {
    return list.sort((a, b) => {
      const aTime = new Date(a.last_viewed || a.updated_at || a.created_at || 0).getTime()
      const bTime = new Date(b.last_viewed || b.updated_at || b.created_at || 0).getTime()
      return bTime - aTime
    })
  }
  return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
})

function buildContextMenuActions({
  selectedIds,
  selectedFiles: selectedFileItems,
  close
}: ContextMenuBuilderContext): ContextMenuAction[] {
  if (selectedIds.length === 0) return []
  const hasFiles = selectedFileItems.some((f) => f && !f.is_folder)
  const actions: ContextMenuAction[] = []

  if (selectedIds.length === 1) {
    actions.push(
      {
        label: 'Open',
        icon: FolderOpen,
        action: () => {
          if (selectedIds[0]) openFile(selectedIds[0])
          close()
        }
      },
      {
        label: 'Rename',
        icon: Edit,
        action: () => {
          handleRename()
          close()
        }
      }
    )
  }

  if (hasFiles) {
    actions.push({
      label: `Download ${selectedIds.length > 1 ? `(${selectedIds.length})` : ''}`.trim(),
      icon: Download,
      action: () => {
        handleBulkDownload()
        close()
      }
    })
  }

  actions.push({
    label: `Delete ${selectedIds.length > 1 ? `(${selectedIds.length})` : ''}`.trim(),
    icon: Trash2,
    action: () => {
      handleBulkDelete()
      close()
    }
  })

  if (selectedIds.length === 1) {
    actions.push({
      label: 'Share',
      icon: Share2,
      action: () => {
        close()
      }
    })
  }

  return actions
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
  closeContextMenu
} = useFileExplorer({
  getFiles: () => sortedItems.value,
  buildContextMenuActions
})

const sortOptions: SortOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' }
]
const sortLabel = computed(() => (sortBy.value === 'date' ? 'Date' : 'Name'))

const viewControls = computed<ViewModeOption[]>(() => [
  { value: 'grid', icon: Grid, label: 'Grid', active: viewMode.value === 'grid' },
  { value: 'list', icon: List, label: 'List', active: viewMode.value === 'list' },
  { value: 'thumbnail', icon: LayoutGrid, label: 'Thumbnail', active: viewMode.value === 'thumbnail' }
])

const actionIconClass =
  'relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700'

const firstSelectedId = computed(() =>
  selectedFiles.value.size > 0 ? Array.from(selectedFiles.value)[0] : null
)

const topBarActions = computed(() => {
  const actions = [
    {
      key: 'create-folder',
      icon: FolderPlusIcon,
      component: Button,
      props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
      onClick: createNewFolder,
      requiresSelection: false
    },
    {
      key: 'upload',
      icon: Upload,
      component: Button,
      props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
      onClick: openUploadDialog,
      requiresSelection: false
    },
    {
      key: 'new',
      component: 'div',
      slot: 'new',
      requiresSelection: false
    }
  ]

  if (selectedFiles.value.size > 0) {
    if (selectedFiles.value.size === 1 && firstSelectedId.value) {
      actions.push(
        {
          key: 'open',
          icon: FolderOpen,
          component: Button,
          props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
          onClick: () => openFile(firstSelectedId.value as string),
          requiresSelection: true
        },
        {
          key: 'rename',
          icon: Edit,
          component: Button,
          props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
          onClick: handleRename,
          requiresSelection: true
        }
      )
    }
    actions.push(
      {
        key: 'download',
        icon: Download,
        component: Button,
        props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
        onClick: handleBulkDownload,
        requiresSelection: true
      },
      {
        key: 'delete',
        icon: Trash2,
        component: Button,
        props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
        onClick: handleBulkDelete,
        requiresSelection: true
      },
      {
        key: 'clear',
        icon: X,
        component: Button,
        props: { variant: 'ghost' as const, size: 'icon' as const, class: actionIconClass },
        onClick: () => clearSelection(),
        requiresSelection: true
      }
    )
  }

  return actions
})

const homeContainerClass = computed(() => [
  'h-screen text-gray-900 transition-colors duration-200',
  'bg-gradient-to-br from-gray-50 to-gray-100',
  'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800',
  'flex flex-col'
])

function handleSort(sort: HomeSort) {
  sortBy.value = sort
  clearSelection()
}

function handleViewChange(mode: HomeViewMode) {
  viewMode.value = mode
}

async function handleNavigateUp() {
  await navigateUp()
}

async function handleBreadcrumbNavigate(index: number) {
  await navigateToBreadcrumb(index)
}

function createNewDocument() {
  router.push('/docs/new')
}

function createNewSpreadsheet() {
  router.push('/sheets/new')
}

async function createNewFolder() {
  try {
    const result = await fileStore.makeFolder({
      title: 'New Folder',
      is_folder: true,
      folder_id: currentFolderId.value,
      file_type: 'folder'
    } as FileData)
    if (result?.id) {
      toast.success('Folder created')
      await refresh()
    }
  } catch {
    toast.error('Failed to create folder')
  }
}

function openUploadDialog() {
  isUploadDialogOpen.value = true
}

async function handleUploadComplete() {
  isUploadDialogOpen.value = false
  await refresh()
}

async function openFile(id: string) {
  const file = fileStore.allFiles.find((f) => f.id === id)
  if (!file) return
  if (file.is_folder) {
    await openFolder(id, file.title)
    return
  }
  
  // Check if it's a viewable media file
  if (isMediaFile(file.file_type) && isViewable(file.file_type)) {
    const index = viewableMediaFiles.value.findIndex(f => f.id === id)
    if (index !== -1) {
      currentMediaFile.value = file
      currentMediaIndex.value = index
      isMediaViewerOpen.value = true
      return
    }
  }
  
  const ext = file.file_type?.toLowerCase()
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
    router.push(`/docs/${id}`)
  } else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext || '')) {
    router.push(`/sheets/${id}`)
  } else if (['ppt', 'pptx'].includes(ext || '')) {
    router.push(`/slides/${id}`)
  } else if (ext === 'pdf' && (file.file_public_url || file.file_url)) {
    window.open(file.file_public_url || file.file_url || '', '_blank', 'noopener,noreferrer')
  } else {
    router.push(`/docs/${id}`)
  }
}

async function handleBulkDelete() {
  try {
    await Promise.all(Array.from(selectedFiles.value).map((id) => fileStore.moveToTrash(id)))
    clearSelection()
    await refresh()
    toast.success('Items moved to trash')
  } catch {
    toast.error('Failed to delete some items')
  }
}

function handleBulkDownload() {
  const files = Array.from(selectedFiles.value)
    .map(id => sortedItems.value.find(f => f.id === id))
    .filter((file): file is FileData => Boolean(file && !file.is_folder))

  files.forEach(file => {
    const url = file.download_url || file.file_public_url || file.file_url
    if (!url) return

    const token = fileStore.getToken()
    const isApiDownload = typeof url === 'string' && url.includes('/app-files/') && url.includes('/download')

    if (token && isApiDownload) {
      axios
        .get(url, {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const blob = res.data as Blob
          const blobUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = file.file_name || file.title
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(blobUrl)
        })
        .catch(() => {
          toast.error(`Failed to download ${file.title}`)
        })
      return
    }

    const link = document.createElement('a')
    link.href = url
    link.download = file.file_name || file.title
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  })
  
  if (files.length > 0) {
    toast.success(`Downloading ${files.length} file(s)`)
  }
}

function handleRename() {
  if (selectedFiles.value.size === 1) {
    const id = Array.from(selectedFiles.value)[0]
    const el = document.getElementById(`fileItem-${id}`)
    if (el) {
      el.dispatchEvent(new CustomEvent('start-rename'))
    }
  }
}

// Media viewer handlers
function closeMediaViewer() {
  isMediaViewerOpen.value = false
  currentMediaFile.value = null
  currentMediaIndex.value = 0
}

function handleMediaViewerNavigate(index: number) {
  if (index >= 0 && index < viewableMediaFiles.value.length) {
    currentMediaIndex.value = index
    currentMediaFile.value = viewableMediaFiles.value[index]
  }
}

function handleMediaDownload(file: FileData) {
  const url = file.download_url || file.file_public_url || file.file_url
  if (!url) return

  const token = fileStore.getToken()
  const isApiDownload = typeof url === 'string' && url.includes('/app-files/') && url.includes('/download')

  if (token && isApiDownload) {
    axios
      .get(url, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const blob = res.data as Blob
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = file.file_name || file.title
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
        toast.success(`Downloaded ${file.title}`)
      })
      .catch(() => {
        toast.error('Failed to download file')
      })
    return
  }

  const link = document.createElement('a')
  link.href = url
  link.download = file.file_name || file.title
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast.success(`Downloaded ${file.title}`)
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.file-item') && !target.closest('.context-menu')) {
    clearSelection()
  }
  if (!target.closest('#context-menu')) {
    closeContextMenu()
  }
}

onMounted(async () => {
  document.title = currentTitle.value
  document.addEventListener('click', handleOutsideClick)
  
  const offline = fileStore.loadOfflineDocuments()
  if (!fileStore.isOnline) {
    fileStore.allFiles = offline
  }
  if (fileStore.isOnline) {
    const online = await fileStore.loadDocuments(true)
    const merged = new Map<string, FileData>()
    offline.forEach((d) => d.id && merged.set(d.id, d))
    online.forEach((d) => d.id && merged.set(d.id, d))
    fileStore.allFiles = Array.from(merged.values())
  }
  await initialize()
})

watch(currentTitle, (t) => {
  document.title = t
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
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
  padding: 2rem;
  text-align: center;
}
@media (min-width: 640px) {
  .empty-state {
    padding: 4rem;
  }
}
.empty-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  margin-bottom: 1.5rem;
  background-color: rgb(243 244 246);
}
@media (min-width: 640px) {
  .empty-icon-wrapper {
    width: 5rem;
    height: 5rem;
  }
}
.dark .empty-icon-wrapper {
  background-color: rgb(55 65 81);
}
.empty-icon {
  width: 2rem;
  height: 2rem;
  color: rgb(37 99 235);
}
@media (min-width: 640px) {
  .empty-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
}
.dark .empty-icon {
  color: rgb(59 130 246);
}
.empty-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: rgb(17 24 39);
}
@media (min-width: 640px) {
  .empty-title {
    font-size: 1.25rem;
  }
}
.dark .empty-title {
  color: rgb(243 244 246);
}
.empty-description {
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  max-width: 28rem;
  color: rgb(107 114 128);
}
@media (min-width: 640px) {
  .empty-description {
    margin-bottom: 2rem;
  }
}
.dark .empty-description {
  color: rgb(156 163 175);
}
.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  width: 100%;
}
@media (min-width: 640px) {
  .empty-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    width: auto;
  }
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
