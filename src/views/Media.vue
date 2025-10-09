<template>
  <div class="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-900 to-gray-800">
    <WorkspaceTopBar
      :title="currentTitle"
      :subtitle="mediaSubtitle"
      :breadcrumbs="breadcrumbs"
      :can-navigate-up="canNavigateUp"
      :actions="topBarActions"
      @navigate-up="handleNavigateUp"
      @navigate-breadcrumb="handleBreadcrumbNavigate"
    >
      <template #stats>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{{ sortedMediaFiles.length }} items</span>
          <span>•</span>
          <span>{{ totalSize }}</span>
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
                <Check v-if="currentSort === option.value" class="mr-2 h-4 w-4" />
                <span>{{ option.label }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                class="border-gray-300 border-gray-600 text-gray-100"
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
              @click="handleViewModeChange(option.value)"
            >
              <component v-if="option.icon" :is="option.icon" class="h-4 w-4" />
              <span v-else>{{ option.label }}</span>
            </Button>
          </div>
        </div>
      </template>
    </WorkspaceTopBar>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 flex flex-col mt-6">
      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg shadow-sm border mx-6 mb-6',
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        ]"
      >
        <!-- Select All Controls -->
        <div v-if="sortedMediaFiles.length > 0 || folderItems.length > 0" class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <!-- Select All header for list view -->
          <div
            v-if="viewMode === 'list'"
            class="flex items-center gap-3 px-6 py-3"
          >
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @change="handleSelectAll(!isAllSelected)"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ isAllSelected ? 'Deselect All' : 'Select All' }}
            </span>
          </div>

          <!-- Select All button for grid and thumbnail views -->
          <div
            v-else
            class="flex items-center justify-between px-6 py-3"
          >
            <Button
              variant="ghost"
              size="sm"
              @click="handleSelectAll(!isAllSelected)"
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
                {{ isAllSelected ? 'Deselect All' : 'Select All' }}
              </span>
            </Button>

            <!-- Show count of total files -->
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ filteredMediaFiles.length }} media file{{ filteredMediaFiles.length !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <MediaGrid
          :media-files="sortedMediaFiles"
          :view-mode="viewMode"
          :selected-files="selectedFiles"
          :grid-size="gridSize"
          :is-loading="navIsLoading"
          @select="handleSelect"
          @select-all="handleSelectAll"
          @open-file="openFile"
          @preview="handlePreview"
          @download="handleDownload"
          @rename="handleRename"
          @delete="handleDelete"
          @upload="openUploadDialog"
          @context-menu="({ id, x, y }) => openContextMenu({ id, x, y })"
        />
      </ScrollArea>
    </div>

    <!-- Upload Dialog -->
    <FileUploader
      v-if="isUploadDialogOpen"
      :file-type-filter="'media'"
      :folder-id="currentFolderId"
      @close="closeUploadDialog"
      @upload="handleUploadComplete"
    />

    <!-- Media Viewer -->
    <MediaViewer
      :is-open="isViewerOpen"
      :current-file="currentViewFile"
      :files="viewableFiles"
      :current-index="currentViewIndex"
      @close="closeViewer"
      @download="handleDownload"
      @navigate="handleViewerNavigate"
    />

    <!-- Rename Dialog -->
    <Dialog :open="isRenameDialogOpen" @update:open="setRenameDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>
            Enter a new name for "{{ fileToRename?.title }}"
          </DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <Input
            v-model="newFileName"
            placeholder="Enter new file name"
            @keyup.enter="confirmRename"
            class="w-full"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="setRenameDialogOpen(false)">
            Cancel
          </Button>
          <Button @click="confirmRename" :disabled="!newFileName.trim()">
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="isDeleteDialogOpen" @update:open="setDeleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Files</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {{ filesToDelete.length === 1 ? '"' + filesToDelete[0]?.title + '"' : filesToDelete.length + ' files' }}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="setDeleteDialogOpen(false)">
            Cancel
          </Button>
          <Button variant="destructive" @click="confirmDelete">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Context Menu -->
    <FileContextMenu
      v-if="contextMenuState.visible"
      :state="contextMenuState"
      :actions="contextMenuActions"
      :is-dark="false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useExplorerNavigation } from '@/composables/useExplorerNavigation'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'
import { useMediaTypes } from '@/composables/useMediaTypes'
import MediaGrid from '@/components/media/MediaGrid.vue'
import MediaViewer from '@/components/media/MediaViewer.vue'
import FileUploader from '@/components/FileUploader.vue'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useFileExplorer,
  type ContextMenuAction,
  type ContextMenuBuilderContext,
} from '@/composables/useFileExplorer'
import FileContextMenu from '@/components/FileContextMenu.vue'
import WorkspaceTopBar from '@/components/layout/WorkspaceTopBar.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { FileData } from '@/types'
import {
  LayoutGrid,
  Grid,
  List,
  Upload,
  Download,
  Trash2,
  FolderPlus as FolderPlusIcon,
  ArrowUpDown,
  ChevronDown,
  Filter,
  Check,
  Image as ImageIcon,
  Video,
  Volume2,
  FileIcon
} from 'lucide-vue-next'

const fileStore = useFileStore()
const { isMediaFile, isViewable, isImage, isVideo, isAudio, formatFileSize } = useMediaTypes()

type MediaViewMode = 'thumbnail' | 'grid' | 'list'
type MediaSort = 'name' | 'date' | 'size' | 'type'
type MediaFilter = 'all' | 'images' | 'videos' | 'audio'

type SortOption = {
  value: MediaSort
  label: string
}

type FilterOption = {
  value: MediaFilter
  label: string
  icon: any
  active: boolean
}

type ViewModeOption = {
  value: MediaViewMode
  icon?: any
  label?: any
  active: boolean
}

const viewMode = ref<MediaViewMode>('thumbnail')
const gridSize = ref<'small' | 'medium' | 'large'>('medium')
const searchQuery = ref('')
const currentFilter = ref<MediaFilter>('all')
const currentSort = ref<MediaSort>('date')

// Initialize explorer navigation
const {
  currentFolderId,
  breadcrumbs,
  explorerItems,
  currentTitle,
  canNavigateUp,
  openFolder,
  navigateToBreadcrumb,
  navigateUp,
  refresh,
  initialize,
  isLoading: navIsLoading,
} = useExplorerNavigation({
  rootTitle: 'Media',
  onNavigate: () => clearSelection(),
})

const mediaSubtitle = computed(() => {
  if (currentFilter.value === 'all') {
    return 'Browse all media files'
  }
  const label = currentFilter.value.charAt(0).toUpperCase() + currentFilter.value.slice(1)
  return `${label} files`
})

// Upload
const isUploadDialogOpen = ref(false)

// Viewer
const isViewerOpen = ref(false)
const currentViewFile = ref<FileData | null>(null)
const currentViewIndex = ref(0)

// Rename
const isRenameDialogOpen = ref(false)
const fileToRename = ref<FileData | null>(null)
const newFileName = ref('')

// Delete
const isDeleteDialogOpen = ref(false)
const filesToDelete = ref<FileData[]>([])

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
        label: "Preview",
        icon: "Eye",
        action: () => {
          const file = selectedFileItems[0];
          if (file) {
            handlePreview(file);
          }
          close();
        },
      },
      {
        label: "Rename",
        icon: "Edit",
        action: () => {
          handleRename(selectedFileItems[0]);
          close();
        },
      },
    );
  }

  if (hasFiles) {
    actions.push({
      label: `Download ${numSelected > 1 ? `(${numSelected})` : ""}`.trim(),
      icon: "Download",
      action: () => {
        handleBulkDownload();
        close();
      },
    });
  }

  actions.push({
    label: `Delete ${numSelected > 1 ? `(${numSelected})` : ""}`.trim(),
    icon: "Trash2",
    action: () => {
      handleBulkDelete();
      close();
    },
  });

  return actions;
}

// Include folders that contain media files
const folderItems = computed(() => {
  return explorerItems.value.filter(file => file.is_folder)
})

const {
  selectedFiles,
  isAllSelected,
  isSomeSelected,
  clearSelection,
  handleSelect,
  setAllSelected,
  handleContextMenu: openContextMenu,
  contextMenuState,
  contextMenuActions,
  closeContextMenu,
} = useFileExplorer({
  getFiles: () => combinedItems.value,
  buildContextMenuActions,
});

// Computed
const mediaFiles = computed(() => {
  return explorerItems.value.filter(file => {
    if (file.is_folder) return false
    return isMediaFile(file.file_type)
  })
})

const filteredMediaFiles = computed(() => {
  let files = [...mediaFiles.value]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    files = files.filter(file =>
      (file.title || '').toLowerCase().includes(query) ||
      file.file_type?.toLowerCase().includes(query)
    )
  }

  if (currentFilter.value !== 'all') {
    files = files.filter(file => {
      switch (currentFilter.value) {
        case 'images':
          return isImage(file.file_type)
        case 'videos':
          return isVideo(file.file_type)
        case 'audio':
          return isAudio(file.file_type)
        default:
          return true
      }
    })
  }

  return files
})

const sortedMediaFiles = computed(() => {
  const files = [...filteredMediaFiles.value]

  switch (currentSort.value) {
    case 'date':
      return files.sort((a, b) => {
        // Sort by most recently accessed (last_viewed), then updated_at, then created_at
        const dateA = new Date(a.last_viewed || a.updated_at || a.created_at || 0).getTime()
        const dateB = new Date(b.last_viewed || b.updated_at || b.created_at || 0).getTime()
        return dateB - dateA
      })
    case 'size':
      return files.sort((a, b) => {
        const sizeA = typeof a.file_size === 'string' ? parseInt(a.file_size) : (a.file_size || 0)
        const sizeB = typeof b.file_size === 'string' ? parseInt(b.file_size) : (b.file_size || 0)
        return sizeB - sizeA
      })
    case 'type':
      return files.sort((a, b) => (a.file_type || '').localeCompare(b.file_type || ''))
    default:
      return files.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }
})

const combinedItems = computed(() => [...folderItems.value, ...sortedMediaFiles.value])

const viewableFiles = computed(() => {
  return filteredMediaFiles.value.filter(file => isViewable(file.file_type))
})

const totalSize = computed(() => {
  const bytes = sortedMediaFiles.value.reduce((total, file) => {
    const size = typeof file.file_size === 'string' ? parseInt(file.file_size) : (file.file_size || 0)
    return total + size
  }, 0)
  return formatFileSize(bytes)
})

const sortOptions: SortOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' }
]

const sortLabel = computed(() => {
  switch (currentSort.value) {
    case 'date':
      return 'Date'
    case 'size':
      return 'Size'
    case 'type':
      return 'Type'
    default:
      return 'Name'
  }
})

const filterOptions = computed<FilterOption[]>(() => [
  {
    label: 'All',
    value: 'all',
    icon: FileIcon,
    active: currentFilter.value === 'all'
  },
  {
    label: 'Images',
    value: 'images',
    icon: ImageIcon,
    active: currentFilter.value === 'images'
  },
  {
    label: 'Videos',
    value: 'videos',
    icon: Video,
    active: currentFilter.value === 'videos'
  },
  {
    label: 'Audio',
    value: 'audio',
    icon: Volume2,
    active: currentFilter.value === 'audio'
  }
])

const activeFilterLabel = computed(() => {
  return filterOptions.value.find(option => option.value === currentFilter.value)?.label || 'All'
})

const viewControls = computed<ViewModeOption[]>(() => [
  {
    value: 'thumbnail',
    icon: LayoutGrid,
    active: viewMode.value === 'thumbnail'
  },
  {
    value: 'grid',
    icon: Grid,
    active: viewMode.value === 'grid'
  },
  {
    value: 'list',
    icon: List,
    active: viewMode.value === 'list'
  }
])

const actionClass = computed(() =>
  "relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
)

const topBarActions = computed(() => {
  const actions = [
    {
      key: 'create-folder',
      icon: FolderPlusIcon,
      component: Button,
      props: {
        variant: 'ghost',
        size: 'icon',
        class: actionClass.value
      },
      onClick: handleCreateFolder
    },
    {
      key: 'upload-media',
      icon: Upload,
      component: Button,
      props: {
        variant: 'ghost',
        size: 'icon',
        class: actionClass.value
      },
      onClick: openUploadDialog
    }
  ]

  if (selectedFiles.value.size > 0) {
    actions.push(
      {
        key: 'bulk-download',
        icon: Download,
        component: Button,
        props: {
          variant: 'ghost',
          size: 'icon',
          class: actionClass.value
        },
        onClick: handleBulkDownload
      },
      {
        key: 'bulk-delete',
        icon: Trash2,
        component: Button,
        props: {
          variant: 'ghost',
          size: 'icon',
          class: actionClass.value
        },
        onClick: handleBulkDelete
      }
    )
  }

  return actions
})

// Methods
const handleFilter = (filter: MediaFilter) => {
  currentFilter.value = filter
  clearSelection()
}

const handleSort = (sort: MediaSort) => {
  currentSort.value = sort
  clearSelection()
}

const handleViewModeChange = (mode: MediaViewMode) => {
  viewMode.value = mode
  clearSelection()
}

const handleNavigateUp = async () => {
  await navigateUp()
}

const handleBreadcrumbNavigate = async (index: number) => {
  await navigateToBreadcrumb(index)
}

const handleCreateFolder = async () => {
  try {
    const result = await fileStore.makeFolder({
      title: 'New Folder',
      is_folder: true,
      folder_id: currentFolderId.value,
      file_type: 'folder',
    } as FileData)
    if (result?.id) {
      toast.success('Folder created')
      await refresh()
    }
  } catch (error) {
    console.error('Error creating media folder:', error)
    toast.error('Failed to create folder')
  }
}

async function openFile(id: string) {
  const file = combinedItems.value.find((item) => item.id === id);
  if (!file) return;

  if (file.is_folder) {
    await openFolder(id, file.title);
    return;
  }

  // For media files, trigger preview
  handlePreview(file);
}

const handleSelectAll = (selected: boolean) => {
  setAllSelected(selected)
}

const handlePreview = (file: FileData) => {
  const index = viewableFiles.value.findIndex(f => f.id === file.id)
  if (index !== -1) {
    currentViewFile.value = file
    currentViewIndex.value = index
    isViewerOpen.value = true
  }
}

const closeViewer = () => {
  isViewerOpen.value = false
  currentViewFile.value = null
}

const handleViewerNavigate = (index: number) => {
  if (index >= 0 && index < viewableFiles.value.length) {
    currentViewIndex.value = index
    currentViewFile.value = viewableFiles.value[index]
  }
}

const handleDownload = (file: FileData) => {
  if (file.file_url) {
    const link = document.createElement('a')
    link.href = file.file_url
    link.download = file.title
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Downloaded ${file.title}`)
  }
}

const handleRename = (file: FileData) => {
  fileToRename.value = file
  newFileName.value = file.title
  isRenameDialogOpen.value = true
}

const setRenameDialogOpen = (open: boolean) => {
  isRenameDialogOpen.value = open
  if (!open) {
    fileToRename.value = null
    newFileName.value = ''
  }
}

const confirmRename = async () => {
  if (!fileToRename.value || !newFileName.value.trim()) return

  try {
    // Update file name
    const updatedFile = { ...fileToRename.value, title: newFileName.value.trim() }
    await fileStore.saveDocument(updatedFile)
    toast.success('File renamed successfully')
    setRenameDialogOpen(false)
  } catch (error) {
    toast.error('Failed to rename file')
  }
}

const handleDelete = (file: FileData) => {
  filesToDelete.value = [file]
  isDeleteDialogOpen.value = true
}

const handleBulkDelete = () => {
  const files = Array.from(selectedFiles.value)
    .map(id => combinedItems.value.find(f => f.id === id))
    .filter((file): file is FileData => Boolean(file && !file.is_folder))
  filesToDelete.value = files
  isDeleteDialogOpen.value = true
}

const setDeleteDialogOpen = (open: boolean) => {
  isDeleteDialogOpen.value = open
  if (!open) {
    filesToDelete.value = []
  }
}

const confirmDelete = async () => {
  try {
    for (const file of filesToDelete.value) {
      if (file.id) {
        await fileStore.moveToTrash(file.id)
        selectedFiles.value.delete(file.id)
      }
    }
    clearSelection()
    await refresh()
    toast.success(`Deleted ${filesToDelete.value.length} file(s)`)
    setDeleteDialogOpen(false)
  } catch (error) {
    toast.error('Failed to delete files')
  }
}

const handleBulkDownload = () => {
  const files = Array.from(selectedFiles.value)
    .map(id => sortedMediaFiles.value.find(f => f.id === id))
    .filter((file): file is FileData => Boolean(file && !file.is_folder))

  files.forEach(file => handleDownload(file))
}

const openUploadDialog = () => {
  isUploadDialogOpen.value = true
}
const closeUploadDialog = () => {
  isUploadDialogOpen.value = false
}

const handleUploadComplete = async (uploadedFiles: FileData[]) => {
  toast.success(`Uploaded ${uploadedFiles.length} file(s)`)
  closeUploadDialog()
  await refresh()
}

// Lifecycle
onMounted(async () => {
  try {
    await initialize()
    document.title = currentTitle.value
  } catch (error) {
    toast.error('Failed to load media files')
  }

  document.addEventListener("click", handleOutsideClick);
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
