<template>
  <div v-if="isAuthenticated" :class="homeContainerClass">
    <div v-if="fileStore.isSyncing" class="loading-bar">
      <div class="loading-progress"></div>
    </div>

    <div class="flex-1 flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-6 overflow-hidden">
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
          <div class="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <span>{{ sortedItems.length }} items</span>
            <span v-if="selectedFiles.size > 0">&middot; {{ selectedFiles.size }} selected</span>
          </div>
        </template>

        <template #extra>
          <div class="flex flex-col sm:flex-row md:flex-row lg:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto md:w-auto lg:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" class="border-slate-200 bg-white/80 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800">
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

            <div class="flex items-center gap-1 rounded-[0.65rem] border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-700/70 dark:bg-slate-800/70">
              <Button
                v-for="option in viewControls"
                :key="option.value"
                variant="ghost"
                size="sm"
                :class="option.active ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
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
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 p-2">
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

      <section class="workspace-command-panel">
        <div class="ai-briefing">
          <div class="flex items-start gap-3">
            <div class="ai-briefing-icon">
              <BrainCircuit class="h-6 w-6" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xs font-extrabold uppercase text-cyan-700 dark:text-cyan-300">
                  Venmail AI
                </p>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                  {{ fileStore.isOnline ? 'Synced' : 'Offline ready' }}
                </span>
              </div>
              <h1 class="workspace-title mt-2 text-slate-950 dark:text-white">
                Your workspace is ready for the next move.
              </h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Create, analyze, summarize, and organize office work from the same command surface.
              </p>
            </div>
          </div>

          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              v-for="suggestion in aiSuggestions"
              :key="suggestion"
              type="button"
              class="ai-suggestion"
            >
              <Sparkles class="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <span>{{ suggestion }}</span>
            </button>
          </div>
        </div>

        <div class="workspace-side-panel">
          <div class="grid grid-cols-3 gap-2">
            <div v-for="stat in workspaceStats" :key="stat.label" class="workspace-stat">
              <span class="block text-xl font-extrabold text-slate-950 dark:text-white">{{ stat.value }}</span>
              <span class="mt-1 block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{{ stat.label }}</span>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <Button
              v-for="action in quickCreateActions"
              :key="action.label"
              variant="outline"
              class="quick-create-button"
              @click="action.onClick"
            >
              <component :is="action.icon" class="h-4 w-4" />
              <span>{{ action.label }}</span>
            </Button>
          </div>
        </div>
      </section>

      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg border overflow-hidden',
          'bg-white/90 border-slate-200/80 dark:bg-slate-900/80 dark:border-slate-700/80'
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

          <div class="p-2 sm:p-4 lg:p-6">
            <div
              :class="{
                'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4': viewMode === 'grid',
                'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3': viewMode === 'thumbnail',
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
  FolderKanban,
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
  TableIcon,
  BrainCircuit,
  Sparkles,
  Presentation
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

const workspaceStats = computed(() => {
  const files = fileStore.allFiles
  const folders = files.filter((file: FileData) => file.is_folder).length
  const docs = files.filter((file: FileData) =>
    ['doc', 'docx', 'txt', 'rtf', 'pdf'].includes((file.file_type || '').toLowerCase())
  ).length
  const sheets = files.filter((file: FileData) =>
    ['xls', 'xlsx', 'csv', 'ods'].includes((file.file_type || '').toLowerCase())
  ).length

  return [
    { label: 'Files', value: files.length },
    { label: 'Docs', value: docs },
    { label: 'Sheets', value: sheets || folders }
  ]
})

const aiSuggestions = [
  'Summarize selected files',
  'Turn uploads into a client deck',
  'Find stale documents',
  'Create a project brief'
]

const quickCreateActions = computed(() => [
  { label: 'Doc', icon: FileText, onClick: createNewDocument },
  { label: 'Sheet', icon: TableIcon, onClick: createNewSpreadsheet },
  { label: 'Slides', icon: Presentation, onClick: () => router.push('/slides/new') },
  { label: 'Form', icon: FolderKanban, onClick: () => router.push('/forms') }
])

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
  'bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.13),transparent_32%),linear-gradient(135deg,#f8fafc,#eef7f2_48%,#f7f3ea)]',
  'dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#111827_54%,#172033)]',
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
    const results = await Promise.all(Array.from(selectedFiles.value).map((id) => fileStore.moveToTrash(id)))
    if (results.some((success) => !success)) throw new Error('Failed to move one or more items to trash')
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

.workspace-command-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22rem;
  gap: 1rem;
}

.workspace-title {
  font-family: Onest, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1.5rem;
  font-weight: 720;
  line-height: 1.25;
  letter-spacing: 0;
}

.ai-briefing,
.workspace-side-panel {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.ai-briefing {
  padding: 1rem;
}

.workspace-side-panel {
  padding: 0.85rem;
}

.dark .ai-briefing,
.dark .workspace-side-panel {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.76);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
}

.ai-briefing-icon {
  display: flex;
  height: 3rem;
  width: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: #0f172a;
  color: #67e8f9;
}

.ai-suggestion {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.65rem;
  background: rgba(248, 250, 252, 0.9);
  padding: 0.65rem 0.8rem;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.25rem;
  color: #334155;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.ai-suggestion:hover {
  border-color: rgba(8, 145, 178, 0.36);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.dark .ai-suggestion {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(30, 41, 59, 0.72);
  color: #e2e8f0;
}

.workspace-stat {
  min-height: 4.25rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.65rem;
  background: rgba(248, 250, 252, 0.92);
  padding: 0.75rem;
}

.dark .workspace-stat {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(30, 41, 59, 0.66);
}

.quick-create-button {
  display: inline-flex;
  height: 2.65rem;
  justify-content: center;
  gap: 0.45rem;
  border-color: rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.78);
  font-weight: 700;
  color: #0f172a;
}

.dark .quick-create-button {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.64);
  color: #f8fafc;
}

@media (max-width: 1180px) {
  .workspace-command-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .workspace-command-panel {
    gap: 0.75rem;
  }

  .workspace-title {
    font-size: 1.375rem;
    line-height: 1.25;
  }

  .ai-briefing,
  .workspace-side-panel {
    border-radius: 0.65rem;
  }
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
