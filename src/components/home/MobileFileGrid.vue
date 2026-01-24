<template>
  <div class="mobile-file-grid">
    <!-- Pull to Refresh Indicator -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isRefreshing" class="pull-refresh-indicator">
        <Loader class="animate-spin h-5 w-5 mr-2" />
        <span class="text-sm">Refreshing...</span>
      </div>
    </Transition>

    <!-- File Grid Container -->
    <div
      ref="gridContainer"
      class="file-grid-container"
      :class="gridClasses"
      @scroll="handleScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Empty State -->
      <div v-if="items.length === 0 && !isLoading" class="empty-state">
        <div class="empty-state-content">
          <div class="empty-icon">
            <component :is="emptyIcon" class="h-16 w-16" />
          </div>
          <h3 class="empty-title">{{ emptyTitle }}</h3>
          <p class="empty-description">{{ emptyDescription }}</p>
          
          <div class="empty-actions">
            <Button @click="$emit('create-document')" class="w-full mb-2">
              <FileText class="h-4 w-4 mr-2" />
              {{$t('Commons.button.new_document')}}
            </Button>
            <Button @click="$emit('upload-file')" variant="outline" class="w-full">
              <Upload class="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>

      <!-- File Items -->
      <template v-else>
        <!-- Group Headers -->
        <div v-for="(group, groupName) in groupedItems" :key="groupName" class="file-group">
          <!-- Group Header -->
          <div v-if="showGroupHeaders && Object.keys(groupedItems).length > 1" class="group-header">
            <h3 class="group-title">{{ formatGroupName(groupName) }}</h3>
            <span class="group-count">{{ group.length }} items</span>
          </div>

          <!-- File Items Grid -->
          <div class="file-items-grid">
            <MobileFileItem
              v-for="item in group"
              :key="item.id"
              :file="item"
              :view-mode="viewMode"
              :is-selected="item.id ? selectedFiles.has(item.id) : false"
              :is-touch-device="isTouchDevice"
              @select-file="$emit('select-file', $event)"
              @open-file="$emit('open-file', $event)"
              @update-file="$emit('update-file', $event)"
              @delete-file="$emit('delete-file', $event)"
              @contextmenu-file="$emit('contextmenu-file', $event)"
              @swipe-left="handleSwipeLeft(item)"
              @swipe-right="handleSwipeRight(item)"
            />
          </div>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-content">
          <Loader class="animate-spin h-8 w-8 mb-4" />
          <p class="loading-text">{{ loadingText }}</p>
        </div>
      </div>

      <!-- Load More Trigger -->
      <div
        v-if="hasMore && !isLoading"
        ref="loadMoreTrigger"
        class="load-more-trigger"
      >
        <div class="load-more-indicator">
          <Loader class="animate-spin h-4 w-4 mr-2" />
          <span class="text-sm text-muted-foreground">Loading more...</span>
        </div>
      </div>
    </div>

    <!-- Swipe Actions Overlay -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="swipeActions.visible" class="swipe-actions-overlay" @click="clearSwipeActions">
        <div class="swipe-actions" :style="swipeActions.style">
          <Button
            variant="destructive"
            size="sm"
            class="swipe-action-btn"
            @click="handleSwipeAction('delete')"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="swipe-action-btn"
            @click="handleSwipeAction('share')"
          >
            <Share2 class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="swipe-action-btn"
            @click="handleSwipeAction('open')"
          >
            <FolderOpen class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loader, FileText, Upload, FolderOpen, Share2, Trash2, FolderIcon, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { FileData } from '@/types'
import MobileFileItem from './MobileFileItem.vue'
import { useMobileFirst } from '@/composables/useMobileFirst'

interface Props {
  items: FileData[]
  viewMode: 'grid' | 'list' | 'thumbnail'
  selectedFiles: Set<string>
  isLoading: boolean
  isRefreshing: boolean
  hasMore: boolean
  showGroupHeaders: boolean
  loadingText: string
  emptyTitle: string
  emptyDescription: string
  searchQuery: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isRefreshing: false,
  hasMore: false,
  showGroupHeaders: true,
  loadingText: 'Loading your files...',
  emptyTitle: 'No files found',
  emptyDescription: 'Get started by creating your first document or uploading files.',
  searchQuery: ''
})

const emit = defineEmits<{
  'select-file': [fileId: string, event?: MouseEvent]
  'open-file': [fileId: string]
  'update-file': [payload: string | FileData]
  'delete-file': [fileId: string]
  'contextmenu-file': [event: { id: string; x: number; y: number }]
  'create-document': []
  'upload-file': []
  'load-more': []
  'refresh': []
  'swipe-action': [action: { fileId: string; action: 'delete' | 'share' | 'open' }]
}>()

const { isTouchDevice } = useMobileFirst()

// Refs
const gridContainer = ref<HTMLElement>()
const loadMoreTrigger = ref<HTMLElement>()

// Touch handling for pull-to-refresh
const touchStartY = ref(0)
const touchStartX = ref(0)
const isPulling = ref(false)
const pullDistance = ref(0)

// Swipe actions
const swipeActions = ref({
  visible: false,
  fileId: '',
  style: {},
  action: ''
})

// Grid classes based on view mode and screen size
const gridClasses = computed(() => {
  const base = 'file-grid'
  
  switch (props.viewMode) {
    case 'grid':
      return `${base} grid-view`
    case 'thumbnail':
      return `${base} thumbnail-view`
    case 'list':
      return `${base} list-view`
    default:
      return `${base} grid-view`
  }
})

// Group items by file type
const groupedItems = computed(() => {
  if (!props.showGroupHeaders) {
    return { 'all': props.items }
  }

  const groups: Record<string, FileData[]> = {}
  
  props.items.forEach((item) => {
    let groupName: string
    
    if (item.is_folder) {
      groupName = 'folders'
    } else {
      const fileType = item.file_type?.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileType || '')) {
        groupName = 'images'
      } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(fileType || '')) {
        groupName = 'videos'
      } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(fileType || '')) {
        groupName = 'audio'
      } else if (['docx', 'doc', 'pdf', 'txt', 'rtf'].includes(fileType || '')) {
        groupName = 'documents'
      } else if (['xlsx', 'xls', 'csv', 'ods'].includes(fileType || '')) {
        groupName = 'spreadsheets'
      } else if (['pptx', 'ppt'].includes(fileType || '')) {
        groupName = 'presentations'
      } else {
        groupName = 'other'
      }
    }
    
    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push(item)
  })
  
  return groups
})

// Empty state icon based on search query
const emptyIcon = computed(() => {
  if (props.searchQuery) {
    return Search
  }
  return FolderIcon
})

// Format group name for display
const formatGroupName = (name: string) => {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Touch handlers
const handleTouchStart = (e: TouchEvent) => {
  touchStartY.value = e.touches[0].clientY
  touchStartX.value = e.touches[0].clientX
  
  // Check if at top of scroll for pull-to-refresh
  if (gridContainer.value && gridContainer.value.scrollTop === 0) {
    isPulling.value = true
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value) return
  
  const currentY = e.touches[0].clientY
  const deltaY = currentY - touchStartY.value
  
  if (deltaY > 0) {
    pullDistance.value = Math.min(deltaY * 0.5, 100) // Dampen the pull
    e.preventDefault()
  }
}

const handleTouchEnd = () => {
  if (isPulling.value && pullDistance.value > 60) {
    // Trigger refresh
    emit('refresh')
  }
  
  isPulling.value = false
  pullDistance.value = 0
}

// Scroll handler for infinite loading
const handleScroll = () => {
  if (!gridContainer.value || !loadMoreTrigger.value) return
  
  const { scrollTop, clientHeight } = gridContainer.value
  const triggerPosition = loadMoreTrigger.value.offsetTop
  
  // Load more when trigger is 200px away from view
  if (scrollTop + clientHeight >= triggerPosition - 200 && props.hasMore && !props.isLoading) {
    emit('load-more')
  }
}

// Swipe action handlers
const handleSwipeLeft = (file: FileData) => {
  if (!isTouchDevice.value) return
  
  swipeActions.value = {
    visible: true,
    fileId: file.id || '',
    style: {
      right: '0',
      top: '50%',
      transform: 'translateY(-50%)'
    },
    action: ''
  }
}

const handleSwipeRight = (file: FileData) => {
  if (!isTouchDevice.value) return
  
  swipeActions.value = {
    visible: true,
    fileId: file.id || '',
    style: {
      left: '0',
      top: '50%',
      transform: 'translateY(-50%)'
    },
    action: ''
  }
}

const clearSwipeActions = () => {
  swipeActions.value.visible = false
}

const handleSwipeAction = (action: 'delete' | 'share' | 'open') => {
  if (swipeActions.value.fileId) {
    emit('swipe-action', {
      fileId: swipeActions.value.fileId,
      action
    })
  }
  clearSwipeActions()
}

// Intersection Observer for load more
onMounted(() => {
  if (!loadMoreTrigger.value) return
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && props.hasMore && !props.isLoading) {
          emit('load-more')
        }
      })
    },
    { threshold: 0.1 }
  )
  
  observer.observe(loadMoreTrigger.value)
  
  onUnmounted(() => {
    observer.disconnect()
  })
})
</script>

<style scoped>
.mobile-file-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.file-grid-container {
  flex: 1;
  overflow-y: auto;
  /* Custom scrollbar styling */
}

.file-grid-container::-webkit-scrollbar {
  width: 6px;
}

.file-grid-container::-webkit-scrollbar-track {
  background: transparent;
}

.file-grid-container::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.file-grid-container::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

.dark .file-grid-container::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.2);
}

.dark .file-grid-container::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.4);
}

/* Pull to refresh */
.pull-refresh-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  color: hsl(var(--muted-foreground));
  background-color: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

/* File grid layouts */
.file-grid.grid-view {
  padding: 1rem;
}

.file-grid.thumbnail-view,
.file-grid.list-view {
  padding: 0.5rem;
}

.file-group {
  margin-bottom: 1.5rem;
}

.file-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  margin-bottom: 0.75rem;
}

.group-title {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.group-count {
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--muted-foreground));
}

.file-items-grid.grid-view {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.file-items-grid.thumbnail-view {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.file-items-grid.list-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Empty state */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 0 1.5rem;
}

.empty-state-content {
  text-align: center;
  max-width: 24rem;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  border-radius: 9999px;
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.empty-title {
  font-size: 1.125rem;
  line-height: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.5rem;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Loading state */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.loading-content {
  text-align: center;
}

.loading-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: hsl(var(--muted-foreground));
}

/* Load more trigger */
.load-more-trigger {
  padding: 1rem 0;
}

.load-more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
}

/* Swipe actions */
.swipe-actions-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.swipe-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  margin-right: 1rem;
}

.swipe-action-btn {
  min-width: 44px;
  min-height: 44px;
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .file-items-grid.grid-view {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  
  .file-items-grid.thumbnail-view {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }
}

@media (min-width: 768px) {
  .file-items-grid.grid-view {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }
  
  .file-items-grid.thumbnail-view {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .pull-refresh-indicator {
    border-color: rgb(55 65 81);
  }
  
  .swipe-actions {
    background-color: rgb(31 41 55);
    border-color: rgb(55 65 81);
  }
}

/* Smooth scrolling */
.file-grid-container {
  scroll-behavior: smooth;
}

/* Overscroll behavior for pull-to-refresh */
.file-grid-container {
  overscroll-behavior-y: contain;
}
</style>
