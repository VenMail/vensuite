<template>
  <div :class="cn(
    'relative overflow-hidden rounded-lg border transition-all duration-200',
    'bg-gray-50 dark:bg-gray-800',
    'border-gray-200 dark:border-gray-700',
    isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'hover:border-gray-300 dark:hover:border-gray-600',
    size === 'small' ? 'aspect-square w-16 h-16' : size === 'medium' ? 'aspect-square w-full' : 'aspect-square w-full'
  )">
    <!-- Selection Checkbox -->
    <div v-if="showCheckbox || isSelected" 
      class="absolute top-2 left-2 z-10 w-5 h-5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center cursor-pointer shadow-sm"
      @click.stop="$emit('select', file.id)">
      <CheckIcon v-if="isSelected" class="w-3 h-3 text-primary-600" />
    </div>

    <!-- File Type Badge -->
    <div class="absolute top-2 right-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded">
      {{ file.file_type?.toUpperCase() }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <!-- Image Preview -->
    <div v-else-if="isImage" class="relative w-full h-full">
      <img 
        :src="file.file_url" 
        :alt="file.title"
        class="w-full h-full object-cover cursor-pointer"
        @click="$emit('preview', file)"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <div v-if="!imageLoaded" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <Image class="w-8 h-8 text-gray-400" />
      </div>
    </div>

    <!-- Video Preview -->
    <div v-else-if="isVideo" class="relative w-full h-full bg-black">
      <video 
        :src="file.file_url"
        class="w-full h-full object-cover cursor-pointer"
        @click="$emit('preview', file)"
        preload="metadata"
        muted
      >
        <source :src="file.file_url" :type="`video/${file.file_type}`">
      </video>
      <div class="absolute inset-0 flex items-center justify-center bg-black/20">
        <div class="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
          <Play class="w-6 h-6 text-gray-800 ml-1" />
        </div>
      </div>
    </div>

    <!-- Audio Preview -->
    <div v-else-if="isAudio" class="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer" @click="$emit('preview', file)">
      <Volume2 class="w-8 h-8 text-gray-400 mb-2" />
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">
        {{ file.title }}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ formatFileSize(file.file_size) }}
      </span>
    </div>

    <!-- Unsupported/Other Files -->
    <div v-else class="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer" @click="$emit('preview', file)">
      <FileIcon class="w-8 h-8 text-gray-400 mb-2" />
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">
        {{ file.title }}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ formatFileSize(file.file_size) }}
      </span>
    </div>

    <!-- File Info Overlay (for larger sizes) -->
    <div v-if="size === 'large'" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
      <h3 class="text-white font-medium text-sm truncate">{{ file.title }}</h3>
      <p class="text-white/80 text-xs">{{ formatFileSize(file.file_size) }} • {{ formatDate(file.created_at) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, PropType } from 'vue'
import { CheckIcon, Loader, Image, Play, Volume2, FileIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { FileData } from '@/types'

const props = defineProps({
  file: {
    type: Object as PropType<FileData>,
    required: true
  },
  size: {
    type: String as PropType<'small' | 'medium' | 'large'>,
    default: 'medium'
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  showCheckbox: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  select: [id: string | undefined]
  preview: [file: FileData]
}>()

const isLoading = ref(false)
const imageLoaded = ref(false)

const isImage = computed(() => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  return imageTypes.includes(props.file.file_type?.toLowerCase() || '')
})

const isVideo = computed(() => {
  const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv']
  return videoTypes.includes(props.file.file_type?.toLowerCase() || '')
})

const isAudio = computed(() => {
  const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  return audioTypes.includes(props.file.file_type?.toLowerCase() || '')
})

const handleImageError = () => {
  imageLoaded.value = false
}

const handleImageLoad = () => {
  imageLoaded.value = true
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
  return d.toLocaleDateString()
}
</script> 