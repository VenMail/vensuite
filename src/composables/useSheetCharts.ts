import { ref, computed, reactive } from 'vue'
import { toast } from '@/composables/useToast'
import type { ChartConfig, ChartType } from '@/types/charts'

type CellRange = { startRow: number; startCol: number; endRow: number; endCol: number }

export function useSheetCharts(vtableRef: any) {
  const charts = ref<Map<string, ChartConfig>>(new Map())
  const selectedChartId = ref<string | null>(null)
  const isChartDialogOpen = ref(false)
  const editingChart = ref<ChartConfig | null>(null)
  const pendingRange = ref<CellRange | null>(null)

  // Canvas registry for PNG export
  const chartCanvases = new Map<string, HTMLCanvasElement>()

  function getInstance() {
    return vtableRef.value?.getInstance?.() ?? null
  }

  function getActiveSheet() {
    return vtableRef.value?.getActiveSheet?.() ?? null
  }

  function getSheetData(): any[][] {
    const sheet = getActiveSheet()
    const data = sheet?.getData?.()
    if (!Array.isArray(data)) return []
    return data.map(row => Array.isArray(row) ? [...row] : [])
  }

  function normalizeRange(raw: any): CellRange | null {
    if (!raw) return null
    const startRow = Math.min(raw.startRow ?? 0, raw.endRow ?? 0)
    const endRow   = Math.max(raw.startRow ?? 0, raw.endRow ?? 0)
    const startCol = Math.min(raw.startCol ?? 0, raw.endCol ?? 0)
    const endCol   = Math.max(raw.startCol ?? 0, raw.endCol ?? 0)
    if (startRow < 0 || startCol < 0) return null
    return { startRow, startCol, endRow, endCol }
  }

  function addChart(config: ChartConfig) {
    charts.value.set(config.id, config)
    toast.success('Chart added successfully')
  }

  function updateChart(config: ChartConfig) {
    if (charts.value.has(config.id)) {
      charts.value.set(config.id, config)
      toast.success('Chart updated successfully')
    }
  }

  function deleteChart(id: string) {
    if (charts.value.has(id)) {
      charts.value.delete(id)
      if (selectedChartId.value === id) {
        selectedChartId.value = null
      }
      toast.success('Chart deleted')
    }
  }

  function selectChart(id: string) {
    selectedChartId.value = id
  }

  function deselectChart() {
    selectedChartId.value = null
  }

  function openChartDialog(chart?: ChartConfig) {
    editingChart.value = chart || null
    if (chart) pendingRange.value = null
    isChartDialogOpen.value = true
  }

  function openChartDialogFromSelection() {
    const sheet = getActiveSheet()
    const raw = sheet?.getSelection?.()
    pendingRange.value = normalizeRange(raw)
    editingChart.value = null
    isChartDialogOpen.value = true
  }

  function closeChartDialog() {
    isChartDialogOpen.value = false
    editingChart.value = null
    pendingRange.value = null
  }

  function handleChartSave(config: ChartConfig) {
    if (editingChart.value) {
      updateChart(config)
    } else {
      addChart(config)
    }
    closeChartDialog()
  }

  function resizeChart(id: string, width: number, height: number) {
    const chart = charts.value.get(id)
    if (chart) {
      chart.width = width
      chart.height = height
      charts.value.set(id, { ...chart })
    }
  }

  function moveChart(id: string, x: number, y: number) {
    const chart = charts.value.get(id)
    if (chart) {
      chart.position = { x, y }
      charts.value.set(id, { ...chart })
    }
  }

  function getChartsInRange(range: CellRange) {
    const result: ChartConfig[] = []
    charts.value.forEach(chart => {
      const chartLeft   = Math.floor(chart.position.x / 100)
      const chartTop    = Math.floor(chart.position.y / 25)
      const chartRight  = chartLeft + Math.ceil((chart.width  || 400) / 100)
      const chartBottom = chartTop  + Math.ceil((chart.height || 300) / 25)
      if (
        chartLeft  <= range.endCol  &&
        chartRight >= range.startCol &&
        chartTop   <= range.endRow   &&
        chartBottom >= range.startRow
      ) {
        result.push(chart)
      }
    })
    return result
  }

  function validateChartDataRange(range: CellRange) {
    if (range.startRow < 0 || range.startCol < 0) return false
    if (range.endRow - range.startRow < 1 || range.endCol - range.startCol < 1) return false
    return true
  }

  function extractChartData(range: CellRange) {
    const data = getSheetData()
    const extracted: any[][] = []
    for (let row = range.startRow; row <= range.endRow && row < data.length; row++) {
      const rowData: any[] = []
      for (let col = range.startCol; col <= range.endCol && col < (data[row]?.length || 0); col++) {
        rowData.push(data[row][col])
      }
      extracted.push(rowData)
    }
    return extracted
  }

  function createQuickChart(type: ChartType, range: CellRange) {
    if (!validateChartDataRange(range)) {
      toast.error('Invalid data range for chart. Select at least 2 rows and 2 columns.')
      return
    }
    const data = extractChartData(range)
    const chartConfig = generateChartConfig(type, range, data)
    addChart(chartConfig)
  }

  function createQuickChartFromSelection(type: ChartType) {
    const sheet = getActiveSheet()
    const raw = sheet?.getSelection?.()
    const range = normalizeRange(raw)
    if (!range) {
      toast.error('Select cells first')
      return
    }
    createQuickChart(type, range)
  }

  function generateChartConfig(type: ChartType, range: CellRange, data: any[][]): ChartConfig {
    const id = `chart-${Date.now()}`
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`

    const headers = data[0]?.map((h: any) => String(h || '')) || []
    const chartData = data.slice(1)

    const labels = chartData.map(row => String(row[0] || ''))

    // For pie: one series where each data point is a slice (col 1 values, col 0 labels).
    // For others: one series per data column, col 0 = x-axis labels.
    const series = []
    if (type === 'pie') {
      const pieSeries = chartData.map((row, index) => ({
        x: labels[index],
        y: Number(row[1]) || 0,
        label: labels[index]
      }))
      series.push({
        name: headers[1] || 'Values',
        data: pieSeries,
        color: getDefaultColor(0)
      })
    } else {
      for (let col = 1; col < headers.length; col++) {
        const seriesData = chartData.map((row, index) => ({
          x: labels[index],
          y: Number(row[col]) || 0,
          label: labels[index]
        }))
        series.push({
          name: headers[col] || `Series ${col}`,
          data: seriesData,
          color: getDefaultColor(col - 1)
        })
      }
    }

    return {
      id,
      type,
      title,
      xAxisLabel: type !== 'pie' ? (headers[0] || '') : '',
      yAxisLabel: type !== 'pie' ? 'Value' : '',
      showLegend: true,
      showGrid: type !== 'pie',
      width: 400,
      height: 300,
      dataRange: range,
      series,
      position: {
        x: 100 + (charts.value.size * 20),
        y: 100 + (charts.value.size * 20)
      }
    }
  }

  function getDefaultColor(index: number): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
    ]
    return colors[index % colors.length]
  }

  // Canvas registry for PNG export
  function registerCanvas(id: string, canvas: HTMLCanvasElement) {
    chartCanvases.set(id, canvas)
  }

  function unregisterCanvas(id: string) {
    chartCanvases.delete(id)
  }

  function exportChart(id: string, format: 'png' | 'jpg' = 'png') {
    const chart = charts.value.get(id)
    const canvas = chartCanvases.get(id)
    if (!chart) {
      toast.error('Chart not found')
      return
    }
    if (!canvas) {
      toast.error('Chart canvas not ready')
      return
    }
    const link = document.createElement('a')
    link.download = `${chart.title || 'chart'}.${format}`
    link.href = canvas.toDataURL(`image/${format}`)
    link.click()
  }

  // Persistence
  function loadCharts(list: ChartConfig[]) {
    charts.value.clear()
    for (const c of list) charts.value.set(c.id, c)
  }

  function serializeCharts(): ChartConfig[] {
    return Array.from(charts.value.values())
  }

  // Live data refresh
  function refreshChart(id: string) {
    const chart = charts.value.get(id)
    if (!chart) return
    const data = extractChartData(chart.dataRange)
    if (data.length < 2) return
    const updated = generateChartConfig(chart.type, chart.dataRange, data)
    charts.value.set(id, {
      ...updated,
      id: chart.id,
      title: chart.title,
      position: chart.position,
      width: chart.width,
      height: chart.height
    })
  }

  function refreshAllCharts() {
    charts.value.forEach((_, id) => refreshChart(id))
  }

  function clearAllCharts() {
    charts.value.clear()
    selectedChartId.value = null
    toast.info('All charts cleared')
  }

  function getChartsCount() {
    return charts.value.size
  }

  function hasCharts() {
    return charts.value.size > 0
  }

  const selectedChart = computed(() => {
    return selectedChartId.value ? charts.value.get(selectedChartId.value) || null : null
  })

  const chartList = computed<ChartConfig[]>(() => {
    return Array.from(charts.value.values())
  })

  // reactive() auto-unwraps all contained refs in template accesses (fixes v-for on computed refs)
  return reactive({
    // State
    charts,
    selectedChartId,
    isChartDialogOpen,
    editingChart,
    pendingRange,
    selectedChart,
    chartList,

    // Chart management
    addChart,
    updateChart,
    deleteChart,
    selectChart,
    deselectChart,

    // Dialog management
    openChartDialog,
    openChartDialogFromSelection,
    closeChartDialog,
    handleChartSave,

    // Chart manipulation
    resizeChart,
    moveChart,
    exportChart,
    clearAllCharts,

    // Quick chart from selection
    createQuickChartFromSelection,

    // Canvas registry
    registerCanvas,
    unregisterCanvas,

    // Data helpers
    getSheetData,
    getChartsInRange,
    validateChartDataRange,
    extractChartData,
    createQuickChart,

    // Persistence
    loadCharts,
    serializeCharts,

    // Live refresh
    refreshAllCharts,

    // Utilities
    getChartsCount,
    hasCharts
  })
}
