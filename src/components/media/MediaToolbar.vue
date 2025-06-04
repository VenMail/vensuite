<template>
  <div :class="cn(
    'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4',
    'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
  )">
    <!-- Left Side: Search and Filters -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
      <!-- Search Input -->
      <div class="relative flex-1 min-w-0 max-w-sm">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          v-model="searchValue"
          placeholder="Search media files..."
          class="pl-10 pr-4"
          @input="$emit('search', searchValue)"
        />
      </div>

      <!-- Media Type Filter -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" class="shrink-0">
            <Filter class="h-4 w-4 mr-2" />
            {{ selectedFilter === 'all' ? 'All Media' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1) }}
            <ChevronDown class="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="handleFilterChange('all')">
            <FileIcon class="h-4 w-4 mr-2" />
            All Media
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleFilterChange('images')">
            <Image class="h-4 w-4 mr-2" />
            Images
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleFilterChange('videos')">
            <Video class="h-4 w-4 mr-2" />
            Videos
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleFilterChange('audio')">
            <Volume2 class="h-4 w-4 mr-2" />
            Audio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Sort Options -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" class="shrink-0">
            <ArrowUpDown class="h-4 w-4 mr-2" />
            Sort
            <ChevronDown class="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="handleSortChange('name')">
            <AlphabeticalIcon class="h-4 w-4 mr-2" />
            Name
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleSortChange('date')">
            <Calendar class="h-4 w-4 mr-2" />
            Date
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleSortChange('size')">
            <HardDrive class="h-4 w-4 mr-2" />
            Size
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleSortChange('type')">
            <FileType class="h-4 w-4 mr-2" />
            Type
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Right Side: View Controls and Actions -->
    <div class="flex items-center gap-3">
      <!-- View Mode Toggle -->
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2',
            isGridMode ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
          )"
          @click="$emit('view-mode', 'grid')"
        >
          <Grid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2',
            isListMode ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
          )"
          @click="$emit('view-mode', 'list')"
        >
          <List class="h-4 w-4" />
        </Button>
      </div>

      <!-- Bulk Actions (shown when items are selected) -->
      <div v-if="hasSelectedItems" class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ selectedCount }} selected
        </span>
        <Button variant="outline" size="sm" @click="$emit('bulk-download')">
          <Download class="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" @click="$emit('bulk-delete')">
          <Trash2 class="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <!-- Upload Button -->
      <Button @click="$emit('upload')" class="shrink-0">
        <Upload class="h-4 w-4 mr-2" />
        Upload Media
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, computed } from 'vue'
import {
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Grid,
  List,
  Upload,
  Download,
  Trash2,
  Image,
  Video,
  Volume2,
  FileIcon,
  Calendar,
  HardDrive,
  FileType
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Create a simple alphabetical icon using the existing FileType icon
const AlphabeticalIcon = FileType

const props = defineProps({
  selectedCount: {
    type: Number,
    default: 0
  },
  viewMode: {
    type: String as PropType<'grid' | 'list'>,
    default: 'grid'
  }
})

const emit = defineEmits<{
  search: [query: string]
  filter: [filter: string]
  sort: [sort: string]
  'view-mode': [mode: 'grid' | 'list']
  upload: []
  'bulk-download': []
  'bulk-delete': []
}>()

const searchValue = ref('')
const selectedFilter = ref('all')
const selectedSort = ref('name')

// Computed properties to ensure linter recognizes prop usage
const hasSelectedItems = computed(() => props.selectedCount > 0)
const isGridMode = computed(() => props.viewMode === 'grid')
const isListMode = computed(() => props.viewMode === 'list')

const handleFilterChange = (filter: string) => {
  selectedFilter.value = filter
  emit('filter', filter)
}

const handleSortChange = (sort: string) => {
  selectedSort.value = sort
  emit('sort', sort)
}
</script> 