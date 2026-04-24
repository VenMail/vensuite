export type ChartType = 'bar' | 'line' | 'pie' | 'scatter'

export interface ChartDataPoint {
  x?: number | string
  y: number
  label?: string
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
}

export interface ChartOptions {
  type: ChartType
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showLegend?: boolean
  showGrid?: boolean
  colors?: string[]
  width?: number
  height?: number
}

export interface ChartConfig extends ChartOptions {
  id: string
  dataRange: {
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  }
  series: ChartSeries[]
  position: {
    x: number
    y: number
  }
}

export interface ChartRendererProps {
  config: ChartConfig
  onEdit?: (config: ChartConfig) => void
  onDelete?: (id: string) => void
  onResize?: (id: string, width: number, height: number) => void
}
