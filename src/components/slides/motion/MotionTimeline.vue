<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Settings, Maximize2, Minimize2 } from 'lucide-vue-next'
import { useMotionConfig } from '@/composables/useMotionConfig'
import type { MotionConfig, ElementMotionConfig } from '@/types/motion'

interface TimelineItem {
  id: string
  name: string
  type: 'slide' | 'content' | 'item' | 'progress'
  startTime: number
  duration: number
  variant: string
  trigger: string
  color: string
  element?: ElementMotionConfig
}

interface TimelineTrack {
  id: string
  name: string
  type: 'slide' | 'content' | 'elements'
  items: TimelineItem[]
  color: string
}

const props = withDefaults(defineProps<{
  config?: MotionConfig
  currentTime?: number
  isPlaying?: boolean
  duration?: number
  compact?: boolean
  showControls?: boolean
  showSettings?: boolean
}>(), {
  currentTime: 0,
  isPlaying: false,
  duration: 5000,
  compact: false,
  showControls: true,
  showSettings: true
})

const emit = defineEmits<{
  'update:current-time': [time: number]
  'update:is-playing': [playing: boolean]
  'item-selected': [item: TimelineItem]
  'item-click': [item: TimelineItem]
  'settings-click': []
}>()

// Internal state
const timelineRef = ref<HTMLElement>()
const isDragging = ref(false)
const isFullscreen = ref(false)
const zoomLevel = ref(1)
const selectedItemId = ref<string | null>(null)
const hoveredItemId = ref<string | null>(null)

// Motion config
const motionConfig = useMotionConfig(props.config)

// Timeline calculations
const timelineDuration = computed(() => {
  if (props.duration) return props.duration
  
  // Calculate based on all animations
  let maxTime = 1000 // Base duration
  
  // Add slide animation
  if (motionConfig.slideConfig.value) {
    maxTime = Math.max(maxTime, (motionConfig.slideConfig.value.delay || 0) + (motionConfig.slideConfig.value.duration || 600))
  }
  
  // Add content animation
  if (motionConfig.contentConfig.value) {
    const contentTime = (motionConfig.contentConfig.value.delay || 0) + 
                       (motionConfig.contentConfig.value.delayChildren || 0) + 
                       (motionConfig.contentConfig.value.duration || 800)
    maxTime = Math.max(maxTime, contentTime)
  }
  
  // Add element animations
  Object.values(motionConfig.elements.value).forEach(element => {
    const elementTime = (element.delay || 0) + (element.duration || 500)
    maxTime = Math.max(maxTime, elementTime)
  })
  
  return maxTime
})

// Generate timeline tracks
const timelineTracks = computed((): TimelineTrack[] => {
  const tracks: TimelineTrack[] = []
  
  // Slide track
  if (motionConfig.slideConfig.value) {
    const slideConfig = motionConfig.slideConfig.value
    tracks.push({
      id: 'slide',
      name: 'Slide',
      type: 'slide',
      color: '#8b5cf6',
      items: [{
        id: 'slide-main',
        name: `${slideConfig.variant} transition`,
        type: 'slide',
        startTime: slideConfig.delay || 0,
        duration: slideConfig.duration || 600,
        variant: slideConfig.variant,
        trigger: slideConfig.trigger,
        color: '#8b5cf6'
      }]
    })
  }
  
  // Content track
  if (motionConfig.contentConfig.value) {
    const contentConfig = motionConfig.contentConfig.value
    tracks.push({
      id: 'content',
      name: 'Content',
      type: 'content',
      color: '#3b82f6',
      items: [{
        id: 'content-main',
        name: `${contentConfig.variant} stagger`,
        type: 'content',
        startTime: contentConfig.delay || 0,
        duration: contentConfig.duration || 800,
        variant: contentConfig.variant,
        trigger: contentConfig.trigger,
        color: '#3b82f6'
      }]
    })
  }
  
  // Elements track
  const elementItems: TimelineItem[] = []
  Object.entries(motionConfig.elements.value).forEach(([elementId, elementConfig], index) => {
    if (elementConfig.cssAnimation?.enabled) {
      elementItems.push({
        id: elementId,
        name: `Element ${index + 1}`,
        type: elementConfig.type,
        startTime: elementConfig.delay || 0,
        duration: elementConfig.duration || 500,
        variant: elementConfig.variant,
        trigger: elementConfig.trigger,
        color: getElementColor(elementConfig.type),
        element: elementConfig
      })
    }
  })
  
  if (elementItems.length > 0) {
    tracks.push({
      id: 'elements',
      name: 'Elements',
      type: 'elements',
      color: '#10b981',
      items: elementItems.sort((a, b) => a.startTime - b.startTime)
    })
  }
  
  return tracks
})

// Computed positions
const currentTimePosition = computed(() => {
  return (props.currentTime / timelineDuration.value) * 100
})

const timeScale = computed(() => {
  const baseScale = 100 / timelineDuration.value
  return baseScale * zoomLevel.value
})

// Helper functions
function getElementColor(type: string): string {
  switch (type) {
    case 'item': return '#10b981'
    case 'content': return '#3b82f6'
    case 'progress': return '#f59e0b'
    default: return '#6b7280'
  }
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const milliseconds = Math.floor((ms % 1000) / 100)
  return `${seconds}.${milliseconds}s`
}

function getItemPosition(item: TimelineItem): number {
  return (item.startTime * timeScale.value)
}

function getItemWidth(item: TimelineItem): number {
  return (item.duration * timeScale.value)
}

// Event handlers
function handleTimelineClick(event: MouseEvent) {
  if (!timelineRef.value || isDragging.value) return
  
  const rect = timelineRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * timelineDuration.value
  
  emit('update:current-time', Math.max(0, Math.min(newTime, timelineDuration.value)))
}

function handleItemClick(item: TimelineItem) {
  selectedItemId.value = item.id
  emit('item-selected', item)
  emit('item-click', item)
}

function handlePlayPause() {
  emit('update:is-playing', !props.isPlaying)
}

function handleRestart() {
  emit('update:current-time', 0)
  emit('update:is-playing', true)
}

function handleSkip(direction: 'backward' | 'forward') {
  const step = timelineDuration.value * 0.1 // 10% steps
  const newTime = direction === 'backward' 
    ? Math.max(0, props.currentTime - step)
    : Math.min(timelineDuration.value, props.currentTime + step)
  
  emit('update:current-time', newTime)
}

function handleZoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value * 1.5, 5)
}

function handleZoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.5)
}

function handleResetZoom() {
  zoomLevel.value = 1
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (event.code === 'Space') {
    event.preventDefault()
    handlePlayPause()
  } else if (event.code === 'ArrowLeft') {
    handleSkip('backward')
  } else if (event.code === 'ArrowRight') {
    handleSkip('forward')
  } else if (event.code === 'KeyR') {
    handleRestart()
  } else if (event.code === 'Equal' || event.code === 'NumpadAdd') {
    handleZoomIn()
  } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
    handleZoomOut()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div 
    class="motion-timeline"
    :class="{ 
      'compact': compact, 
      'fullscreen': isFullscreen,
      'no-controls': !showControls 
    }"
  >
    <!-- Header -->
    <div v-if="!compact" class="timeline-header">
      <div class="timeline-title">
        <h3>Animation Timeline</h3>
        <span class="timeline-duration">{{ formatTime(timelineDuration) }}</span>
      </div>
      
      <div class="timeline-actions">
        <button
          v-if="showSettings"
          @click="$emit('settings-click')"
          class="timeline-btn"
          title="Settings"
        >
          <Settings class="h-4 w-4" />
        </button>
        
        <button
          @click="toggleFullscreen"
          class="timeline-btn"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
        >
          <Minimize2 v-if="isFullscreen" class="h-4 w-4" />
          <Maximize2 v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div v-if="showControls" class="timeline-controls">
      <div class="playback-controls">
        <button @click="handleRestart" class="timeline-btn" title="Restart">
          <RotateCcw class="h-4 w-4" />
        </button>
        
        <button @click="handleSkip('backward')" class="timeline-btn" title="Skip Backward">
          <SkipBack class="h-4 w-4" />
        </button>
        
        <button @click="handlePlayPause" class="timeline-btn primary" :title="isPlaying ? 'Pause' : 'Play'">
          <Pause v-if="isPlaying" class="h-5 w-5" />
          <Play v-else class="h-5 w-5" />
        </button>
        
        <button @click="handleSkip('forward')" class="timeline-btn" title="Skip Forward">
          <SkipForward class="h-4 w-4" />
        </button>
      </div>
      
      <div class="time-display">
        <span>{{ formatTime(currentTime) }}</span>
        <span class="time-separator">/</span>
        <span>{{ formatTime(timelineDuration) }}</span>
      </div>
      
      <div class="zoom-controls">
        <button @click="handleZoomOut" class="timeline-btn" title="Zoom Out">
          <span class="text-xs">−</span>
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="handleZoomIn" class="timeline-btn" title="Zoom In">
          <span class="text-xs">+</span>
        </button>
        <button @click="handleResetZoom" class="timeline-btn" title="Reset Zoom">
          <span class="text-xs">100%</span>
        </button>
      </div>
    </div>

    <!-- Timeline -->
    <div class="timeline-container">
      <div 
        ref="timelineRef"
        class="timeline-track"
        @click="handleTimelineClick"
      >
        <!-- Time markers -->
        <div class="time-markers">
          <div 
            v-for="marker in 5" 
            :key="marker"
            class="time-marker"
            :style="{ left: `${(marker - 1) * 25}%` }"
          >
            <span class="marker-label">{{ formatTime((marker - 1) * timelineDuration / 4) }}</span>
          </div>
        </div>
        
        <!-- Timeline tracks -->
        <div class="timeline-tracks">
          <div 
            v-for="track in timelineTracks"
            :key="track.id"
            class="timeline-track-row"
          >
            <div class="track-label">{{ track.name }}</div>
            
            <div class="track-items">
              <div
                v-for="item in track.items"
                :key="item.id"
                class="timeline-item"
                :class="{ 
                  'selected': selectedItemId === item.id,
                  'hovered': hoveredItemId === item.id
                }"
                :style="{
                  left: `${getItemPosition(item)}px`,
                  width: `${getItemWidth(item)}px`,
                  backgroundColor: item.color,
                  opacity: item.startTime <= currentTime ? 1 : 0.3
                }"
                @click.stop="handleItemClick(item)"
                @mouseenter="hoveredItemId = item.id"
                @mouseleave="hoveredItemId = null"
              >
                <div class="item-content">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-variant">{{ item.variant }}</span>
                </div>
                
                <!-- Tooltip -->
                <div class="item-tooltip">
                  <div class="tooltip-title">{{ item.name }}</div>
                  <div class="tooltip-details">
                    <div>Variant: {{ item.variant }}</div>
                    <div>Trigger: {{ item.trigger }}</div>
                    <div>Start: {{ formatTime(item.startTime) }}</div>
                    <div>Duration: {{ formatTime(item.duration) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Current time indicator -->
        <div 
          class="current-time-indicator"
          :style="{ left: `${currentTimePosition}%` }"
        >
          <div class="time-handle"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.motion-timeline {
  background-color: white;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  overflow: hidden;
}

.dark .motion-timeline {
  background-color: rgb(17 24 39);
  border-color: rgb(55 65 81);
}

.motion-timeline.compact {
  border: 0;
  border-radius: 0;
}

.motion-timeline.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 50;
  border-radius: 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: rgb(249 250 251);
  border-bottom: 1px solid rgb(229 231 235);
}

.dark .timeline-header {
  background-color: rgb(31 41 55);
  border-bottom-color: rgb(55 65 81);
}

.timeline-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timeline-title h3 {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(17 24 39);
}

.dark .timeline-title h3 {
  color: rgb(243 244 246);
}

.timeline-duration {
  font-size: 0.75rem;
  color: rgb(107 114 128);
}

.dark .timeline-duration {
  color: rgb(156 163 175);
}

.timeline-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.timeline-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: rgb(249 250 251);
  border-bottom: 1px solid rgb(229 231 235);
}

.dark .timeline-controls {
  background-color: rgb(31 41 55);
  border-bottom-color: rgb(55 65 81);
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  color: rgb(55 65 81);
}

.dark .time-display {
  color: rgb(209 213 219);
}

.time-separator {
  color: rgb(156 163 175);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.zoom-level {
  font-size: 0.75rem;
  color: rgb(75 85 99);
  min-width: 3rem;
  text-align: center;
}

.dark .zoom-level {
  color: rgb(156 163 175);
}

.timeline-btn {
  padding: 0.375rem;
  border-radius: 0.375rem;
  color: rgb(75 85 99);
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.timeline-btn:hover {
  background-color: rgb(229 231 235);
  color: rgb(17 24 39);
}

.dark .timeline-btn {
  color: rgb(156 163 175);
}

.dark .timeline-btn:hover {
  background-color: rgb(55 65 81);
  color: rgb(243 244 246);
}

.timeline-btn.primary {
  background-color: rgb(59 130 246);
  color: white;
}

.timeline-btn.primary:hover {
  background-color: rgb(37 99 235);
}

.timeline-container {
  padding: 1rem;
  overflow: auto;
}

.timeline-track {
  position: relative;
  background-color: rgb(243 244 246);
  border-radius: 0.5rem;
  min-height: 200px;
}

.dark .timeline-track {
  background-color: rgb(31 41 55);
}

.time-markers {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1.5rem;
  display: flex;
  pointer-events: none;
}

.time-marker {
  position: absolute;
  top: 0;
  height: 100%;
  border-left: 1px solid rgb(209 213 226);
}

.dark .time-marker {
  border-left-color: rgb(75 85 99);
}

.marker-label {
  position: absolute;
  top: -1.25rem;
  left: 0;
  font-size: 0.75rem;
  color: rgb(107 114 128);
  transform: translateX(-50%);
}

.dark .marker-label {
  color: rgb(156 163 175);
}

.timeline-tracks {
  position: relative;
  padding-top: 2rem;
}

.timeline-track-row {
  display: flex;
  align-items: center;
  height: 3rem;
  border-bottom: 1px solid rgb(229 231 235);
}

.timeline-track-row:last-child {
  border-bottom: 0;
}

.dark .timeline-track-row {
  border-bottom-color: rgb(55 65 81);
}

.track-label {
  width: 5rem;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(55 65 81);
  background-color: rgb(229 231 235);
  height: 100%;
  display: flex;
  align-items: center;
}

.dark .track-label {
  color: rgb(209 213 219);
  background-color: rgb(55 65 81);
}

.track-items {
  flex: 1;
  position: relative;
  height: 100%;
}

.timeline-item {
  position: absolute;
  top: 0.25rem;
  bottom: 0.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  color: white;
  font-size: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.timeline-item:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  z-index: 10;
}

.timeline-item.selected {
  box-shadow: 0 0 0 2px rgb(59 130 246), 0 0 0 1px white;
}

.timeline-item.hovered {
  transform: scale(1.05);
  z-index: 20;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.item-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-variant {
  font-size: 0.75rem;
  opacity: 0.75;
}

.item-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: rgb(17 24 39);
  color: white;
  font-size: 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease-in-out;
  white-space: nowrap;
  z-index: 30;
}

.dark .item-tooltip {
  background-color: rgb(243 244 246);
  color: rgb(17 24 39);
}

.timeline-item:hover .item-tooltip {
  opacity: 1;
}

.tooltip-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.tooltip-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.current-time-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0.125rem;
  background-color: rgb(239 68 68);
  pointer-events: none;
  z-index: 20;
}

.time-handle {
  position: absolute;
  left: -0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  background-color: rgb(239 68 68);
  border-radius: 50%;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

/* Compact styles */
.motion-timeline.compact .timeline-header,
.motion-timeline.compact .timeline-controls {
  padding: 0.25rem 0.5rem;
}

.motion-timeline.compact .timeline-title h3 {
  font-size: 0.75rem;
}

.motion-timeline.compact .timeline-btn {
  padding: 0.25rem;
}

.motion-timeline.compact .timeline-container {
  padding: 0.5rem;
}

.motion-timeline.compact .timeline-track {
  min-height: 120px;
}

.motion-timeline.compact .timeline-track-row {
  height: 2rem;
}

.motion-timeline.compact .track-label {
  width: 4rem;
  font-size: 0.75rem;
}

.motion-timeline.compact .timeline-item {
  top: 0.125rem;
  bottom: 0.125rem;
  padding: 0.25rem;
}

/* Fullscreen styles */
.motion-timeline.fullscreen .timeline-container {
  padding: 2rem;
}

.motion-timeline.fullscreen .timeline-track {
  min-height: 400px;
}

.motion-timeline.fullscreen .timeline-track-row {
  height: 4rem;
}

.motion-timeline.fullscreen .track-label {
  width: 6rem;
  font-size: 0.875rem;
}

.motion-timeline.fullscreen .timeline-item {
  top: 0.5rem;
  bottom: 0.5rem;
  padding: 0.75rem;
}
</style>
