<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
     
    <div class="flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {{$t('Commons.heading.select_file')}}
      </h1>
      <Button variant="ghost" size="sm" @click="cancel">
        <X class="h-4 w-4" />
      </Button>
    </div>

     
    <div class="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="flex flex-col lg:flex-row lg:items-center gap-3">
        <div class="relative flex-1 min-w-0 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            v-model="searchQuery"
            placeholder="Search files..."
            class="pl-10 pr-4"
            @input="handleSearch"
          />
        </div>

        <div class="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" class="shrink-0">
                <Filter class="h-4 w-4 mr-2" />
                {{ filterLabel }}
                <ChevronDown class="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="handleFilterChange('all')">
                <FileIcon class="h-4 w-4 mr-2" />
                {{$t('Commons.text.all_files')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleFilterChange('documents')">
                <FileText class="h-4 w-4 mr-2" />
                {{$t('Commons.text.documents')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleFilterChange('media')">
                <Image class="h-4 w-4 mr-2" />
                {{$t('Commons.text.media')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleFilterChange('sheets')">
                <FileSpreadsheet class="h-4 w-4 mr-2" />
                {{$t('Commons.text.sheets')}}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" class="shrink-0">
                <ArrowUpDown class="h-4 w-4 mr-2" />
                Sort: {{ sortLabel }}
                <ChevronDown class="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="handleSortChange('name')">
                {{$t('Commons.button.name')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleSortChange('date')">
                {{$t('Commons.button.date')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleSortChange('size')">
                {{$t('Commons.button.size')}}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              :class="viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''"
              @click="viewMode = 'grid'"
            >
              <LayoutGrid class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :class="viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''"
              @click="viewMode = 'list'"
            >
              <List class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

     
    <div
      v-if="selectedIds.length > 0"
      class="flex items-center justify-between px-6 py-3 bg-primary-50 dark:bg-primary-950/30 border-b border-primary-200 dark:border-primary-900"
    >
      <div class="flex items-center gap-3 text-sm text-primary-700 dark:text-primary-200">
        <Check class="h-4 w-4" />
        <span>{{ selectedIds.length }} selected</span>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" @click="clearSelection">{{$t('Commons.button.clear')}}</Button>
        <Button variant="ghost" size="sm" @click="handleConfirmSelection" :disabled="selectedIds.length === 0">
          Select
        </Button>
      </div>
    </div>

     
    <div class="flex-1 overflow-hidden">
      <ScrollArea class="h-full">
        <div v-if="visibleFiles.length > 0" class="p-4 space-y-4">
           
          <div
            v-if="viewMode === 'grid'"
            class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            <div
              v-for="file in visibleFiles"
              :key="file.id"
              :class="gridTileClass(file)"
              @click="handleSelect(file.id, $event)"
              @dblclick="handleImmediateSelection(file)"
              @contextmenu.prevent.stop="openContextMenuForFile($event, file)"
            >
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <component :is="getFileIcon(file)" class="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ file.title }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {{ file.file_type?.toUpperCase() || 'FILE' }}
                    <span v-if="file.file_size"> • {{ formatFileSize(file.file_size) }}</span>
                  </p>
                </div>
                <div v-if="selectedFiles.has(file.id || '')" class="flex-shrink-0 text-primary-600">
                  <Check class="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

           
          <div v-else class="space-y-1">
            <div class="grid grid-cols-[auto,1fr,160px,120px] items-center px-4 py-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <div>
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isSomeSelected"
                  @change="toggleSelectAll"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div>{{$t('Commons.button.name')}}</div>
              <div>{{$t('Commons.button.type')}}</div>
              <div>{{$t('Commons.button.size')}}</div>
            </div>

            <div
              v-for="file in visibleFiles"
              :key="file.id"
              :class="listRowClass(file)"
              @click="handleSelect(file.id, $event)"
              @dblclick="handleImmediateSelection(file)"
              @contextmenu.prevent.stop="openContextMenuForFile($event, file)"
            >
              <div class="flex items-center justify-center">
                <input
                  type="checkbox"
                  :checked="selectedFiles.has(file.id || '')"
                  @change.stop="handleSelect(file.id)
"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div class="flex items-center gap-3 min-w-0">
                <component :is="getFileIcon(file)" class="w-5 h-5 text-gray-500 dark:text-gray-300" />
                <span class="truncate text-sm text-gray-900 dark:text-gray-100">{{ file.title }}</span>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ file.file_type?.toUpperCase() || 'FILE' }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ file.file_size ? formatFileSize(file.file_size) : '—' }}
              </div>
            </div>
          </div>
        </div>

         
        <div v-else class="flex flex-col items-center justify-center py-16 px-6">
          <FileIcon class="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {{$t('Views.FilePicker.heading.no_files_found')}}
          </h3>
          <p class="text-center text-gray-500 dark:text-gray-400">
            {{$t('Views.FilePicker.text.try_adjusting_your_search')}}
          </p>
        </div>
      </ScrollArea>
    </div>

     
    <div class="flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ visibleFiles.length }} file{{ visibleFiles.length !== 1 ? 's' : '' }}
      </span>
      <div class="flex gap-3">
        <Button variant="outline" @click="cancel">
          {{$t('Commons.button.cancel')}}
        </Button>
        <Button :disabled="selectedIds.length === 0" @click="handleConfirmSelection">
          Select {{ selectedIds.length > 1 ? `${selectedIds.length} files` : 'File' }}
        </Button>
      </div>
    </div>

    <FileContextMenu
      v-if="contextMenuState.visible"
      :state="contextMenuState"
      :actions="contextMenuActions"
      :is-dark="false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import { FileData } from '@/types'
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Filter,
  Image,
  LayoutGrid,
  List,
  Search,
  X
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import FileContextMenu from '@/components/FileContextMenu.vue'
import { useMediaTypes } from '@/composables/useMediaTypes'
import { useFileExplorer } from '@/composables/useFileExplorer'
import { cn } from '@/lib/utils'

const router = useRouter()
const route = useRoute()
const fileStore = useFileStore()
const { formatFileSize, isMediaFile } = useMediaTypes()

const searchQuery = ref('')
const currentFilter = ref<'all' | 'documents' | 'media' | 'sheets'>('all')
const currentSort = ref<'name' | 'date' | 'size'>('name')
const viewMode = ref<'grid' | 'list'>('grid')

const allFiles = computed(() => fileStore.allFiles.filter(file => !file.is_folder))

const filteredFiles = computed(() => {
  let files = [...allFiles.value]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    files = files.filter(file =>
      file.title.toLowerCase().includes(query) ||
      file.file_type?.toLowerCase().includes(query)
    )
  }

  if (currentFilter.value !== 'all') {
    files = files.filter(file => {
      const type = file.file_type?.toLowerCase() || ''
      switch (currentFilter.value) {
        case 'documents':
          return ['docx', 'pdf', 'txt', 'rtf', 'doc', 'odt'].includes(type)
        case 'media':
          return isMediaFile(file.file_type)
        case 'sheets':
          return ['xlsx', 'xls', 'csv'].includes(type)
        default:
          return true
      }
    })
  }

  switch (currentSort.value) {
    case 'name':
      files.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      break
    case 'date':
      files.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      break
    case 'size':
      files.sort((a, b) => (Number(b.file_size) || 0) - (Number(a.file_size) || 0))
      break
  }

  return files
})

const {
  selectedFiles,
  selectedIds,
  isAllSelected,
  isSomeSelected,
  handleSelect,
  toggleSelectAll,
  setSelected,
  clearSelection,
  handleContextMenu: openContextMenu,
  contextMenuState,
  contextMenuActions,
  closeContextMenu
} = useFileExplorer({
  getFiles: () => filteredFiles.value,
  buildContextMenuActions: ({ selectedFiles: selectedFileItems, close }) => {
    const actions = []

    actions.push({
      label: selectedFileItems.length > 1 ? `Select ${selectedFileItems.length}` : 'Select File',
      icon: Check,
      action: () => {
        handleConfirmSelection()
        close()
      },
      disabled: selectedFileItems.length === 0
    })

    actions.push({
      label: 'Clear Selection',
      icon: X,
      action: () => {
        clearSelection()
        close()
      },
      disabled: selectedFileItems.length === 0
    })

    return actions
  }
})

const visibleFiles = filteredFiles

const filterLabel = computed(() => {
  if (currentFilter.value === 'all') return 'All Files'
  const label = currentFilter.value
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

const sortLabel = computed(() => {
  switch (currentSort.value) {
    case 'date':
      return 'Date'
    case 'size':
      return 'Size'
    default:
      return 'Name'
  }
})

const handleFilterChange = (filter: 'all' | 'documents' | 'media' | 'sheets') => {
  currentFilter.value = filter
  clearSelection()
}

const handleSortChange = (sort: 'name' | 'date' | 'size') => {
  currentSort.value = sort
}

const handleSearch = () => {
  clearSelection()
}

const getFileIcon = (file: FileData) => {
  const type = file.file_type?.toLowerCase()
  if (['docx', 'doc', 'pdf', 'txt', 'rtf', 'odt'].includes(type || '')) return FileText
  if (isMediaFile(file.file_type)) return Image
  if (['xlsx', 'xls', 'csv'].includes(type || '')) return FileSpreadsheet
  return FileIcon
}

const gridTileClass = (file: FileData) =>
  cn(
    'p-4 border rounded-lg cursor-pointer transition-colors select-none bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm',
    file.id && selectedFiles.value.has(file.id) && 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
  )

const listRowClass = (file: FileData) =>
  cn(
    'grid grid-cols-[auto,1fr,160px,120px] items-center gap-3 px-4 py-3 transition-colors cursor-pointer rounded-lg',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    file.id && selectedFiles.value.has(file.id) && 'bg-primary-50 dark:bg-primary-950/30 text-primary-900 dark:text-primary-100'
  )

const handleImmediateSelection = (file: FileData) => {
  if (!file.id) return
  setSelected([file.id])
  handleConfirmSelection([file])
}

const openContextMenuForFile = (event: MouseEvent, file: FileData) => {
  if (!file.id) return
  closeContextMenu()
  handleSelect(file.id, event)
  const x = event.clientX
  const y = event.clientY
  openContextMenu({ id: file.id, x, y })
}

const handleConfirmSelection = (filesOverride?: FileData[]) => {
  const selected = filesOverride ?? filteredFiles.value.filter(file => file.id && selectedFiles.value.has(file.id))
  if (selected.length === 0) return

  const message = {
    type: 'file-selected',
    files: selected,
    pickerId: route.query.pickerId || 'default'
  }

  if (window.opener) {
    window.opener.postMessage(message, '*')
    window.close()
  } else {
    localStorage.setItem('selected-files', JSON.stringify(message))
    router.back()
  }
}

const cancel = () => {
  const message = {
    type: 'file-selection-cancelled',
    pickerId: route.query.pickerId || 'default'
  }

  if (window.opener) {
    window.opener.postMessage(message, '*')
    window.close()
  } else {
    router.back()
  }
}

onMounted(async () => {
  if (fileStore.allFiles.length === 0) {
    await fileStore.loadDocuments()
  }
})
</script>
