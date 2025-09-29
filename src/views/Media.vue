<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Toolbar -->
    <MediaToolbar
      :selected-count="selectedFiles.size"
      :view-mode="viewMode"
      @search="handleSearch"
      @filter="handleFilter"
      @sort="handleSort"
      @view-mode="handleViewModeChange"
      @upload="openUploadDialog"
      @bulk-download="handleBulkDownload"
      @bulk-delete="handleBulkDelete"
    />

    <!-- Stats Bar -->
    <div class="px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-6 text-gray-600 dark:text-gray-400">
          <span>{{ filteredMediaFiles.length }} items</span>
          <span v-if="selectedFiles.size > 0">{{ selectedFiles.size }} selected</span>
          <span>{{ totalSize }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Badge v-if="currentFilter !== 'all'" variant="secondary">
            {{ currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1) }}
          </Badge>
          <Button
            v-if="selectedFiles.size > 0"
            variant="ghost"
            size="sm"
            @click="clearSelection"
          >
            Clear selection
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Select All Controls -->
      <div v-if="filteredMediaFiles.length > 0" class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
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
          v-else-if="viewMode === 'grid' || viewMode === 'thumbnail'"
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
        :media-files="filteredMediaFiles"
        :view-mode="viewMode"
        :selected-files="selectedFiles"
        :grid-size="gridSize"
        :is-loading="isLoading"
        @select="handleSelect"
        @select-all="handleSelectAll"
        @preview="handlePreview"
        @download="handleDownload"
        @rename="handleRename"
        @delete="handleDelete"
        @upload="openUploadDialog"
      />
    </div>

    <!-- Upload Dialog -->
    <FileUploader
      v-if="isUploadDialogOpen"
      :file-type-filter="'media'" 
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFileStore } from '@/store/files'
import { FileData } from '@/types'
import { toast } from '@/composables/useToast'
import { useMediaTypes } from '@/composables/useMediaTypes'
import MediaToolbar from '@/components/media/MediaToolbar.vue'
import MediaGrid from '@/components/media/MediaGrid.vue'
import MediaViewer from '@/components/media/MediaViewer.vue'
import FileUploader from '@/components/FileUploader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Badge from '@/components/ui/badge/Badge.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const fileStore = useFileStore()
const { isMediaFile, isViewable, isImage, isVideo, isAudio, formatFileSize } = useMediaTypes()

// State
const selectedFiles = ref<Set<string>>(new Set())
const viewMode = ref<'thumbnail' | 'grid' | 'list'>('thumbnail')
const gridSize = ref<'small' | 'medium' | 'large'>('medium')
const searchQuery = ref('')
const currentFilter = ref('all')
const currentSort = ref('name')
const isLoading = ref(false)

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

// Computed
const mediaFiles = computed(() => {
  return fileStore.allFiles.filter(file => {
    if (file.is_folder) return false
    return isMediaFile(file.file_type)
  })
})

const filteredMediaFiles = computed(() => {
  let files = [...mediaFiles.value]

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    files = files.filter(file => 
      file.title.toLowerCase().includes(query) ||
      file.file_type?.toLowerCase().includes(query)
    )
  }

  // Apply type filter
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

  // Apply sorting
  files.sort((a, b) => {
    switch (currentSort.value) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'date':
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime()
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime()
        return dateB - dateA
      case 'size':
        const sizeA = typeof a.file_size === 'string' ? parseInt(a.file_size) : (a.file_size || 0)
        const sizeB = typeof b.file_size === 'string' ? parseInt(b.file_size) : (b.file_size || 0)
        return sizeB - sizeA
      case 'type':
        return (a.file_type || '').localeCompare(b.file_type || '')
      default:
        return 0
    }
  })

  return files
})

const viewableFiles = computed(() => {
  return filteredMediaFiles.value.filter(file => isViewable(file.file_type))
})

const totalSize = computed(() => {
  const bytes = filteredMediaFiles.value.reduce((total, file) => {
    const size = typeof file.file_size === 'string' ? parseInt(file.file_size) : (file.file_size || 0)
    return total + size
  }, 0)
  return formatFileSize(bytes)
})

// Select all functionality - matching the sheets pattern
const isAllSelected = computed(() => {
  return filteredMediaFiles.value.length > 0 && 
         filteredMediaFiles.value.every(file => selectedFiles.value.has(file.id || ''));
});

const isSomeSelected = computed(() => {
  return selectedFiles.value.size > 0 && !isAllSelected.value;
});

// Methods
const handleSearch = (query: string) => {
  searchQuery.value = query
}

const handleFilter = (filter: string) => {
  currentFilter.value = filter
  clearSelection()
}

const handleSort = (sort: string) => {
  currentSort.value = sort
}

const handleViewModeChange = (mode: 'thumbnail' | 'grid' | 'list') => {
  viewMode.value = mode
}

// Updated handleSelect to match sheets pattern
const handleSelect = (id: string | undefined, event?: MouseEvent) => {
  if (!id) return
  
  // If Ctrl/Cmd is held, toggle selection of this item
  if (event?.ctrlKey || event?.metaKey) {
    if (selectedFiles.value.has(id)) {
      selectedFiles.value.delete(id);
    } else {
      selectedFiles.value.add(id);
    }
  }
  // If Shift is held, select range (basic implementation for now)
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

const handleSelectAll = (selected: boolean) => {
  if (selected) {
    filteredMediaFiles.value.forEach(file => {
      if (file.id) selectedFiles.value.add(file.id)
    })
  } else {
    clearSelection()
  }
}

const clearSelection = () => {
  selectedFiles.value.clear()
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
    .map(id => mediaFiles.value.find(f => f.id === id))
    .filter(Boolean) as FileData[]
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
        await fileStore.deleteFile(file.id)
        selectedFiles.value.delete(file.id)
      }
    }
    toast.success(`Deleted ${filesToDelete.value.length} file(s)`)
    setDeleteDialogOpen(false)
  } catch (error) {
    toast.error('Failed to delete files')
  }
}

const handleBulkDownload = () => {
  const files = Array.from(selectedFiles.value)
    .map(id => mediaFiles.value.find(f => f.id === id))
    .filter(Boolean) as FileData[]
  
  files.forEach(file => handleDownload(file))
}

const openUploadDialog = () => {
  isUploadDialogOpen.value = true
}

const closeUploadDialog = () => {
  isUploadDialogOpen.value = false
}

const handleUploadComplete = (uploadedFiles: FileData[]) => {
  toast.success(`Uploaded ${uploadedFiles.length} file(s)`)
  closeUploadDialog()
  // Files are already added to the store by the upload process, no need to reload all documents
}

// Lifecycle
onMounted(async () => {
  isLoading.value = true
  try {
    // Load only media files for better performance
    await fileStore.loadMediaFiles()
  } catch (error) {
    toast.error('Failed to load media files')
  } finally {
    isLoading.value = false
  }
})
</script>