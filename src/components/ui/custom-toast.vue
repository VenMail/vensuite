<script setup lang="ts">
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { computed, inject } from 'vue'
import type { Component } from 'vue'

const props = defineProps<{
  message: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'promise'
  action?: {
    label: string
    onClick: () => void
  }
  progress?: number
  class?: string
  onClose?: () => void
}>()

const variantIcon = computed<Component | null>(() => {
  switch (props.variant) {
    case 'success':
      return CheckCircle
    case 'error':
      return AlertCircle
    case 'info':
      return Info
    case 'warning':
      return AlertTriangle
    case 'promise':
      return Loader2
    default:
      return null
  }
})

const variantColor = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'text-green-500 dark:text-green-400'
    case 'error':
      return 'text-red-500 dark:text-red-400'
    case 'info':
      return 'text-blue-500 dark:text-blue-400'
    case 'warning':
      return 'text-yellow-500 dark:text-yellow-400'
    case 'promise':
      return 'text-blue-500 dark:text-blue-400'
    default:
      return ''
  }
})

const toastClasses = computed(() => cn(
  'relative flex min-w-[350px] items-center rounded-t-none rounded-b-sm p-4 shadow overflow-hidden',
  'bg-white dark:bg-gray-800',
  'border border-gray-200 dark:border-gray-700'
))
</script>

<template>
  <div :class="toastClasses">
    <div class="flex flex-1 items-center justify-between gap-x-4">
      <div class="flex items-center space-x-3 min-w-0">
        <component
          v-if="variantIcon"
          :is="variantIcon"
          :class="['h-5 w-5', variantColor, props.class]"
        />
        <p class="text-sm text-gray-900 dark:text-gray-100 whitespace-normal">{{ message }}</p>
        <button
          v-if="action"
          @click="action.onClick"
          class="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {{ action.label }}
        </button>
      </div>
      <button
        @click="onClose"
        class="shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X class="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <span class="sr-only">Close</span>
      </button>
    </div>
    <div class="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden">
      <div
        v-if="progress === undefined"
        class="animate-progress h-full bg-primary-600 dark:bg-primary-500"
      />
      <div
        v-else
        class="h-full bg-primary-600 dark:bg-primary-500 transition-all duration-300"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-progress {
  animation: progress 5s linear forwards;
}
</style> 