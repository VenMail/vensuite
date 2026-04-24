<template>
  <div class="sparkline-container inline-flex items-center justify-center">
    <canvas
      ref="canvasRef"
      :width="width"
      :height="height"
      class="sparkline-canvas"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js'
import type { ChartDataPoint } from '@/types/charts'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler
)

interface Props {
  data: ChartDataPoint[]
  type: 'line' | 'column' | 'winloss'
  width?: number
  height?: number
  color?: string
  showPoints?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 100,
  height: 20,
  color: '#3b82f6',
  showPoints: false
})

const canvasRef = ref<HTMLCanvasElement>()
const chartInstance = ref<ChartJS | null>(null)

function getSparklineColor(value: number, index: number): string {
  if (props.type === 'winloss') {
    if (value > 0) return '#10b981' // green for win
    if (value < 0) return '#ef4444' // red for loss
    return '#6b7280' // gray for tie
  }
  return props.color
}

function createSparklineData() {
  const labels = props.data.map((_, index) => index.toString())
  
  return {
    labels,
    datasets: [{
      data: props.data.map(d => d.y),
      backgroundColor: props.data.map((d, index) => getSparklineColor(d.y, index)),
      borderColor: props.color,
      borderWidth: props.type === 'line' ? 1 : 0,
      fill: props.type === 'line' ? true : false,
      tension: 0.4,
      pointRadius: props.showPoints ? 2 : 0,
      pointHoverRadius: props.showPoints ? 3 : 0
    }]
  }
}

function createSparklineOptions() {
  return {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y
            const label = props.data[context.dataIndex]?.label || ''
            return `${label}: ${value}`
          }
        }
      }
    },
    scales: {
      x: {
        display: false,
        grid: { display: false }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const,
        borderCapStyle: 'round' as const
      }
    },
    layout: {
      padding: 0
    }
  }
}

function renderSparkline() {
  if (!canvasRef.value || !props.data.length) return

  // Destroy existing chart
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }

  const chartData = createSparklineData()
  const chartOptions = createSparklineOptions()

  // Create sparkline based on type
  let chartType: 'line' | 'bar' = 'line'
  if (props.type === 'column' || props.type === 'winloss') {
    chartType = 'bar'
  }

  chartInstance.value = new ChartJS(canvasRef.value, {
    type: chartType,
    data: chartData,
    options: chartOptions
  })
}

// Watch for data changes and re-render
watch(() => [props.data, props.type, props.color], () => {
  nextTick(() => {
    renderSparkline()
  })
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    renderSparkline()
  })
})
</script>

<style scoped>
.sparkline-container {
  width: v-bind(width + 'px');
  height: v-bind(height + 'px');
}

.sparkline-canvas {
  max-width: 100%;
  max-height: 100%;
}

/* Dark mode adjustments */
:global(.dark) .sparkline-canvas {
  filter: brightness(1.1);
}
</style>
