<template>
  <Dialog v-model:open="isOpenModel">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit Chart' : 'Create Chart' }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Chart Type Selection -->
        <div class="space-y-2">
          <Label>Chart Type</Label>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="type in chartTypes"
              :key="type.value"
              @click="chartConfig.type = type.value"
              :class="[
                'p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors',
                chartConfig.type === type.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              ]"
            >
              <component :is="type.icon" class="h-6 w-6" />
              <span class="text-xs">{{ type.label }}</span>
            </button>
          </div>
        </div>

        <!-- Data Range Selection -->
        <div class="space-y-2">
          <Label>Data Range</Label>
          <div class="flex items-center gap-2">
            <Input
              v-model="dataRangeText"
              placeholder="e.g., A1:C10"
              class="flex-1"
              @blur="parseDataRange"
            />
            <Button
              @click="selectDataRange"
              variant="outline"
              size="sm"
            >
              Select
            </Button>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Click Select or enter the range manually (e.g., A1:C10)
          </p>
        </div>

        <!-- Chart Title -->
        <div class="space-y-2">
          <Label for="chart-title">Chart Title</Label>
          <Input
            id="chart-title"
            v-model="chartConfig.title"
            placeholder="Enter chart title"
          />
        </div>

        <!-- Axis Labels (for non-pie charts) -->
        <div v-if="chartConfig.type !== 'pie'" class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="x-axis-label">X-Axis Label</Label>
            <Input
              id="x-axis-label"
              v-model="chartConfig.xAxisLabel"
              placeholder="X-axis label"
            />
          </div>
          <div class="space-y-2">
            <Label for="y-axis-label">Y-Axis Label</Label>
            <Input
              id="y-axis-label"
              v-model="chartConfig.yAxisLabel"
              placeholder="Y-axis label"
            />
          </div>
        </div>

        <!-- Chart Options -->
        <div class="space-y-3">
          <Label>Chart Options</Label>
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <Checkbox
                v-model:checked="chartConfig.showLegend"
                id="show-legend"
              />
              <Label for="show-legend" class="text-sm">Show Legend</Label>
            </label>
            <label v-if="chartConfig.type !== 'pie'" class="flex items-center gap-2">
              <Checkbox
                v-model:checked="chartConfig.showGrid"
                id="show-grid"
              />
              <Label for="show-grid" class="text-sm">Show Grid</Label>
            </label>
          </div>
        </div>

        <!-- Chart Size -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="chart-width">Width</Label>
            <Input
              id="chart-width"
              v-model.number="chartConfig.width"
              type="number"
              min="200"
              max="800"
            />
          </div>
          <div class="space-y-2">
            <Label for="chart-height">Height</Label>
            <Input
              id="chart-height"
              v-model.number="chartConfig.height"
              type="number"
              min="150"
              max="600"
            />
          </div>
        </div>

        <!-- Preview -->
        <div v-if="previewData" class="space-y-2">
          <Label>Preview</Label>
          <div class="border border-gray-300 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-800">
            <canvas ref="previewCanvas" width="400" height="200" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeDialog">
          Cancel
        </Button>
        <Button @click="saveChart" :disabled="!isValidConfig">
          {{ isEditing ? 'Update Chart' : 'Create Chart' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import { toast } from '@/composables/useToast'
import {
  BarChart3Icon,
  LineChartIcon,
  PieChartIcon,
  ScatterChartIcon
} from 'lucide-vue-next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import type { ChartConfig, ChartType, ChartOptions } from '@/types/charts'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  isOpen: boolean
  editingChart?: ChartConfig | null
  sheetData?: any[][]
  initialRange?: { startRow: number; startCol: number; endRow: number; endCol: number } | null
}

const props = withDefaults(defineProps<Props>(), {
  editingChart: null,
  sheetData: () => [],
  initialRange: null
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  save: [config: ChartConfig]
}>()

const isOpenModel = computed({
  get: () => props.isOpen,
  set: (v: boolean) => emit('update:isOpen', v)
})

const previewCanvas = ref<HTMLCanvasElement>()
const previewChart = ref<ChartJS | null>(null)
const dataRangeText = ref('')

const chartTypes = [
  { value: 'bar' as ChartType, label: 'Bar', icon: BarChart3Icon },
  { value: 'line' as ChartType, label: 'Line', icon: LineChartIcon },
  { value: 'pie' as ChartType, label: 'Pie', icon: PieChartIcon },
  { value: 'scatter' as ChartType, label: 'Scatter', icon: ScatterChartIcon }
]

const defaultConfig: Partial<ChartConfig> = {
  type: 'bar',
  title: '',
  xAxisLabel: '',
  yAxisLabel: '',
  showLegend: true,
  showGrid: true,
  width: 400,
  height: 300,
  position: { x: 100, y: 100 }
}

const chartConfig = ref<ChartConfig>({
  id: '',
  type: 'bar',
  title: '',
  xAxisLabel: '',
  yAxisLabel: '',
  showLegend: true,
  showGrid: true,
  width: 400,
  height: 300,
  dataRange: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
  series: [],
  position: { x: 100, y: 100 }
})

const isEditing = computed(() => Boolean(props.editingChart))
const isValidConfig = computed(() => {
  return (
    chartConfig.value.dataRange.startRow <= chartConfig.value.dataRange.endRow &&
    chartConfig.value.dataRange.startCol <= chartConfig.value.dataRange.endCol &&
    (chartConfig.value.width || 400) >= 200 &&
    (chartConfig.value.height || 300) >= 150
  )
})

const previewData = computed(() => {
  if (!isValidConfig.value) return null
  
  // Generate preview data from the selected range
  const { startRow, startCol, endRow, endCol } = chartConfig.value.dataRange
  const data: any[][] = []
  
  for (let row = startRow; row <= endRow && row < props.sheetData.length; row++) {
    const rowData: any[] = []
    for (let col = startCol; col <= endCol && col < (props.sheetData[row]?.length || 0); col++) {
      rowData.push(props.sheetData[row][col])
    }
    data.push(rowData)
  }
  
  return data.length > 0 ? data : null
})

function parseDataRange() {
  const range = dataRangeText.value.trim()
  if (!range) return
  
  // Parse range like "A1:C10"
  const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i)
  if (!match) {
    toast.error('Invalid range format. Use format like A1:C10')
    return
  }
  
  const [, startCol, startRow, endCol, endRow] = match
  const startColIndex = columnNameToIndex(startCol)
  const endColIndex = columnNameToIndex(endCol)
  
  chartConfig.value.dataRange = {
    startRow: parseInt(startRow) - 1,
    startCol: startColIndex,
    endRow: parseInt(endRow) - 1,
    endCol: endColIndex
  }
}

function columnNameToIndex(column: string): number {
  const normalized = column.trim().toUpperCase()
  let index = 0
  for (let i = 0; i < normalized.length; i++) {
    index = (index * 26) + (normalized.charCodeAt(i) - 64)
  }
  return index - 1
}

function selectDataRange() {
  toast.info('Type the range manually (e.g., A1:C10), or use right-click → Visualize Selection for quick charts.')
}

function closeDialog() {
  emit('update:isOpen', false)
}

function saveChart() {
  if (!isValidConfig.value) {
    toast.error('Please fix the configuration errors')
    return
  }
  
  // Generate series data from the selected range
  const { startRow, startCol, endRow, endCol } = chartConfig.value.dataRange
  const series = []
  
  // Assume first row is headers, first column is labels
  const headers = []
  const labels = []
  
  // Extract headers
  for (let col = startCol; col <= endCol; col++) {
    headers.push(String(props.sheetData[startRow]?.[col] || `Series ${col - startCol + 1}`))
  }
  
  // Extract labels and data
  for (let row = startRow + 1; row <= endRow && row < props.sheetData.length; row++) {
    labels.push(String(props.sheetData[row][startCol] || `Row ${row}`))
  }
  
  const isPie = chartConfig.value.type === 'pie'

  if (isPie) {
    // Pie: one series, labels from col 0, values from col 1
    const data = []
    for (let row = startRow + 1; row <= endRow && row < props.sheetData.length; row++) {
      data.push({
        x: labels[row - startRow - 1],
        y: Number(props.sheetData[row][startCol + 1]) || 0,
        label: labels[row - startRow - 1]
      })
    }
    series.push({
      name: headers[1] || 'Values',
      data,
      color: getDefaultColor(0)
    })
  } else {
    // Bar/line/scatter: one series per data column (skip label col)
    for (let col = startCol + 1; col <= endCol; col++) {
      const data = []
      for (let row = startRow + 1; row <= endRow && row < props.sheetData.length; row++) {
        data.push({
          x: labels[row - startRow - 1],
          y: Number(props.sheetData[row][col]) || 0,
          label: labels[row - startRow - 1]
        })
      }
      series.push({
        name: headers[col - startCol],
        data,
        color: getDefaultColor(col - startCol - 1)
      })
    }
  }
  
  const finalConfig: ChartConfig = {
    ...chartConfig.value,
    id: props.editingChart?.id || `chart-${Date.now()}`,
    series
  }
  
  emit('save', finalConfig)
  closeDialog()
}

function getDefaultColor(index: number): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
  ]
  return colors[index % colors.length]
}

function updatePreview() {
  if (!previewCanvas.value || !previewData.value) return
  
  // Destroy existing preview chart
  if (previewChart.value) {
    previewChart.value.destroy()
  }
  
  // Create preview data
  const labels = previewData.value.slice(1).map(row => String(row[0]))
  const datasets = []
  
  for (let i = 1; i < previewData.value[0].length; i++) {
    const data = previewData.value.slice(1).map(row => Number(row[i]) || 0)
    datasets.push({
      label: String(previewData.value[0][i]),
      data,
      backgroundColor: getDefaultColor(i - 1),
      borderColor: getDefaultColor(i - 1),
      borderWidth: 2,
      fill: false
    })
  }
  
  const chartOptions = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chartConfig.value.showLegend && datasets.length > 1,
        position: 'top' as const
      }
    },
    scales: chartConfig.value.type !== 'pie' ? {
      x: { display: true },
      y: { display: true }
    } : undefined
  }
  
  // Create preview chart using proper Chart.js API
  previewChart.value = new ChartJS(previewCanvas.value, {
    type: chartConfig.value.type,
    data: { labels, datasets },
    options: chartOptions
  })
}

// Watch for changes and update preview
watch([chartConfig, previewData], () => {
  nextTick(() => {
    updatePreview()
  })
}, { deep: true })

// Initialize when opening
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (props.editingChart) {
      chartConfig.value = { ...props.editingChart }
      dataRangeText.value = `${indexToColumnName(chartConfig.value.dataRange.startCol)}${chartConfig.value.dataRange.startRow + 1}:${indexToColumnName(chartConfig.value.dataRange.endCol)}${chartConfig.value.dataRange.endRow + 1}`
    } else {
      chartConfig.value = { ...defaultConfig, id: '', series: [] } as ChartConfig
      // Pre-populate from selection range if provided
      if (props.initialRange) {
        const r = props.initialRange
        dataRangeText.value = `${indexToColumnName(r.startCol)}${r.startRow + 1}:${indexToColumnName(r.endCol)}${r.endRow + 1}`
        chartConfig.value.dataRange = { ...r }
      } else {
        dataRangeText.value = ''
      }
    }
  }
})

function indexToColumnName(index: number): string {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

onMounted(() => {
  nextTick(() => {
    updatePreview()
  })
})
</script>
