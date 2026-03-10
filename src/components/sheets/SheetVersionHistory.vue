<template>
  <div v-if="open" class="fixed inset-0 z-50 flex">
    <button
      type="button"
      class="flex-1 bg-black/30 backdrop-blur-[1px]"
      @click="$emit('close')"
      aria-label="Close version history"
    />

    <aside class="relative h-full w-full max-w-5xl border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Version history</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Compare any saved version with your current spreadsheet.</p>
          </div>
          <Button variant="ghost" size="sm" @click="$emit('close')">
            <XIcon class="h-4 w-4" />
          </Button>
        </div>

        <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
          <!-- Version list sidebar -->
          <div class="w-full border-b border-gray-200 dark:border-gray-700 lg:w-80 lg:border-b-0 lg:border-r">
            <div class="border-b border-gray-200 p-4 dark:border-gray-700">
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Current version</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(currentVersion?.updated_at_human || currentVersion?.updated_at) }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatSize(currentVersion?.file_size) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="min-h-0 overflow-y-auto lg:h-full">
              <div v-if="loading" class="p-6 text-sm text-gray-500 dark:text-gray-400">
                Loading version history...
              </div>

              <div v-else-if="versions.length === 0" class="p-6 text-sm text-gray-500 dark:text-gray-400">
                No previous versions available yet.
              </div>

              <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
                <button
                  v-for="version in versions"
                  :key="version.id"
                  type="button"
                  class="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/70"
                  :class="selectedNumber === version.version_number ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-transparent'"
                  @click="$emit('select', version)"
                >
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Version {{ version.version_number }}
                    </div>
                    <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(version.created_at_human || version.created_at) }}
                    </div>
                    <div v-if="version.change_note" class="mt-2 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                      {{ version.change_note }}
                    </div>
                  </div>
                  <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {{ formatSize(version.file_size) }}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Compare panel -->
          <div class="min-h-0 flex-1 overflow-y-auto p-6">
            <div v-if="loadingDetail" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading selected version...
            </div>

            <div v-else-if="detailError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {{ detailError }}
            </div>

            <div v-else-if="detail" class="space-y-6">
              <!-- Side-by-side summaries -->
              <div class="grid gap-4 xl:grid-cols-2">
                <WorkbookSummaryCard
                  title="Current spreadsheet"
                  subtitle="Live workbook loaded in the editor"
                  :summary="currentSummary"
                />
                <WorkbookSummaryCard
                  :title="`Version ${detail.version_number}`"
                  :subtitle="formatDate(detail.created_at_human || detail.created_at)"
                  :summary="selectedSummary"
                  fallback-text="This version could not be summarized."
                />
              </div>

              <!-- Change summary -->
              <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Change summary</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">A quick structural comparison between the selected version and the current workbook.</div>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Size delta {{ formatSize(Math.abs((currentVersion?.file_size ?? 0) - (detail.file_size ?? 0))) }}
                  </div>
                </div>

                <div v-if="comparison" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChangeBucket label="Added now" color="green" :sheets="comparison.addedSheets" empty-text="No added sheets" />
                  <ChangeBucket label="Changed" color="amber" :sheets="comparison.changedSheets" empty-text="No changed sheets" />
                  <ChangeBucket label="Removed now" color="rose" :sheets="comparison.removedSheets" empty-text="No removed sheets" />
                  <ChangeBucket label="Unchanged" color="sky" :sheets="comparison.unchangedSheets.slice(0, 6)" empty-text="No unchanged sheets" />
                </div>

                <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                  Compare data is unavailable for this version.
                </div>

                <div v-if="detail.change_note" class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200">
                  <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Change note</div>
                  {{ detail.change_note }}
                </div>
              </div>
            </div>

            <div v-else class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Select a version to compare it with the current spreadsheet.
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { XIcon } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import WorkbookSummaryCard from './WorkbookSummaryCard.vue'
import ChangeBucket from './ChangeBucket.vue'

export interface VersionItem {
  id: string
  version_number: number
  file_size: number
  file_name: string
  mime_type: string
  change_note: string | null
  created_at: string
  created_at_human: string
  employee_id: string
}

export interface VersionDetail extends VersionItem {
  app_file_id: string
  file_url: string
  content: string
}

export interface SheetSummary {
  id: string
  name: string
  rowCount: number
  columnCount: number
  populatedCellCount: number
}

export interface WorkbookSummary {
  sheetCount: number
  sheets: SheetSummary[]
}

export interface WorkbookComparison {
  addedSheets: string[]
  removedSheets: string[]
  changedSheets: string[]
  unchangedSheets: string[]
  hasChanges: boolean
}

defineProps<{
  open: boolean
  loading: boolean
  versions: VersionItem[]
  currentVersion: { file_size?: number; updated_at?: string; updated_at_human?: string } | null
  selectedNumber: number | null
  loadingDetail: boolean
  detail: VersionDetail | null
  detailError: string | null
  currentSummary: WorkbookSummary | null
  selectedSummary: WorkbookSummary | null
  comparison: WorkbookComparison | null
}>()

defineEmits<{
  close: []
  select: [version: VersionItem]
}>()

function formatDate(value?: string | null) {
  if (!value) return ''
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}
</script>
