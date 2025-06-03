<template>
  <div class="flex-1 overflow-hidden">
    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" :class="cn(
      'grid gap-4 p-6 overflow-y-auto',
      'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8'
    )">
      <MediaPreview
        v-for="file in mediaFiles"
        :key="file.id"
        :file="file"
        :size="gridSize"
        :is-selected="selectedFiles.has(file.id || '')"
        :show-checkbox="showCheckboxes || selectedFiles.has(file.id || '')"
        @select="handleSelect"
        @preview="handlePreview"
        @mouseenter="showCheckboxes = true"
        @mouseleave="showCheckboxes = false"
      />
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="overflow-y-auto">
      <!-- List Header -->
      <div :class="cn(
        'grid grid-cols-12 gap-4 p-4 text-sm font-medium text-gray-500 dark:text-gray-400',
        'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      )">
        <div class="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="someSelected"
            @change="handleSelectAll"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
        <div class="col-span-6">Name</div>
        <div class="col-span-2">Size</div>
        <div class="col-span-2">Modified</div>
        <div class="col-span-1">Actions</div>
      </div>

      <!-- List Items -->
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div
          v-for="file in mediaFiles"
          :key="file.id"
          :class="cn(
            'grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
            selectedFiles.has(file.id || '') ? 'bg-primary-50 dark:bg-primary-950/20' : ''
          )"
          @click="handleSelect(file.id)"
        >
          <!-- Checkbox -->
          <div class="col-span-1 flex items-center justify-center">
            <input
              type="checkbox"
              :checked="selectedFiles.has(file.id || '')"
              @click.stop="handleSelect(file.id)"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <!-- File Info -->
          <div class="col-span-6 flex items-center gap-3 min-w-0">
            <div class="flex-shrink-0">
              <MediaPreview
                :file="file"
                size="small"
                :is-selected="false"
                :show-checkbox="false"
                @preview="handlePreview"
              />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ file.title }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ file.file_type?.toUpperCase() }}
              </p>
            </div>
          </div>

          <!-- Size -->
          <div class="col-span-2 flex items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatFileSize(file.file_size) }}
            </span>
          </div>

          <!-- Modified Date -->
          <div class="col-span-2 flex items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(file.updated_at || file.created_at) }}
            </span>
          </div>

          <!-- Actions -->
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
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleDownload(file)">
                  <Download class="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleRename(file)">
                  <Edit class="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleDelete(file)" class="text-red-600 dark:text-red-400">
                  <Trash2 class="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="mediaFiles.length === 0" class="flex flex-col items-center justify-center h-96 text-center">
      <div class="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
        <Image class="w-12 h-12 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No media files
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Upload your first media files to get started. Supported formats include images, videos, and audio files.
      </p>
      <Button @click="$emit('upload')">
        <Upload class="h-4 w-4 mr-2" />
        Upload Media
      </Button>
    </div>

    <!-- Loading State -->
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
import MediaPreview from './MediaPreview.vue'

const props = defineProps({
  mediaFiles: {
    type: Array as PropType<FileData[]>,
    required: true
  },
  viewMode: {
    type: String as PropType<'grid' | 'list'>,
    default: 'grid'
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
  select: [id: string | undefined]
  preview: [file: FileData]
  download: [file: FileData]
  rename: [file: FileData]
  delete: [file: FileData]
  'select-all': [selected: boolean]
  upload: []
}>()

const showCheckboxes = ref(false)

const allSelected = computed(() => {
  return props.mediaFiles.length > 0 && props.mediaFiles.every(file => 
    props.selectedFiles.has(file.id || '')
  )
})

const someSelected = computed(() => {
  return props.selectedFiles.size > 0 && !allSelected.value
})

const handleSelect = (id: string | undefined) => {
  emit('select', id)
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

const handleSelectAll = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('select-all', target.checked)
}

const formatFileSize = (bytes: number | string | undefined): string => {
  if (!bytes) return 'Unknown size'
  const size = typeof bytes === 'string' ? parseInt(bytes) : bytes
  if (size === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(size) / Math.log(k))
  return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'Unknown date'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script> 