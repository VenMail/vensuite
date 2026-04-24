<template>
  <div
    class="chart-container absolute border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded shadow-lg"
    :style="containerStyle"
    @mousedown="onContainerMousedown"
    @click.self="selectChart"
  >
    <!-- Chart Header -->
    <div
      v-if="isSelected"
      class="chart-header absolute top-0 left-0 right-0 h-8 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between px-2 rounded-t cursor-move"
      @mousedown.stop="startDrag"
    >
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300 select-none">
        {{ config.title || 'Chart' }}
      </span>
      <div class="flex gap-1">
        <button
          @mousedown.stop
          @click.stop="$emit('edit', config)"
          class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Edit Chart"
        >
          <EditIcon class="h-3 w-3 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          @mousedown.stop
          @click.stop="deleteChart"
          class="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
          title="Delete Chart"
        >
          <TrashIcon class="h-3 w-3 text-red-600 dark:text-red-400" />
        </button>
      </div>
    </div>

    <!-- Chart Content -->
    <div
      class="chart-content"
      :style="chartStyle"
    >
      <canvas ref="canvasRef" :width="config.width || 400" :height="config.height || 300" />
    </div>

    <!-- Resize Handle -->
    <div
      v-if="isSelected"
      class="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
      @mousedown.stop="startResize"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
  Filler,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  ScatterController,
  RadarController,
  PolarAreaController,
  BubbleController,
} from 'chart.js'
import { EditIcon, TrashIcon } from 'lucide-vue-next'
import type { ChartConfig } from '@/types/charts'

// Register all Chart.js controllers AND components
ChartJS.register(
  // Controllers (required for type → chart mapping)
  BarController,
  LineController,
  PieController,
  DoughnutController,
  ScatterController,
  RadarController,
  PolarAreaController,
  BubbleController,
  // Scales
  CategoryScale,
  LinearScale,
  // Elements
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  // Plugins
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  config: ChartConfig
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
})

const emit = defineEmits<{
  edit: [config: ChartConfig]
  delete: [id: string]
  resize: [id: string, width: number, height: number]
  move: [id: string, x: number, y: number]
  select: [id: string]
  'register-canvas': [id: string, canvas: HTMLCanvasElement]
  'unregister-canvas': [id: string]
}>()

const canvasRef = ref<HTMLCanvasElement>()
let chartInstance: ChartJS | null = null

// Drag state
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, posX: 0, posY: 0 })

// Resize state
const isResizing = ref(false)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const containerStyle = computed(() => ({
  left: `${props.config.position.x}px`,
  top: `${props.config.position.y}px`,
  width: `${(props.config.width || 400) + 16}px`,
  height: `${(props.config.height || 300) + (props.isSelected ? 32 : 16)}px`,
  zIndex: props.isSelected ? 1000 : 1,
  cursor: isDragging.value ? 'grabbing' : 'default',
}))

const chartStyle = computed(() => ({
  width: `${props.config.width || 400}px`,
  height: `${props.config.height || 300}px`,
  marginTop: props.isSelected ? '32px' : '0',
}))

function selectChart() {
  emit('select', props.config.id)
}

function deleteChart() {
  emit('delete', props.config.id)
}

// ── Drag to move ──────────────────────────────────────────────────────────────

function onContainerMousedown(event: MouseEvent) {
  // Only start drag if clicking the body (not header, not resize handle)
  if (props.isSelected) return
  emit('select', props.config.id)
}

function startDrag(event: MouseEvent) {
  isDragging.value = true
  dragStart.value = {
    x: event.clientX,
    y: event.clientY,
    posX: props.config.position.x,
    posY: props.config.position.y,
  }
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  event.preventDefault()
}

function handleDrag(event: MouseEvent) {
  if (!isDragging.value) return
  const newX = Math.max(0, dragStart.value.posX + (event.clientX - dragStart.value.x))
  const newY = Math.max(0, dragStart.value.posY + (event.clientY - dragStart.value.y))
  emit('move', props.config.id, newX, newY)
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// ── Resize ────────────────────────────────────────────────────────────────────

function startResize(event: MouseEvent) {
  isResizing.value = true
  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: props.config.width || 400,
    height: props.config.height || 300,
  }
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

function handleResize(event: MouseEvent) {
  if (!isResizing.value) return
  const newWidth = Math.max(200, resizeStart.value.width + (event.clientX - resizeStart.value.x))
  const newHeight = Math.max(150, resizeStart.value.height + (event.clientY - resizeStart.value.y))
  emit('resize', props.config.id, newWidth, newHeight)
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// ── Chart rendering ───────────────────────────────────────────────────────────

function createChartData() {
  const labels = props.config.series[0]?.data.map(d => String(d.label ?? d.x ?? '')) || []
  const isPie = props.config.type === 'pie'
  return {
    labels,
    datasets: props.config.series.map((series, index) => {
      // Pie/doughnut: each slice needs its own color
      const sliceColors = isPie
        ? series.data.map((_, i) => getDefaultColor(i))
        : undefined
      return {
        label: series.name,
        data: series.data.map(d => d.y),
        backgroundColor: sliceColors ?? (series.color || getDefaultColor(index)),
        borderColor: isPie ? '#fff' : (series.color || getDefaultColor(index)),
        borderWidth: isPie ? 2 : 2,
        fill: false,
        tension: props.config.type === 'line' ? 0.4 : 0,
      }
    }),
  }
}

function createChartOptions() {
  return {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: Boolean(props.config.title),
        text: props.config.title,
        font: { size: 14, weight: 'bold' as const },
      },
      legend: {
        display: props.config.showLegend !== false && (props.config.series.length > 1 || props.config.type === 'pie'),
        position: 'top' as const,
      },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: props.config.type !== 'pie' ? {
      x: {
        display: true,
        title: { display: Boolean(props.config.xAxisLabel), text: props.config.xAxisLabel },
        grid: { display: props.config.showGrid !== false },
      },
      y: {
        display: true,
        title: { display: Boolean(props.config.yAxisLabel), text: props.config.yAxisLabel },
        grid: { display: props.config.showGrid !== false },
      },
    } : undefined,
  }
}

function getDefaultColor(index: number): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
  ]
  return colors[index % colors.length]
}

function renderChart() {
  if (!canvasRef.value) return

  // Destroy existing instance first to release the canvas
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  chartInstance = new ChartJS(canvasRef.value, {
    type: props.config.type as any,
    data: createChartData(),
    options: createChartOptions(),
  })
}

// Deep watch: destroy + re-render on any config change
watch(() => props.config, () => {
  nextTick(renderChart)
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    renderChart()
    if (canvasRef.value) emit('register-canvas', props.config.id, canvasRef.value)
  })
})

onUnmounted(() => {
  emit('unregister-canvas', props.config.id)
  stopDrag()
  stopResize()
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
.chart-container {
  user-select: none;
}

.chart-header {
  z-index: 10;
}

.chart-content {
  position: relative;
}

.resize-handle {
  z-index: 11;
}

.resize-handle:hover {
  background-color: #2563eb;
}
</style>
