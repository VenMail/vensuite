<template>
  <div ref="container" class="vtable-sheet-container" :class="$attrs.class" style="width: 100%; height: 100%;" />
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { VTableSheet } from '@visactor/vtable-sheet'
import type { IVTableSheetOptions } from '@visactor/vtable-sheet'
import { patchVTableSheetLocale } from '@/utils/vtableI18n'

defineOptions({
  inheritAttrs: false,
})

type WorkSheet = {
  tableInstance?: { on: (event: string, cb: (...args: any[]) => void) => void }
  sheetKey: string
}

const props = defineProps<{
  initialConfig: IVTableSheetOptions
}>()

const emit = defineEmits<{
  ready: [{ instance: VTableSheet }]
  change: [{ type: string; sheetKey?: string }]
  'chart-action': [key: string]
}>()

const container = ref<HTMLElement>()
let instance: VTableSheet | null = null
let cleanupLocale: (() => void) | null = null
let readyFired = false
let resizeObserver: ResizeObserver | null = null

const CHANGE_EVENTS = ['change_cell_value', 'add_record', 'delete_record', 'add_column', 'delete_column'] as const

function resolveTheme(theme?: IVTableSheetOptions['theme']): IVTableSheetOptions['theme'] {
  // Pass theme through unchanged to avoid interfering with VTable's internal positioning
  return theme
}

function attachSheetListeners(sheet: WorkSheet, sheetKey: string) {
  const ti = sheet.tableInstance
  if (!ti) return
  for (const evType of CHANGE_EVENTS) {
    ti.on(evType, () => emit('change', { type: evType, sheetKey }))
  }
  ti.on('dropdown_menu_click', (args: any) => {
    if (typeof args?.menuKey === 'string' && args.menuKey.startsWith('chart_')) {
      emit('chart-action', args.menuKey)
    }
  })
}

function onReady() {
  // Guard: spreadsheet_ready may never fire — called from nextTick fallback too
  if (readyFired) return
  readyFired = true
  if (!instance) return

  // Attach change listeners to all loaded sheets
  const inst = instance as any
  for (const sheet of inst.workSheetInstances?.values?.() ?? []) {
    attachSheetListeners(sheet as WorkSheet, (sheet as WorkSheet).sheetKey)
  }
  inst.on?.('sheet_added', (e: any) => {
    const sheet = inst.workSheetInstances?.get(e.sheetKey)
    if (sheet) attachSheetListeners(sheet, e.sheetKey)
  })

  // Patch all Chinese strings now that DOM is fully built
  if (container.value) {
    cleanupLocale = patchVTableSheetLocale(container.value)
  }

  emit('ready', { instance })
}

onMounted(async () => {
  if (!container.value) return

  instance = new VTableSheet(container.value, props.initialConfig)

  // Subscribe in case the library starts emitting this event in future versions
  instance.on('spreadsheet_ready' as any, onReady)

  // Fallback: constructor is synchronous — DOM is ready after nextTick
  await nextTick()

  onReady()
})

onBeforeUnmount(() => {
  cleanupLocale?.()
  cleanupLocale = null
  instance?.release()
  instance = null
})

defineExpose({
  saveToConfig(): IVTableSheetOptions {
    return instance!.saveToConfig()
  },
  getInstance(): VTableSheet {
    return instance!
  },
  getActiveSheet() {
    return instance!.getActiveSheet()
  },
})
</script>

<style scoped>
.vtable-sheet-container {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
}

/* Dark mode container background */
:global(.dark) .vtable-sheet-container,
:global(html.dark) .vtable-sheet-container {
  background-color: #111827;
}

/* Ensure VTable canvas renders properly */
.vtable-sheet-container :deep(canvas) {
  display: block;
}

/* Sheet tabs dark mode */
.vtable-sheet-container :deep(.vtable-sheet-tab-item) {
  color: #374151;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-sheet-tab-item),
:global(html.dark) .vtable-sheet-container :deep(.vtable-sheet-tab-item) {
  color: #d1d5db;
  background-color: #1f2937;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-sheet-tab-item.active),
:global(html.dark) .vtable-sheet-container :deep(.vtable-sheet-tab-item.active) {
  color: #f3f4f6;
  background-color: #111827;
}

/* Formula bar dark mode */
.vtable-sheet-container :deep(.vtable-formula-bar) {
  background-color: #f9fafb;
  border-color: #e5e7eb;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-formula-bar),
:global(html.dark) .vtable-sheet-container :deep(.vtable-formula-bar) {
  background-color: #1f2937;
  border-color: #374151;
  color: #f3f4f6;
}

/* Toolbar dark mode */
.vtable-sheet-container :deep(.vtable-toolbar) {
  background-color: #ffffff;
  border-color: #e5e7eb;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-toolbar),
:global(html.dark) .vtable-sheet-container :deep(.vtable-toolbar) {
  background-color: #1f2937;
  border-color: #374151;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-toolbar button),
:global(html.dark) .vtable-sheet-container :deep(.vtable-toolbar button) {
  color: #d1d5db;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-toolbar button:hover),
:global(html.dark) .vtable-sheet-container :deep(.vtable-toolbar button:hover) {
  background-color: #374151;
}

/* Grid lines - ensure visibility */
.vtable-sheet-container :deep(.vtable-grid-line) {
  border-color: #e5e7eb;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-grid-line),
:global(html.dark) .vtable-sheet-container :deep(.vtable-grid-line) {
  border-color: #374151;
}

/* Cell text in dark mode */
:global(.dark) .vtable-sheet-container :deep(.vtable-cell),
:global(html.dark) .vtable-sheet-container :deep(.vtable-cell) {
  color: #e5e7eb;
}

/* Header cells */
.vtable-sheet-container :deep(.vtable-header-cell) {
  background-color: #f9fafb;
  color: #374151;
}

:global(.dark) .vtable-sheet-container :deep(.vtable-header-cell),
:global(html.dark) .vtable-sheet-container :deep(.vtable-header-cell) {
  background-color: #1f2937;
  color: #e5e7eb;
}

/* VTable Context Menu Dark Mode Overrides */
/* These are NOT scoped because menus are injected into document.body */
</style>

<style>
/* Light mode (default) - ensure good contrast */
.vtable-context-menu-container {
  background: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.5rem !important;
}

.vtable-context-menu-container .vtable-context-menu-item,
.vtable-context-menu-container .vtable-context-menu-item span,
.vtable-context-menu-container .vtable-context-menu-item div {
  color: #111827 !important;
}

.vtable-context-menu-container .vtable-context-menu-item:hover {
  background: #f3f4f6 !important;
}

.vtable-context-menu-container input,
.vtable-context-menu-container select {
  background: #ffffff !important;
  color: #111827 !important;
  border: 1px solid #d1d5db !important;
}

/* Dark mode - high contrast text */
.dark .vtable-context-menu-container,
html.dark .vtable-context-menu-container,
body.dark .vtable-context-menu-container {
  background: #1f2937 !important;
  border-color: #374151 !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
}

.dark .vtable-context-menu-container .vtable-context-menu-item,
html.dark .vtable-context-menu-container .vtable-context-menu-item,
body.dark .vtable-context-menu-container .vtable-context-menu-item,
.dark .vtable-context-menu-container .vtable-context-menu-item span,
.dark .vtable-context-menu-container .vtable-context-menu-item div {
  color: #f3f4f6 !important;
}

.dark .vtable-context-menu-container .vtable-context-menu-item:hover,
html.dark .vtable-context-menu-container .vtable-context-menu-item:hover,
body.dark .vtable-context-menu-container .vtable-context-menu-item:hover {
  background: #374151 !important;
}

.dark .vtable-context-menu-container input,
.dark .vtable-context-menu-container select,
html.dark .vtable-context-menu-container input,
html.dark .vtable-context-menu-container select {
  background: #111827 !important;
  color: #f3f4f6 !important;
  border-color: #4b5563 !important;
}

/* Menu separators */
.vtable-context-menu-container .vtable-context-menu-line {
  border-top-color: #e5e7eb !important;
}

.dark .vtable-context-menu-container .vtable-context-menu-line,
html.dark .vtable-context-menu-container .vtable-context-menu-line {
  border-top-color: #4b5563 !important;
}

/* Sub-menu arrows */
.vtable-context-menu-container .vtable-context-menu-item-arrow {
  border-left-color: #6b7280 !important;
}

.dark .vtable-context-menu-container .vtable-context-menu-item-arrow,
html.dark .vtable-context-menu-container .vtable-context-menu-item-arrow {
  border-left-color: #9ca3af !important;
}

/* Cell editor input - ensure text is visible on white background */
.vtable-sheet-container input[type="text"],
.vtable-sheet-container input[type="number"] {
  color: #111827 !important;
}

.dark .vtable-sheet-container input[type="text"],
html.dark .vtable-sheet-container input[type="text"],
.dark .vtable-sheet-container input[type="number"],
html.dark .vtable-sheet-container input[type="number"] {
  color: #111827 !important;
}
</style>
