<template>
  <Dialog :open="isOpen" @update:open="handleClose">
    <DialogContent class="max-w-6xl w-full h-[90vh] p-0 bg-black/95 overflow-hidden">
       
      <div class="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
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

       
      <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
         
        <div 
          :class="[
            'relative transition-all duration-500 ease-out overflow-hidden',
            hasMultipleFiles && showThumbnails ? 'mr-24' : 'mr-0'
          ]"
          :style="mediaContainerStyle"
        >
           
          <div v-if="currentIsImage" class="relative w-full h-full flex items-center justify-center">
            <img
              :key="currentFile?.id"
              :src="currentFile?.file_url"
              :alt="currentFile?.title"
              :class="[
                'transition-all duration-700 ease-out transform',
                mediaAnimationClass
              ]"
              :style="imageStyle"
              @load="handleMediaLoad"
              @error="handleMediaError"
              ref="mediaElement"
            />
          </div>

           
          <div v-else-if="currentIsVideo" class="relative w-full h-full flex items-center justify-center">
            <video
              :key="currentFile?.id"
              :src="currentFile?.file_url"
              :class="[
                'transition-all duration-700 ease-out transform',
                mediaAnimationClass
              ]"
              :style="videoStyle"
              controls
              @loadeddata="handleMediaLoad"
              @error="handleMediaError"
              ref="mediaElement"
            >
              <source :src="currentFile?.file_url" :type="`video/${currentFile?.file_type}`">
              {{$t('Media.MediaViewer.text.your_browser_does_not')}}
            </video>
          </div>

           
          <div v-else-if="currentIsAudio" class="flex flex-col items-center gap-6 max-w-md w-full">
            <div 
              :class="[
                'w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center transition-all duration-700 ease-out transform',
                mediaAnimationClass
              ]"
            >
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
              {{$t('Media.MediaViewer.text.your_browser_does_not_2')}}
            </audio>
          </div>

           
          <div v-else class="flex flex-col items-center gap-6 text-white text-center">
            <div class="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center">
              <FileIcon class="w-12 h-12" />
            </div>
            <div>
              <h3 class="text-xl font-semibold mb-2">{{ currentFile?.title }}</h3>
              <p class="text-gray-300 mb-4">{{$t('Media.MediaViewer.text.preview_not_available_for')}}</p>
              <Button variant="outline" @click="handleDownload">
                <Download class="h-4 w-4 mr-2" />
                {{$t('Commons.button.download_file_2')}}
              </Button>
            </div>
          </div>
        </div>

         
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="transform translate-x-full opacity-0"
          enter-to-class="transform translate-x-0 opacity-100"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="transform translate-x-0 opacity-100"
          leave-to-class="transform translate-x-full opacity-0"
        >
          <div 
            v-if="hasMultipleFiles && showThumbnails"
            class="absolute right-0 top-0 bottom-0 w-20 bg-black/60 backdrop-blur-sm border-l border-white/10 z-10"
          >
            <div class="flex flex-col h-full py-16 px-2 gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <button
                v-for="(file, index) in files"
                :key="file.id"
                @click="handleThumbnailClick(index)"
                :class="[
                  'relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 flex-shrink-0',
                  index === currentIndex 
                    ? 'border-white shadow-lg shadow-white/20 scale-105' 
                    : 'border-white/20 hover:border-white/40 hover:scale-102'
                ]"
              >
                 
                <img
                  v-if="isImageFile(file)"
                  :src="file.file_url"
                  :alt="file.title"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                 
                <div 
                  v-else-if="isVideoFile(file)" 
                  class="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center"
                >
                  <Play class="w-4 h-4 text-white" />
                </div>
                 
                <div 
                  v-else-if="isAudioFile(file)" 
                  class="w-full h-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center"
                >
                  <Volume2 class="w-4 h-4 text-white" />
                </div>
                 
                <div 
                  v-else 
                  class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center"
                >
                  <FileIcon class="w-4 h-4 text-white" />
                </div>

                 
                <div class="absolute top-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                  {{ index + 1 }}
                </div>
              </button>
            </div>
          </div>
        </Transition>

         
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div class="flex flex-col items-center gap-4 text-white">
            <Loader class="w-8 h-8 animate-spin" />
            <p>Loading media...</p>
          </div>
        </div>

         
        <div v-if="hasError" class="absolute inset-0 flex items-center justify-center z-30">
          <div class="flex flex-col items-center gap-4 text-white text-center">
            <AlertCircle class="w-12 h-12 text-red-400" />
            <div>
              <h3 class="text-lg font-semibold mb-2">{{$t('Media.MediaViewer.heading.failed_to_load_media')}}</h3>
              <p class="text-gray-300 mb-4">{{$t('Media.MediaViewer.text.there_was_an_error')}}</p>
              <Button variant="outline" @click="handleDownload">
                <Download class="h-4 w-4 mr-2" />
                {{$t('Commons.button.download_instead')}}
              </Button>
            </div>
          </div>
        </div>
      </div>

       
      <div v-if="hasMultipleFiles" class="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="lg"
          @click="handlePrevious"
          :disabled="!hasPrevious"
          class="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm"
        >
          <ChevronLeft class="h-6 w-6" />
        </Button>
      </div>

      <div v-if="hasMultipleFiles" class="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="lg"
          @click="handleNext"
          :disabled="!hasNext"
          class="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm"
          :class="{ 'mr-20': showThumbnails }"
        >
          <ChevronRight class="h-6 w-6" />
        </Button>
      </div>

       
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-20">
        <div class="flex items-center justify-between text-white text-sm">
          <div class="flex items-center gap-4">
            <span>{{ formatFileSize(currentFile?.file_size) }}</span>
            <span>{{ formatDate(currentFile?.created_at) }}</span>
          </div>
          <div class="flex items-center gap-4">
            <div v-if="hasMultipleFiles" class="flex items-center gap-2">
              <span>{{ currentIndex + 1 }} of {{ totalFiles }}</span>
            </div>
            <Button
              v-if="hasMultipleFiles"
              variant="ghost"
              size="sm"
              @click="toggleThumbnails"
              class="text-white hover:bg-white/20"
            >
              <Grid class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import {
  X,
  Download,
  Volume2,
  FileIcon,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  Grid
} from 'lucide-vue-next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileData } from '@/types'
import { useMediaTypes } from '@/composables/useMediaTypes'

interface Props {
  isOpen: boolean
  currentFile: FileData | null
  files: FileData[]
  currentIndex: number
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  currentFile: null,
  files: () => [],
  currentIndex: 0
})

const emit = defineEmits<{
  close: []
  download: [file: FileData]
  navigate: [index: number]
}>()

const { isImage, isVideo, isAudio, formatFileSize, formatDateLong } = useMediaTypes()

const isLoading = ref(false)
const hasError = ref(false)
const isAnimating = ref(false)
const showThumbnails = ref(false)
const mediaElement = ref<HTMLElement | null>(null)

const currentIsImage = computed(() => isImage(props.currentFile?.file_type))
const currentIsVideo = computed(() => isVideo(props.currentFile?.file_type))
const currentIsAudio = computed(() => isAudio(props.currentFile?.file_type))

const hasMultipleFiles = computed(() => props.files.length > 1)
const totalFiles = computed(() => props.files.length)
const hasPrevious = computed(() => props.currentIndex > 0)
const hasNext = computed(() => props.currentIndex < props.files.length - 1)

const mediaContainerStyle = computed(() => ({
  width: hasMultipleFiles.value && showThumbnails.value ? 'calc(100% - 6rem)' : '100%',
  height: '100%',
  padding: '4rem 1rem'
}))

const mediaAnimationClass = computed(() => {
  if (isLoading.value) {
    return 'scale-110 opacity-0'
  }
  if (isAnimating.value) {
    return 'scale-100 opacity-100'
  }
  return 'scale-100 opacity-100'
})

const imageStyle = computed(() => ({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain' as const
}))

const videoStyle = computed(() => ({
  maxWidth: '100%',
  maxHeight: '100%'
}))

// Utility functions for thumbnail type checking
const isImageFile = (file: FileData): boolean => isImage(file.file_type)
const isVideoFile = (file: FileData): boolean => isVideo(file.file_type)
const isAudioFile = (file: FileData): boolean => isAudio(file.file_type)

// Reset states and trigger animation when file changes
watch(() => props.currentFile, async () => {
  if (!props.currentFile) return
  
  isLoading.value = true
  hasError.value = false
  isAnimating.value = false
  
  await nextTick()
  
  // Start with overflow scale
  requestAnimationFrame(() => {
    isAnimating.value = true
  })
}, { immediate: true })

// Auto-show thumbnails after first navigation
let hasNavigated = false
watch(() => props.currentIndex, () => {
  if (!hasNavigated && hasMultipleFiles.value) {
    hasNavigated = true
    showThumbnails.value = true
  }
})

const handleClose = () => {
  showThumbnails.value = false
  hasNavigated = false
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

const handleThumbnailClick = (index: number) => {
  if (index !== props.currentIndex) {
    emit('navigate', index)
  }
}

const toggleThumbnails = () => {
  showThumbnails.value = !showThumbnails.value
}

const handleMediaLoad = async () => {
  isLoading.value = false
  hasError.value = false
  
  // Smooth animation completion
  await nextTick()
  setTimeout(() => {
    isAnimating.value = true
  }, 50)
}

const handleMediaError = () => {
  isLoading.value = false
  hasError.value = true
  isAnimating.value = false
}

const formatDate = (date: Date | string | undefined): string => {
  return formatDateLong(date)
}

// Keyboard navigation
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (!props.isOpen) return
    
    switch (event.key) {
      case 'ArrowLeft':
        handlePrevious()
        break
      case 'ArrowRight':
        handleNext()
        break
      case 'Escape':
        handleClose()
        break
      case 'g':
      case 'G':
        if (hasMultipleFiles.value) {
          toggleThumbnails()
        }
        break
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  return () => {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.scrollbar-track-transparent::-webkit-scrollbar-track {
  background-color: transparent;
}

.scale-102 {
  transform: scale(1.02);
}
</style> 