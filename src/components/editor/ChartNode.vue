<template>
  <NodeViewWrapper
    class="chart-node"
    :class="{ 'is-selected': isSelected }"
    contenteditable="false"
  >
    <div class="chart-node__container" @click.stop="selectNode">
      <div
        class="chart-node__resize"
        :class="{ 'is-active': isSelected }"
        @mousedown.stop.prevent="startResize"
        :style="resizeStyle"
      >
        <canvas ref="canvasRef" class="chart-node__canvas" :width="dimensions.width" :height="dimensions.height" />
        <span v-if="isSelected" class="chart-node__handle chart-node__handle--se" data-direction="se" />
        <span v-if="isSelected" class="chart-node__handle chart-node__handle--e" data-direction="e" />
        <span v-if="isSelected" class="chart-node__handle chart-node__handle--s" data-direction="s" />
      </div>
      <div v-if="!hasData" class="chart-node__placeholder">
        No data to display
      </div>
    </div>
  </NodeViewWrapper>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { Chart, ChartType, registerables } from 'chart.js';
import type { ChartDataset } from 'chart.js';
import type { ChartAttrs } from '@/extensions/chart';

Chart.register(...registerables);

const props = defineProps(nodeViewProps);

const canvasRef = ref<HTMLCanvasElement | null>(null);
type SupportedChartType = Extract<ChartType, 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea'>;
let chart: Chart<SupportedChartType, number[], string> | null = null;

const fallbackColors = [
  '#3b82f6',
  '#10b981',
  '#f97316',
  '#f43f5e',
  '#8b5cf6',
  '#14b8a6',
  '#facc15',
];

const isSelected = computed(() => props.selected ?? false);

const chartAttrs = computed<ChartAttrs>(() => {
  const raw = (props.node?.attrs ?? {}) as Partial<ChartAttrs>;
  return {
    chartType: typeof raw.chartType === 'string' ? raw.chartType : 'bar',
    labels: Array.isArray(raw.labels) ? [...raw.labels] : [],
    datasets: Array.isArray(raw.datasets)
      ? raw.datasets.map(dataset => ({
          label: dataset?.label,
          data: Array.isArray(dataset?.data) ? [...dataset.data] : [],
          backgroundColor: dataset?.backgroundColor,
          borderColor: dataset?.borderColor,
          borderWidth: dataset?.borderWidth,
          tension: dataset?.tension,
        }))
      : [],
  };
});

const dimensions = reactive({
  width: props.node?.attrs?.width ?? 640,
  height: props.node?.attrs?.height ?? 360,
});

const resizeStyle = computed(() => ({
  width: `${dimensions.width}px`,
  height: `${dimensions.height}px`,
}));

const hasData = computed(() =>
  chartAttrs.value.datasets.some(dataset => Array.isArray(dataset.data) && dataset.data.length > 0)
);

function buildDatasets(): ChartDataset<SupportedChartType, number[]>[] {
  return chartAttrs.value.datasets.map((dataset, index) => {
    const fallbackColor = fallbackColors[index % fallbackColors.length];
    const color = dataset.backgroundColor || fallbackColor;
    const border = dataset.borderColor || fallbackColor;
    const data = Array.isArray(dataset.data) ? dataset.data : [];
    return {
      label: dataset.label ?? `Dataset ${index + 1}`,
      data,
      backgroundColor: color,
      borderColor: border,
      borderWidth: typeof dataset.borderWidth === 'number' ? dataset.borderWidth : 2,
      tension: typeof dataset.tension === 'number' ? dataset.tension : 0.3,
    } as ChartDataset<SupportedChartType, number[]>;
  });
}

function renderChart() {
  if (!canvasRef.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  chart?.destroy();

  const type = (chartAttrs.value.chartType as SupportedChartType) ?? 'bar';
  const labels = chartAttrs.value.labels;
  const datasets = buildDatasets();

  const fontSize = props.node?.attrs?.fontSize ?? 12;
  const showLegend = props.node?.attrs?.showLegend ?? true;
  const title = props.node?.attrs?.title ?? '';

  chart = new Chart<SupportedChartType, number[], string>(ctx, {
    type,
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: {
            size: fontSize + 4,
            weight: 'bold',
          },
        },
        legend: {
          display: showLegend,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: {
              size: fontSize,
            },
          },
        },
        tooltip: {
          intersect: false,
          bodyFont: {
            size: fontSize,
          },
          titleFont: {
            size: fontSize,
          },
        },
      },
      scales: {
        x: {
          display: type !== 'pie' && type !== 'doughnut',
          ticks: {
            font: {
              size: fontSize,
            },
          },
        },
        y: {
          display: type !== 'pie' && type !== 'doughnut',
          beginAtZero: true,
          ticks: {
            font: {
              size: fontSize,
            },
          },
        },
      },
    },
  });
}

function selectNode() {
  if (!props.editor || !props.getPos) return;
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.chain().setNodeSelection(pos).run();
  }
}

let resizeDirection: 'se' | 'e' | 's' | null = null;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;

function startResize(event: MouseEvent) {
  if (!isSelected.value) {
    selectNode();
    return;
  }
  const target = event.target as HTMLElement;
  const direction = target.dataset.direction as typeof resizeDirection;
  if (!direction) return;
  resizeDirection = direction;
  startX = event.clientX;
  startY = event.clientY;
  startWidth = dimensions.width;
  startHeight = dimensions.height;
  window.addEventListener('mousemove', onResize);
  window.addEventListener('mouseup', stopResize, { once: true });
}

function onResize(event: MouseEvent) {
  if (!resizeDirection) return;
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;

  if (resizeDirection === 'e' || resizeDirection === 'se') {
    dimensions.width = Math.max(320, Math.round(startWidth + deltaX));
  }

  if (resizeDirection === 's' || resizeDirection === 'se') {
    dimensions.height = Math.max(240, Math.round(startHeight + deltaY));
  }

  scheduleResizePersist();
  renderChart();
}

function stopResize() {
  resizeDirection = null;
  window.removeEventListener('mousemove', onResize);
}

let resizeDebounce: ReturnType<typeof setTimeout> | null = null;

function scheduleResizePersist() {
  if (resizeDebounce) {
    clearTimeout(resizeDebounce);
  }
  resizeDebounce = setTimeout(() => {
    if (!props.editor || !props.getPos) return;
    const pos = props.getPos();
    if (typeof pos !== 'number') return;
    const currentWidth = props.node?.attrs?.width;
    const currentHeight = props.node?.attrs?.height;
    if (currentWidth === dimensions.width && currentHeight === dimensions.height) {
      return;
    }
    props.editor
      .chain()
      .focus()
      .setNodeSelection(pos)
      .updateAttributes(props.node.type.name, {
        width: dimensions.width,
        height: dimensions.height,
      })
      .run();
  }, 160);
}

watch(
  () => [props.node?.attrs?.width, props.node?.attrs?.height],
  ([nextWidth, nextHeight]) => {
    if (typeof nextWidth === 'number' && nextWidth !== dimensions.width) {
      dimensions.width = nextWidth;
    }
    if (typeof nextHeight === 'number' && nextHeight !== dimensions.height) {
      dimensions.height = nextHeight;
    }
  }
);

watch(
  () => [
    chartAttrs.value.chartType,
    chartAttrs.value.labels,
    chartAttrs.value.datasets,
  ],
  () => {
    renderChart();
  },
  { deep: true }
);

onMounted(() => {
  renderChart();
  scheduleResizePersist();
});

onBeforeUnmount(() => {
  chart?.destroy();
  if (resizeDebounce) {
    clearTimeout(resizeDebounce);
  }
  window.removeEventListener('mousemove', onResize);
});
</script>

<style scoped>
.chart-node {
  width: 100%;
  margin: 1.5rem 0;
}

.chart-node__container {
  position: relative;
  width: 100%;
  min-height: 280px;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.02);
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 1.5rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.chart-node__resize {
  position: relative;
  max-width: 100%;
  margin: 0 auto;
  transition: box-shadow 0.2s ease;
}

.chart-node__resize.is-active {
  cursor: grab;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.chart-node.is-selected .chart-node__container {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.chart-node__canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-node__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: rgba(30, 41, 59, 0.6);
}

.chart-node__handle {
  position: absolute;
  width: 11px;
  height: 11px;
  background: rgba(59, 130, 246, 0.92);
  border-radius: 9999px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.95);
  cursor: nwse-resize;
  transition: transform 0.15s ease;
}

.chart-node__handle--se {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}

.chart-node__handle--e {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.chart-node__handle--s {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}
</style>
