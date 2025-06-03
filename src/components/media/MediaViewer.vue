<template>
  <Dialog :open="isOpen" @update:open="handleClose">
    <DialogContent class="max-w-6xl w-full h-[90vh] p-0 bg-black/95">
      <!-- Header -->
      <div class="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div class="flex items-center justify-between text-white">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold truncate">{{ currentFile?.title }}</h2>
            <Badge variant="secondary" class="bg-white/20 text-white">
              {{ currentFile?.file_type?.toUpperCase() }}
            </Badge>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" @click="handleDownload" class="text-white hover:bg-white/20">
              <Download class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" @click="handleClose" class="text-white hover:bg-white/20">
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Media Content -->
      <div class="relative w-full h-full flex items-center justify-center p-16">
        <!-- Image Preview -->
        <div v-if="isImage" class="relative max-w-full max-h-full">
          <img
            :src="currentFile?.file_url"
            :alt="currentFile?.title"
            class="max-w-full max-h-full object-contain"
            @load="handleMediaLoad"
            @error="handleMediaError"
          />
        </div>

        <!-- Video Preview -->
        <div v-else-if="isVideo" class="relative max-w-full max-h-full">
          <video
            :src="currentFile?.file_url"
            class="max-w-full max-h-full"
            controls
            @loadeddata="handleMediaLoad"
            @error="handleMediaError"
          >
            <source :src="currentFile?.file_url" :type="`video/${currentFile?.file_type}`">
            Your browser does not support the video tag.
          </video>
        </div>

        <!-- Audio Preview -->
        <div v-else-if="isAudio" class="flex flex-col items-center gap-6 max-w-md w-full">
          <div class="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <Volume2 class="w-16 h-16 text-white" />
          </div>
          <div class="text-center">
            <h3 class="text-xl font-semibold text-white mb-2">{{ currentFile?.title }}</h3>
            <p class="text-gray-300">{{ formatFileSize(currentFile?.file_size) }}</p>
          </div>
          <audio
            :src="currentFile?.file_url"
            controls
            class="w-full"
            @loadeddata="handleMediaLoad"
            @error="handleMediaError"
          >
            <source :src="currentFile?.file_url" :type="`audio/${currentFile?.file_type}`">
            Your browser does not support the audio tag.
          </audio>
        </div>

        <!-- Unsupported File Type -->
        <div v-else class="flex flex-col items-center gap-6 text-white text-center">
          <div class="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center">
            <FileIcon class="w-12 h-12" />
          </div>
          <div>
            <h3 class="text-xl font-semibold mb-2">{{ currentFile?.title }}</h3>
            <p class="text-gray-300 mb-4">Preview not available for this file type</p>
            <Button variant="outline" @click="handleDownload">
              <Download class="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-black/50">
          <div class="flex flex-col items-center gap-4 text-white">
            <Loader class="w-8 h-8 animate-spin" />
            <p>Loading media...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-if="hasError" class="absolute inset-0 flex items-center justify-center">
          <div class="flex flex-col items-center gap-4 text-white text-center">
            <AlertCircle class="w-12 h-12 text-red-400" />
            <div>
              <h3 class="text-lg font-semibold mb-2">Failed to load media</h3>
              <p class="text-gray-300 mb-4">There was an error loading this file</p>
              <Button variant="outline" @click="handleDownload">
                <Download class="h-4 w-4 mr-2" />
                Download Instead
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Controls (if multiple files) -->
      <div v-if="hasMultipleFiles" class="absolute left-4 top-1/2 transform -translate-y-1/2">
        <Button
          variant="ghost"
          size="lg"
          @click="handlePrevious"
          :disabled="!hasPrevious"
          class="text-white hover:bg-white/20 bg-black/30"
        >
          <ChevronLeft class="h-6 w-6" />
        </Button>
      </div>

      <div v-if="hasMultipleFiles" class="absolute right-4 top-1/2 transform -translate-y-1/2">
        <Button
          variant="ghost"
          size="lg"
          @click="handleNext"
          :disabled="!hasNext"
          class="text-white hover:bg-white/20 bg-black/30"
        >
          <ChevronRight class="h-6 w-6" />
        </Button>
      </div>

      <!-- Footer Info -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
        <div class="flex items-center justify-between text-white text-sm">
          <div class="flex items-center gap-4">
            <span>{{ formatFileSize(currentFile?.file_size) }}</span>
            <span>{{ formatDate(currentFile?.created_at) }}</span>
          </div>
          <div v-if="hasMultipleFiles" class="flex items-center gap-2">
            <span>{{ currentIndex + 1 }} of {{ totalFiles }}</span>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, PropType } from 'vue'
import {
  X,
  Download,
  Volume2,
  FileIcon,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileData } from '@/types'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  currentFile: {
    type: Object as PropType<FileData | null>,
    default: null
  },
  files: {
    type: Array as PropType<FileData[]>,
    default: () => []
  },
  currentIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits<{
  close: []
  download: [file: FileData]
  navigate: [index: number]
}>()

const isLoading = ref(false)
const hasError = ref(false)

const isImage = computed(() => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  return imageTypes.includes(props.currentFile?.file_type?.toLowerCase() || '')
})

const isVideo = computed(() => {
  const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv']
  return videoTypes.includes(props.currentFile?.file_type?.toLowerCase() || '')
})

const isAudio = computed(() => {
  const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  return audioTypes.includes(props.currentFile?.file_type?.toLowerCase() || '')
})

const hasMultipleFiles = computed(() => props.files.length > 1)
const totalFiles = computed(() => props.files.length)
const hasPrevious = computed(() => props.currentIndex > 0)
const hasNext = computed(() => props.currentIndex < props.files.length - 1)

// Reset states when file changes
watch(() => props.currentFile, () => {
  isLoading.value = true
  hasError.value = false
})

const handleClose = () => {
  emit('close')
}

const handleDownload = () => {
  if (props.currentFile) {
    emit('download', props.currentFile)
  }
}

const handlePrevious = () => {
  if (hasPrevious.value) {
    emit('navigate', props.currentIndex - 1)
  }
}

const handleNext = () => {
  if (hasNext.value) {
    emit('navigate', props.currentIndex + 1)
  }
}

const handleMediaLoad = () => {
  isLoading.value = false
  hasError.value = false
}

const handleMediaError = () => {
  isLoading.value = false
  hasError.value = true
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
    month: 'long',
    day: 'numeric'
  })
}
</script> 