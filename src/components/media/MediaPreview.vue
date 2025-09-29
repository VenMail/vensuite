<template>
  <div :class="cn(
    'relative overflow-hidden rounded-lg border transition-all duration-200 group',
    'bg-gray-50 dark:bg-gray-800',
    'border-gray-200 dark:border-gray-700',
    isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md',
    size === 'small' ? 'aspect-square w-16 h-16' : size === 'medium' ? 'aspect-square w-full' : 'aspect-square w-full'
  )">
    <!-- Selection Checkbox -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-75"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <div v-if="showCheckbox || isSelected" 
        class="absolute top-2 left-2 z-10 w-5 h-5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center cursor-pointer shadow-sm backdrop-blur-sm"
        @click.stop="emit('select', file.id)">
        <CheckIcon v-if="isSelected" class="w-3 h-3 text-primary-600" />
      </div>
    </Transition>

    <!-- File Type Badge -->
    <div class="absolute top-2 right-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
      {{ file.file_type?.toUpperCase() }}
    </div>

    <!-- Loading State -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isMediaLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-20">
        <Loader class="w-6 h-6 animate-spin text-primary-600" />
      </div>
    </Transition>

    <!-- Image Preview -->
    <div v-if="mediaCategory === 'image'" class="relative w-full h-full">
      <img 
        :src="file.file_url" 
        :alt="file.title"
        class="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
        @click="emit('preview', file)"
        @error="handleMediaError"
        @load="handleMediaLoad"
        @loadstart="handleMediaLoadStart"
      />
      <div v-if="!mediaLoaded && !hasMediaError" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <Image class="w-8 h-8 text-gray-400" />
      </div>
    </div>

    <!-- Video Preview -->
    <div v-else-if="mediaCategory === 'video'" class="relative w-full h-full bg-black group">
      <video 
        :src="file.file_url"
        class="w-full h-full object-cover cursor-pointer"
        @click="emit('preview', file)"
        @loadeddata="handleMediaLoad"
        @error="handleMediaError"
        @loadstart="handleMediaLoadStart"
        preload="metadata"
        muted
      >
        <source :src="file.file_url" :type="`video/${file.file_type}`">
      </video>
      <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-200">
        <div class="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center group-hover:bg-white transition-colors duration-200">
          <Play class="w-6 h-6 text-gray-800 ml-1" />
        </div>
      </div>
    </div>

    <!-- Audio Preview -->
    <div v-else-if="mediaCategory === 'audio'" class="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-200" @click="emit('preview', file)">
      <Volume2 class="w-8 h-8 text-primary-600 mb-2 group-hover:text-primary-500 transition-colors duration-200" />
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">
        {{ file.title }}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ formatFileSize(file.file_size) }}
      </span>
    </div>

    <!-- Unsupported/Other Files -->
    <div v-else class="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-200" @click="emit('preview', file)">
      <FileIcon class="w-8 h-8 text-gray-400 mb-2" />
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">
        {{ file.title }}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ formatFileSize(file.file_size) }}
      </span>
    </div>

    <!-- Error State -->
    <div v-if="hasMediaError" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
      <div class="flex flex-col items-center text-center">
        <AlertCircle class="w-6 h-6 text-red-400 mb-1" />
        <span class="text-xs text-red-500">Failed to load</span>
      </div>
    </div>

    <!-- File Info Overlay (for larger sizes) -->
    <div v-if="size === 'large'" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <h3 class="text-white font-medium text-sm truncate">{{ file.title }}</h3>
      <p class="text-white/80 text-xs">{{ formatFileSize(file.file_size) }} • {{ formatDate(file.created_at) }}</p>
    </div>

    <!-- Hover Actions for medium/large sizes -->
    <div v-if="size !== 'small'" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
      <Button 
        size="sm" 
        variant="secondary"
        class="bg-white/90 hover:bg-white text-gray-900"
        @click.stop="emit('preview', file)"
      >
        <Eye class="w-4 h-4 mr-1" />
        Preview
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, PropType } from 'vue'
import { CheckIcon, Loader, Image, Play, Volume2, FileIcon, AlertCircle, Eye } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { FileData } from '@/types'
import { useMediaTypes } from '@/composables/useMediaTypes'
import { Button } from '@/components/ui/button'

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

const { getMediaCategory, formatFileSize, formatDate } = useMediaTypes()

const isMediaLoading = ref(false)
const mediaLoaded = ref(false)
const hasMediaError = ref(false)

const mediaCategory = computed(() => getMediaCategory(props.file.file_type))

const handleMediaLoadStart = () => {
  isMediaLoading.value = true
  hasMediaError.value = false
  mediaLoaded.value = false
}

const handleMediaLoad = () => {
  isMediaLoading.value = false
  mediaLoaded.value = true
  hasMediaError.value = false
}

const handleMediaError = () => {
  isMediaLoading.value = false
  mediaLoaded.value = false
  hasMediaError.value = true
}
</script> 