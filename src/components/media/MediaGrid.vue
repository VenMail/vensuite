<template>
  <div class="flex-1 overflow-hidden">
     
    <div
      v-if="viewMode === 'thumbnail'"
      :class="cn(
        'grid gap-4 p-6 overflow-y-auto min-h-0',
        gridSize === 'small'
          ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
          : gridSize === 'medium'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      )"
    >
      <div
        v-for="file in mediaFiles"
        :key="file.id"
        class="w-full min-w-0"
        @mouseenter="showCheckboxes = true"
        @mouseleave="showCheckboxes = false"
        @contextmenu.prevent.stop="handleContextMenu($event, file)"
      >
        <MediaPreview
          :file="file"
          :size="gridSize"
          :is-selected="selectedFiles.has(file.id || '')"
          :show-checkbox="showCheckboxes || selectedFiles.has(file.id || '')"
          @select="handleSelect"
          @preview="handlePreview"
        />
      </div>
    </div>

     
    <div v-else-if="viewMode === 'list'" class="overflow-y-auto">
       
      <div class="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400">
        <div class="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            :checked="isAllSelected"
            :indeterminate="isSomeSelected"
            @change="handleSelectAll(!isAllSelected)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
        <div class="col-span-6">{{$t('Commons.button.name')}}</div>
        <div class="col-span-2 text-center">{{$t('Commons.button.size')}}</div>
        <div class="col-span-2 text-center">{{$t('Commons.text.modified')}}</div>
        <div class="col-span-1 text-center">{{$t('Commons.text.actions')}}</div>
      </div>

       
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div
          v-for="file in mediaFiles"
          :key="file.id"
          :class="cn(
            'grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
            selectedFiles.has(file.id || '') ? 'bg-primary-50 dark:bg-primary-950/20' : ''
          )"
          @click="handleSelect(file.id, $event)"
          @contextmenu.prevent.stop="handleContextMenu($event, file)"
        >
           
          <div class="col-span-1 flex items-center justify-center">
            <input
              type="checkbox"
              :checked="selectedFiles.has(file.id || '')"
              @click.stop="handleSelect(file.id)"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

           
          <div class="col-span-6 flex items-center gap-3 min-w-0">
            <div class="flex-shrink-0 w-10 h-10 overflow-hidden">
              <MediaPreview
                :file="file"
                size="small"
                :is-selected="false"
                :show-checkbox="false"
                @preview="handlePreview"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" :title="file.title">
                {{ file.title }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ file.file_type?.toUpperCase() }}
              </p>
            </div>
          </div>

           
          <div class="col-span-2 flex items-center justify-center min-w-0">
            <span class="text-sm text-gray-600 dark:text-gray-400 truncate">
              {{ formatFileSize(file.file_size) }}
            </span>
          </div>

           
          <div class="col-span-2 flex items-center justify-center min-w-0">
            <span class="text-sm text-gray-600 dark:text-gray-400 truncate">
              {{ formatDate(file.updated_at || file.created_at) }}
            </span>
          </div>

           
          <div class="col-span-1 flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="handlePreview(file)">
                  <Eye class="h-4 w-4 mr-2" />
                  {{$t('Commons.alt.preview')}}
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleDownload(file)">
                  <Download class="h-4 w-4 mr-2" />
                  {{$t('Commons.button.download')}}
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleRename(file)">
                  <Edit class="h-4 w-4 mr-2" />
                  {{$t('Commons.button.rename')}}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleDelete(file)" class="text-red-600 dark:text-red-400">
                  <Trash2 class="h-4 w-4 mr-2" />
                  {{$t('Commons.button.delete')}}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>

     
    <div v-if="mediaFiles.length === 0 && !isLoading" class="flex flex-col items-center justify-center h-96 text-center">
      <div class="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
        <Image class="w-12 h-12 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {{$t('Media.MediaGrid.heading.no_media_files')}}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Upload your first media files to get started. Supported formats include images, videos, and audio files.
      </p>
      <Button @click="$emit('upload')">
        <Upload class="h-4 w-4 mr-2" />
        {{$t('Commons.button.upload_media')}}
      </Button>
    </div>

     
    <div v-if="isLoading" class="flex items-center justify-center h-96">
      <div class="flex flex-col items-center">
        <Loader class="w-8 h-8 animate-spin text-primary-600 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading media files...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, PropType } from 'vue'
import {
  Eye,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  Upload,
  Loader,
  Image
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { FileData } from '@/types'
import { useMediaTypes } from '@/composables/useMediaTypes'
import MediaPreview from './MediaPreview.vue'

const props = defineProps({
  mediaFiles: {
    type: Array as PropType<FileData[]>,
    required: true
  },
  viewMode: {
    type: String as PropType<'thumbnail' | 'grid' | 'list'>,
    required: true
  },
  selectedFiles: {
    type: Set as PropType<Set<string>>,
    required: true
  },
  gridSize: {
    type: String as PropType<'small' | 'medium' | 'large'>,
    default: 'medium'
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  select: [id: string | undefined, event?: MouseEvent]
  preview: [file: FileData]
  download: [file: FileData]
  rename: [file: FileData]
  delete: [file: FileData]
  'select-all': [selected: boolean]
  'context-menu': [payload: { id: string; x: number; y: number; file: FileData }]
  upload: []
}>()

const showCheckboxes = ref(false)

const { formatFileSize, formatDate } = useMediaTypes()

// Computed properties for select all functionality
const isAllSelected = computed(() => {
  return props.mediaFiles.length > 0 && 
         props.mediaFiles.every(file => props.selectedFiles.has(file.id || ''))
})

const isSomeSelected = computed(() => {
  return props.selectedFiles.size > 0 && !isAllSelected.value
})

const handleSelect = (id: string | undefined, event?: MouseEvent) => {
  emit('select', id, event)
}

const handleSelectAll = (selected: boolean) => {
  emit('select-all', selected)
}

const handlePreview = (file: FileData) => {
  emit('preview', file)
}

const handleDownload = (file: FileData) => {
  emit('download', file)
}

const handleRename = (file: FileData) => {
  emit('rename', file)
}

const handleDelete = (file: FileData) => {
  emit('delete', file)
}

const handleContextMenu = (event: MouseEvent, file: FileData) => {
  if (!file.id) return

  emit('select', file.id, event)

  emit('context-menu', {
    id: file.id,
    x: event.clientX,
    y: event.clientY,
    file
  })
}
</script>