export type Alignment = 'left' | 'center' | 'right' | 'justify';

export interface AbsFragment {
  text: string;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  fontSize?: string | null;
  fontFamily?: string | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  lineHeight?: string | null;
  letterSpacing?: string | null;
  color?: string | null;
  page?: number | null;
}

export interface AbsImageItem {
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  src: string;
  alt?: string | null;
  opacity?: number | null;
  page?: number | null;
}

export interface AbsShapeItem {
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  strokeColor?: string | null;
  strokeWidth?: number | null;
  fillColor?: string | null;
  radius?: number | null;
  opacity?: number | null;
  page?: number | null;
}

export interface AbsLine {
  id: string;
  page: number;
  y: number;
  fragments: AbsFragment[];
  text: string;
  x: number;
  width?: number | null;
  fontFamily?: string | null;
  fontSize?: string | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  lineHeight?: string | null;
  letterSpacing?: string | null;
  color?: string | null;
  align?: Alignment | null;
  columnId?: string | null;
  tableId?: string | null;
  row?: number | null;
}

export interface AbsColumn {
  id: string;
  page: number;
  left: number;
  right: number;
  center: number;
}

export interface AbsTableCell {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

export interface AbsTableRow {
  y: number;
  cells: string[];
}

export interface AbsTable {
  id: string;
  page: number;
  bbox: { left: number; right: number; top: number; bottom: number };
  cells: AbsTableCell[];
  rows?: AbsTableRow[];
}

export interface AbsPageModel {
  page: number;
  widthPx: number;
  heightPx: number;
  fragments: AbsFragment[];
  images: AbsImageItem[];
  shapes: AbsShapeItem[];
  lines: AbsLine[];
  columns: AbsColumn[];
  tables: AbsTable[];
}

export interface ConvertOptions {
  pageWidthPx?: number;
  pageHeightPx?: number;
  yTolerance?: number;
  xGapSpaceThresholdPx?: number;
  detectColumns?: boolean;
  inferTables?: boolean;
  detectJustification?: boolean;
  fontFallback?: boolean;
  forceLayoutCapture?: boolean;
  ceLayoutCapture?: boolean;
  roundPx?: number;
}
