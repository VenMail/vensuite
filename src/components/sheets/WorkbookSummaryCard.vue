<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ title }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ subtitle }}</div>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ summary?.sheetCount ?? 0 }} sheets
      </div>
    </div>

    <div v-if="summary" class="space-y-2">
      <div
        v-for="sheet in summary.sheets"
        :key="sheet.id"
        class="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200"
      >
        <span class="truncate font-medium">{{ sheet.name }}</span>
        <span class="ml-3 shrink-0 text-gray-500 dark:text-gray-400">{{ sheet.rowCount }}&times;{{ sheet.columnCount }} &middot; {{ sheet.populatedCellCount }} filled</span>
      </div>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400">{{ fallbackText }}</div>
  </div>
</template>

<script setup lang="ts">
interface SheetSummary {
  id: string
  name: string
  rowCount: number
  columnCount: number
  populatedCellCount: number
}

interface WorkbookSummary {
  sheetCount: number
  sheets: SheetSummary[]
}

withDefaults(defineProps<{
  title: string
  subtitle: string
  summary: WorkbookSummary | null
  fallbackText?: string
}>(), {
  fallbackText: 'Summary unavailable.',
})
</script>
