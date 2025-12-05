<template>
  <div
    :class="cn(
      'flex flex-col gap-4 p-4',
      'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
    )"
  >
    <!-- Top Row: Search / Filters / Sort -->
    <div class="flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-6">
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 flex-1">
        <!-- Search -->
        <div class="relative flex-1 min-w-0">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            v-model="searchValue"
            placeholder="Search media files..."
            class="pl-10 pr-4"
            @input="$emit('search', searchValue)"
          />
        </div>

        <!-- Filter -->
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
              {{$t('Commons.text.all_media')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleFilterChange('images')">
              <Image class="h-4 w-4 mr-2" />
              Images
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleFilterChange('videos')">
              <Video class="h-4 w-4 mr-2" />
              {{$t('Commons.text.videos')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleFilterChange('audio')">
              <Volume2 class="h-4 w-4 mr-2" />
              Audio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div class="flex items-center gap-3 w-full xl:w-auto justify-between lg:justify-end">
        <span class="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">{{$t('Commons.text.sort_by')}}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" class="shrink-0">
              <ArrowUpDown class="h-4 w-4 mr-2" />
              {{ sortLabel }}
              <ChevronDown class="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="handleSortChange('name')">
              <AlphabeticalIcon class="h-4 w-4 mr-2" />
              {{$t('Commons.button.name')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleSortChange('date')">
              <Calendar class="h-4 w-4 mr-2" />
              {{$t('Commons.button.date')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleSortChange('size')">
              <HardDrive class="h-4 w-4 mr-2" />
              {{$t('Commons.button.size')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleSortChange('type')">
              <FileType class="h-4 w-4 mr-2" />
              {{$t('Commons.button.type')}}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Bottom Row: View Controls / Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- View Toggles -->
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
        <Button
          variant="ghost"
          size="sm"
          :class="cn('px-3 py-2', isThumbnailMode ? 'bg-white dark:bg-gray-700 shadow-sm' : '')"
          @click="$emit('view-mode', 'thumbnail')"
        >
          <LayoutGrid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn('px-3 py-2', isGridMode ? 'bg-white dark:bg-gray-700 shadow-sm' : '')"
          @click="$emit('view-mode', 'grid')"
        >
          <Grid class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn('px-3 py-2', isListMode ? 'bg-white dark:bg-gray-700 shadow-sm' : '')"
          @click="$emit('view-mode', 'list')"
        >
          <List class="h-4 w-4" />
        </Button>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end w-full sm:w-auto">
        <template v-if="hasSelectedItems">
          <span class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {{ selectedCount }} selected
          </span>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="$emit('bulk-download')">
              <Download class="h-4 w-4 mr-2" />
              {{$t('Commons.button.download')}}
            </Button>
            <Button variant="outline" size="sm" @click="$emit('bulk-delete')">
              <Trash2 class="h-4 w-4 mr-2" />
              {{$t('Commons.button.delete')}}
            </Button>
          </div>
        </template>

        <Button @click="$emit('upload')" class="shrink-0">
          <Upload class="h-4 w-4 mr-2" />
          {{$t('Commons.button.upload_media')}}
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