<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
    <div class="text-xs font-semibold uppercase tracking-wide" :class="colorClasses">{{ label }}</div>
    <div class="mt-2 text-sm text-gray-900 dark:text-gray-100">{{ sheets.length }}</div>
    <div class="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
      <div v-for="name in sheets" :key="name">{{ name }}</div>
      <div v-if="sheets.length === 0">{{ emptyText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  color: 'green' | 'amber' | 'rose' | 'sky'
  sheets: string[]
  emptyText: string
}>()

const colorMap: Record<string, string> = {
  green: 'text-green-600 dark:text-green-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  sky: 'text-sky-600 dark:text-sky-400',
}

const colorClasses = computed(() => colorMap[props.color] ?? colorMap.sky)
</script>
