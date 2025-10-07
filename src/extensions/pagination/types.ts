export interface PageDimensions {
  width: number;  // in mm
  height: number; // in mm
}

export interface PageMargins {
  top: number;    // in mm
  bottom: number; // in mm
  left: number;   // in mm
  right: number;  // in mm
}

export interface PaginationOptions {
  pageSize: PageDimensions;
  margins: PageMargins;
  headerHeight: number; // in mm
  footerHeight: number; // in mm
  showPageNumbers: boolean;
  pageNumberPosition: 'left' | 'center' | 'right';
}

export interface NodePosition {
  pos: number;
  height: number; // in pixels
  pageIndex: number;
  offsetInPage: number; // in pixels
}

export interface PageBreak {
  afterPos: number;
  pageIndex: number;
  y: number; // absolute Y position in pixels
}

export interface PaginationState {
  pageBreaks: PageBreak[];
  nodePositions: Map<number, NodePosition>;
  totalPages: number;
  contentHeight: number; // in pixels
  isDirty: boolean;
}
