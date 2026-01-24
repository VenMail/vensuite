<template>
  <div
    :id="`mobileFileItem-${file.id}`"
    :class="fileItemClasses"
    @click="handleClick"
    @dblclick="openFile"
    @contextmenu.prevent.stop="handleContextMenu"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :style="touchFeedbackStyle"
  >
    <!-- Swipe Actions Background -->
    <div class="swipe-background" :class="swipeBackgroundClass">
      <div class="swipe-actions-left" v-if="swipeDirection === 'right'">
        <div class="swipe-action swipe-action-share">
          <Share2 class="h-5 w-5" />
        </div>
        <div class="swipe-action swipe-action-open">
          <FolderOpen class="h-5 w-5" />
        </div>
      </div>
      <div class="swipe-actions-right" v-if="swipeDirection === 'left'">
        <div class="swipe-action swipe-action-delete">
          <Trash2 class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- File Content -->
    <div class="file-content" :style="contentStyle">
      <!-- Selection Checkbox (Always visible on touch devices) -->
      <div
        v-if="isTouchDevice || showCheckbox || isSelected"
        class="selection-checkbox"
        @click.stop="handleSelection"
      >
        <div class="checkbox-container">
          <CheckIcon v-if="isSelected" class="check-icon" />
        </div>
      </div>

      <!-- File Preview/Icon -->
      <div class="file-preview">
        <!-- Image Preview -->
        <img
          v-if="isImageFile && mediaUrl"
          :src="mediaUrl"
          :alt="file.title"
          class="file-image"
          @error="handleImageError"
          @load="handleImageLoad"
        />
        
        <!-- Video Preview -->
        <video
          v-else-if="isVideoFile && mediaUrl"
          :src="mediaUrl"
          class="file-video"
          muted
          preload="metadata"
        />

        <!-- File Icon -->
        <div v-else class="file-icon-container">
          <FileIcon
            :fileType="fileType"
            :fileData="file"
            class="file-icon"
          />
          <div v-if="formattedFileSize" class="file-size-badge">
            {{ formattedFileSize }}
          </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="isLoading" class="loading-overlay">
          <Loader class="animate-spin h-6 w-6" />
        </div>
      </div>

      <!-- File Information -->
      <div class="file-info">
        <!-- Renaming Input -->
        <div v-if="isRenaming" class="rename-input-container">
          <Input
            v-model="newTitle"
            @keyup.enter="finishRenaming"
            @blur="finishRenaming"
            ref="renameInput"
            class="rename-input"
            :disabled="isLoading"
          />
          <div class="rename-indicator">
            <Loader v-if="isLoading" class="animate-spin h-3 w-3" />
            <span v-else class="rename-text">Renaming...</span>
          </div>
        </div>

        <!-- File Details -->
        <div v-else class="file-details">
          <h3 class="file-title">{{ file.title }}</h3>
          <div class="file-metadata">
            <span class="file-date">{{ formattedDate }}</span>
            <span v-if="file.is_folder" class="file-type-badge folder-badge">
              {{$t('Commons.text.folder')}}
            </span>
            <span v-else-if="file.file_type" class="file-type-badge">
              {{ file.file_type.toUpperCase() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Menu -->
      <div class="action-menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              class="action-menu-button"
              @click.stop
            >
              <MoreVertical class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="openFile">
              <FolderOpen class="h-4 w-4 mr-2" />
              {{$t('Commons.button.open')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="startRenaming">
              <Edit class="h-4 w-4 mr-2" />
              {{$t('Commons.button.rename')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="shareFile">
              <Share2 class="h-4 w-4 mr-2" />
              {{$t('Commons.button.share')}}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="downloadFile" v-if="!file.is_folder">
              <Download class="h-4 w-4 mr-2" />
              {{$t('Commons.button.download')}}
            </DropdownMenuItem>
            <DropdownMenuItem @click="deleteFile" class="text-destructive">
              <Trash2 class="h-4 w-4 mr-2" />
              {{$t('Commons.button.delete')}}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="showProgress" class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, PropType } from 'vue'
import { 
  CheckIcon, 
  Loader, 
  Share2, 
  FolderOpen, 
  Trash2, 
  MoreVertical,
  Edit,
  Download
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import FileIcon from '@/components/FileIcon.vue'
import { FileData } from '@/types'
import { useFileStore } from '@/store/files'

const props = defineProps({
  file: {
    type: Object as PropType<FileData>,
    required: true,
  },
  viewMode: {
    type: String as PropType<'list' | 'grid' | 'thumbnail'>,
    required: true,
  },
  isSelected: Boolean,
  isTouchDevice: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'select-file',
  'open-file',
  'update-file',
  'delete-file',
  'contextmenu-file',
  'swipe-left',
  'swipe-right',
])

const fileStore = useFileStore()

// State
const showCheckbox = ref(false)
const isRenaming = ref(false)
const newTitle = ref(props.file.title)
const isLoading = ref(false)
const renameInput = ref<HTMLInputElement>()

// Touch handling
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchStartTime = ref(0)
const longPressTimer = ref<NodeJS.Timeout | null>(null)
const swipeDirection = ref<'left' | 'right' | ''>('')
const swipeDistance = ref(0)
const isSwiping = ref(false)
const isLongPressing = ref(false)

// Touch feedback
const touchFeedbackStyle = computed(() => {
  if (isLongPressing.value) {
    return {
      transform: 'scale(0.95)',
      backgroundColor: 'hsl(var(--muted) / 0.5)',
      transition: 'all 0.1s ease-out'
    }
  }
  return {}
})

// Progress
const showProgress = ref(false)
const progressPercentage = ref(0)

// Computed properties
const fileType = computed(() => 
  props.file.is_folder ? 'folder' : props.file.file_type || ''
)

const isImageFile = computed(() => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  return imageTypes.includes(props.file.file_type?.toLowerCase() || '')
})

const isVideoFile = computed(() => {
  const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
  return videoTypes.includes(props.file.file_type?.toLowerCase() || '')
})

const mediaUrl = computed(() => (props.file as any).url || null)

const formattedFileSize = computed(() => {
  if (typeof props.file.file_size === 'string') {
    return props.file.file_size
  }
  if (typeof props.file.file_size === 'number') {
    return formatFileSize(props.file.file_size)
  }
  return null
})

const formattedDate = computed(() => {
  if (!props.file.created_at) return 'N/A'
  return new Date(props.file.created_at as any).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

const fileItemClasses = computed(() => {
  const base = 'mobile-file-item'
  const modeClass = `mobile-file-item--${props.viewMode}`
  const selectedClass = props.isSelected ? 'mobile-file-item--selected' : ''
  const swipingClass = isSwiping.value ? 'mobile-file-item--swiping' : ''
  
  return [base, modeClass, selectedClass, swipingClass].filter(Boolean).join(' ')
})

const swipeBackgroundClass = computed(() => {
  if (swipeDirection.value === 'left') return 'swipe-left'
  if (swipeDirection.value === 'right') return 'swipe-right'
  return ''
})

const contentStyle = computed(() => {
  if (!isSwiping.value) return {}
  
  const translateX = swipeDirection.value === 'left' 
    ? -Math.min(swipeDistance.value, 80)
    : Math.min(swipeDistance.value, 120)
  
  return {
    transform: `translateX(${translateX}px)`,
  }
})

// Methods
const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  if (i === 0) return `${bytes} B`
  
  const size = bytes / Math.pow(k, i)
  return `${size.toFixed(size < 10 ? 1 : 0)} ${sizes[i]}`
}

const handleClick = (event: MouseEvent) => {
  if (isRenaming.value) return
  
  const target = event.target as HTMLElement
  if (target.closest('.selection-checkbox, .action-menu-button')) {
    return
  }
  
  if (event.button !== 0) return
  if (target.closest('button, input')) return
  
  // On mobile, open the file directly instead of just selecting it
  console.log('MobileFileItem handleClick - isTouchDevice:', props.isTouchDevice, 'file:', props.file.title)
  if (props.isTouchDevice) {
    console.log('Opening file directly on mobile')
    openFile()
  } else {
    console.log('Selecting file on desktop')
    emit('select-file', props.file.id, event)
  }
}

const handleContextMenu = (event: MouseEvent) => {
  console.log('MobileFileItem handleContextMenu called for file:', props.file.title)
  emit('contextmenu-file', {
    id: props.file.id,
    x: event.clientX,
    y: event.clientY,
  })
  
  if (!props.isSelected) {
    emit('select-file', props.file.id, event)
  }
  
  event.preventDefault()
}

const handleSelection = () => {
  emit('select-file', props.file.id)
}

const openFile = () => {
  if (isRenaming.value) return
  emit('open-file', props.file.id)
}

// Touch handlers
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  touchStartTime.value = Date.now()
  isLongPressing.value = false
  
  // Start long press timer
  if (props.isTouchDevice) {
    longPressTimer.value = setTimeout(() => {
      isLongPressing.value = true
      // Show context menu on long press
      handleContextMenu({
        id: props.file.id || '',
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      } as any)
    }, 500) // 500ms for long press
  }
  
  // Check if at top of scroll for pull-to-refresh (handled by parent)
}

const handleTouchMove = (e: TouchEvent) => {
  // Clear long press if moving
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  if (isLongPressing.value) {
    isLongPressing.value = false
    return
  }
  
  const currentX = e.touches[0].clientX
  const currentY = e.touches[0].clientY
  const deltaX = currentX - touchStartX.value
  const deltaY = currentY - touchStartY.value
  
  // Check if this is a horizontal swipe
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    isSwiping.value = true
    swipeDistance.value = Math.abs(deltaX)
    
    if (deltaX > 0) {
      swipeDirection.value = 'right'
    } else {
      swipeDirection.value = 'left'
    }
    
    e.preventDefault()
  }
}

const handleTouchEnd = () => {
  // Clear long press timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // Handle swipe actions
  if (isSwiping.value) {
    if (swipeDirection.value === 'left' && swipeDistance.value > 60) {
      emit('swipe-left', props.file)
    } else if (swipeDirection.value === 'right' && swipeDistance.value > 60) {
      emit('swipe-right', props.file)
    }
  }
  
  // Reset touch state
  setTimeout(() => {
    isSwiping.value = false
    swipeDirection.value = ''
    swipeDistance.value = 0
    isLongPressing.value = false
  }, 300)
}

const handleTouchCancel = () => {
  // Clear long press timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // Reset touch state
  isSwiping.value = false
  swipeDirection.value = ''
  swipeDistance.value = 0
  isLongPressing.value = false
}

// File operations
const startRenaming = () => {
  isRenaming.value = true
  newTitle.value = props.file.title
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

const finishRenaming = async () => {
  if (newTitle.value && newTitle.value !== props.file.title) {
    isLoading.value = true
    try {
      if (props.file.id) {
        const updatedFile = await fileStore.renameItem(props.file.id, newTitle.value)
        emit('update-file', updatedFile)
      }
    } catch (error) {
      console.error('Error renaming file:', error)
    } finally {
      isLoading.value = false
    }
  }
  isRenaming.value = false
}

const deleteFile = async () => {
  isLoading.value = true
  try {
    if (props.file.id) {
      await fileStore.moveToTrash(props.file.id)
      emit('delete-file', props.file.id)
    }
  } catch (error) {
    console.error('Error deleting file:', error)
  } finally {
    isLoading.value = false
  }
}

const shareFile = () => {
  console.log('Share file:', props.file.title)
  // Implement share functionality
}

const downloadFile = () => {
  if (props.file.file_url) {
    const link = document.createElement('a')
    link.href = props.file.file_url
    link.download = props.file.title
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handleImageError = () => {
  // Handle image loading error
  console.warn('Failed to load image:', props.file.title)
}

const handleImageLoad = () => {
  // Handle successful image load
  console.log('Image loaded:', props.file.title)
}

// Mouse events for desktop (when touch is not available)
const handleMouseEnter = () => {
  if (!props.isTouchDevice) {
    showCheckbox.value = true
  }
}

const handleMouseLeave = () => {
  if (!props.isTouchDevice) {
    showCheckbox.value = false
  }
}

</script>

<style scoped>
.mobile-file-item {
  position: relative;
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 200ms ease;
  touch-action: pan-y;
}

.mobile-file-item--selected {
  box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary));
}

.mobile-file-item--swiping {
  transition: none;
}

/* Swipe Actions */
.swipe-background {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  background-color: hsl(var(--destructive) / 0.1);
}

.swipe-background.swipe-left {
  justify-content: flex-end;
}

.swipe-background.swipe-right {
  justify-content: flex-start;
}

.swipe-actions-left,
.swipe-actions-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 1rem;
}

.swipe-action {
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 200ms ease, color 200ms ease;
}

.swipe-action-share {
  background-color: rgb(59 130 246);
  color: #fff;
}

.swipe-action-open {
  background-color: rgb(34 197 94);
  color: #fff;
}

.swipe-action-delete {
  background-color: rgb(239 68 68);
  color: #fff;
}

/* File Content */
.file-content {
  position: relative;
  background-color: hsl(var(--card));
  display: flex;
  align-items: stretch;
  transition: transform 200ms ease;
}

/* Selection Checkbox */
.selection-checkbox {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 10;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-container {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--background));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;
}

.mobile-file-item--selected .checkbox-container {
  border-color: hsl(var(--primary));
  background-color: hsl(var(--primary));
}

.check-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: hsl(var(--primary-foreground));
}

/* Grid View Layout */
.mobile-file-item--grid .file-content {
  flex-direction: column;
  padding: 0.75rem;
  height: 8rem;
}

.mobile-file-item--grid .selection-checkbox {
  top: 0.5rem;
  left: 0.5rem;
}

.mobile-file-item--grid .file-preview {
  width: 100%;
  height: 4rem;
  margin-bottom: 0.5rem;
}

.mobile-file-item--grid .file-info {
  flex: 1;
  min-width: 0;
}

.mobile-file-item--grid .action-menu {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

/* Thumbnail View Layout */
.mobile-file-item--thumbnail .file-content {
  flex-direction: column;
  height: 10rem;
}

.mobile-file-item--thumbnail .file-preview {
  width: 100%;
  height: 6rem;
}

.mobile-file-item--thumbnail .file-info {
  padding: 0.75rem;
  flex: 1;
}

/* List View Layout */
.mobile-file-item--list .file-content {
  flex-direction: row;
  align-items: center;
  padding: 0.75rem;
  height: 4rem;
}

.mobile-file-item--list .file-preview {
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.mobile-file-item--list .file-info {
  flex: 1;
  min-width: 0;
}

.mobile-file-item--list .action-menu {
  margin-left: 0.5rem;
}

/* File Preview */
.file-preview {
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
}

.file-image,
.file-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background-color: hsl(var(--muted) / 0.3);
}

.file-icon {
  width: 2rem;
  height: 2rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.25rem;
}

.file-size-badge {
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background-color: hsl(var(--background) / 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

/* File Info */
.file-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rename-input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rename-input {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.rename-indicator {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  line-height: 1rem;
  color: rgb(217 119 6);
}

.dark .rename-indicator {
  color: rgb(251 191 36);
}

.rename-text {
  margin-left: 0.25rem;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-title {
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-metadata {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.file-date {
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--muted-foreground));
}

.file-type-badge {
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-weight: 600;
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.folder-badge {
  background-color: rgb(219 234 254);
  color: rgb(30 64 175);
}

.dark .folder-badge {
  background-color: rgb(30 58 138);
  color: rgb(191 219 254);
}

/* Action Menu */
.action-menu-button {
  height: 2rem;
  width: 2rem;
  padding: 0;
  border-radius: 0.375rem;
  transition: background-color 200ms ease;
}

.action-menu-button:hover {
  background-color: hsl(var(--muted));
}

/* Progress Bar */
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0.25rem;
  background-color: hsl(var(--muted));
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: hsl(var(--primary));
  transition: width 300ms ease;
}

/* Hover Effects */
.mobile-file-item:hover:not(.mobile-file-item--swiping) {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-color: hsl(var(--border) / 0.5);
}

/* Touch Feedback */
.mobile-file-item:active {
  transform: scale(0.98);
  transition: transform 100ms ease;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .swipe-background {
    background-color: hsl(var(--destructive) / 0.2);
  }
}
</style>
