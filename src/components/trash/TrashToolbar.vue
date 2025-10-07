<template>
  <div
    :class="cn(
      'flex flex-col gap-4 p-4',
      'bg-white dark:bg-secondary-900 border-b border-grey-300 dark:border-secondary-700'
    )"
  >
    <!-- Top Row: Search / Filters / Sort -->
    <div class="flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-6">
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 flex-1">
        <!-- Search -->
        <div class="relative flex-1 min-w-0">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-500 dark:text-grey-400" />
          <Input
            v-model="searchValue"
            placeholder="Search media files..."
            class="pl-10 pr-4 bg-white dark:bg-secondary-800 border-grey-300 dark:border-secondary-600 text-secondary-900 dark:text-grey-100 placeholder:text-grey-500 dark:placeholder:text-grey-400 focus:border-primary-500 dark:focus:border-primary-500"
            @input="$emit('search', searchValue)"
          />
        </div>

        <!-- Filter -->
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              class="shrink-0 bg-white dark:bg-secondary-800 border-grey-300 dark:border-secondary-600 text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700"
            >
              <Filter class="h-4 w-4 mr-2" />
              {{ filterLabel }}
              <ChevronDown class="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end"
            class="bg-white dark:bg-secondary-800 border-grey-300 dark:border-secondary-600"
          >
            <DropdownMenuItem 
              @click="handleFilterChange('all')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <FileIcon class="h-4 w-4 mr-2" />
              All Media
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleFilterChange('images')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <Image class="h-4 w-4 mr-2" />
              Images
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleFilterChange('videos')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <Video class="h-4 w-4 mr-2" />
              Videos
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleFilterChange('audio')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <Volume2 class="h-4 w-4 mr-2" />
              Audio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div class="flex items-center gap-3 w-full xl:w-auto justify-between lg:justify-end">
        <span class="hidden sm:inline text-sm text-grey-600 dark:text-grey-400">Sort by</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              class="shrink-0 bg-white dark:bg-secondary-800 border-grey-300 dark:border-secondary-600 text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700"
            >
              <ArrowUpDown class="h-4 w-4 mr-2" />
              {{ sortLabel }}
              <ChevronDown class="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end"
            class="bg-white dark:bg-secondary-800 border-grey-300 dark:border-secondary-600"
          >
            <DropdownMenuItem 
              @click="handleSortChange('name')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <AlphabeticalIcon class="h-4 w-4 mr-2" />
              Name
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleSortChange('date')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <Calendar class="h-4 w-4 mr-2" />
              Date
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleSortChange('size')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <HardDrive class="h-4 w-4 mr-2" />
              Size
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleSortChange('type')"
              class="text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <FileType class="h-4 w-4 mr-2" />
              Type
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Bottom Row: View Controls / Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- View Toggles -->
      <div class="flex items-center bg-grey-200 dark:bg-secondary-800 rounded-lg p-1 border border-grey-300 dark:border-secondary-600 w-full sm:w-auto justify-between sm:justify-start">
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2 text-secondary-700 dark:text-grey-300 hover:text-secondary-900 dark:hover:text-grey-100',
            isThumbnailMode ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-500 dark:text-primary-400' : ''
          )"
          @click="$emit('view-mode', 'thumbnail')"
        >
          <LayoutGrid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2 text-secondary-700 dark:text-grey-300 hover:text-secondary-900 dark:hover:text-grey-100',
            isGridMode ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-500 dark:text-primary-400' : ''
          )"
          @click="$emit('view-mode', 'grid')"
        >
          <Grid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'px-3 py-2 text-secondary-700 dark:text-grey-300 hover:text-secondary-900 dark:hover:text-grey-100',
            isListMode ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-500 dark:text-primary-400' : ''
          )"
          @click="$emit('view-mode', 'list')"
        >
          <List class="h-4 w-4" />
        </Button>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end w-full sm:w-auto">
        <template v-if="hasSelectedItems">
          <span class="text-sm text-grey-600 dark:text-grey-400 whitespace-nowrap">
            {{ selectedCount }} selected
          </span>
          <div class="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              @click="$emit('bulk-download')"
              class="bg-white dark:bg-secondary-800 border-grey-300 dark:border-secondary-600 text-secondary-800 dark:text-grey-100 hover:bg-grey-100 dark:hover:bg-secondary-700"
            >
              <Download class="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              @click="$emit('bulk-delete')"
              class="bg-white dark:bg-secondary-800 border-red-400 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </template>

        <Button 
          @click="$emit('upload')" 
          class="shrink-0 bg-primary-500 border-primary-500 text-white hover:bg-primary-600 hover:border-primary-600 dark:bg-primary-500 dark:border-primary-500 dark:text-white dark:hover:bg-primary-600 dark:hover:border-primary-600"
        >
          <Upload class="h-4 w-4 mr-2" />
          Upload Media
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, PropType } from 'vue'
import {
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  LayoutGrid,
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

const AlphabeticalIcon = FileType

const props = defineProps({
  selectedCount: {
    type: Number,
    default: 0,
  },
  viewMode: {
    type: String as PropType<'thumbnail' | 'grid' | 'list'>,
    default: 'thumbnail',
  },
})

const emit = defineEmits<{
  search: [query: string]
  filter: [filter: string]
  sort: [sort: string]
  'view-mode': [mode: 'thumbnail' | 'grid' | 'list']
  upload: []
  'bulk-download': []
  'bulk-delete': []
}>()

const searchValue = ref('')
const selectedFilter = ref<'all' | 'images' | 'videos' | 'audio'>('all')
const selectedSort = ref<'name' | 'date' | 'size' | 'type'>('name')

const filterLabel = computed(() => {
  if (selectedFilter.value === 'all') return 'All Media'
  const label = selectedFilter.value
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

const sortLabel = computed(() => {
  switch (selectedSort.value) {
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

// Computed properties to ensure linter recognizes prop usage
const hasSelectedItems = computed(() => props.selectedCount > 0)
const isThumbnailMode = computed(() => props.viewMode === 'thumbnail')
const isGridMode = computed(() => props.viewMode === 'grid')
const isListMode = computed(() => props.viewMode === 'list')

const handleFilterChange = (filter: 'all' | 'images' | 'videos' | 'audio') => {
  selectedFilter.value = filter
  emit('filter', filter)
}

const handleSortChange = (sort: 'name' | 'date' | 'size' | 'type') => {
  selectedSort.value = sort
  emit('sort', sort)
}
</script>