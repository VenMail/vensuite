import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { NodeSelection } from '@tiptap/pm/state';
import ChartNode from '@/components/editor/ChartNode.vue';

export interface ChartDatasetAttr {
  label?: string;
  data?: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  tension?: number;
}

export interface ChartAttrs {
  chartType: string;
  labels: string[];
  datasets: ChartDatasetAttr[];
  width?: number;
  height?: number;
  title?: string;
  showLegend?: boolean;
  fontSize?: number;
}

const DEFAULT_DIMENSIONS = {
  width: 640,
  height: 360,
};

const DEFAULT_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

const DEFAULT_DATASETS: ChartDatasetAttr[] = [
  {
    label: 'Series 1',
    data: [12, 19, 3, 5],
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    borderWidth: 2,
    tension: 0.3,
  },
];

function cloneLabels(labels?: string[]): string[] {
  return Array.isArray(labels) && labels.length ? [...labels] : [...DEFAULT_LABELS];
}

function cloneDatasets(datasets?: ChartDatasetAttr[]): ChartDatasetAttr[] {
  const source = Array.isArray(datasets) && datasets.length ? datasets : DEFAULT_DATASETS;
  return source.map(dataset => ({
    label: dataset.label,
    data: Array.isArray(dataset?.data) ? [...dataset.data] : [],
    backgroundColor: dataset.backgroundColor,
    borderColor: dataset.borderColor,
    borderWidth: dataset.borderWidth,
    tension: dataset.tension,
  }));
}

const DEFAULT_ATTRS: ChartAttrs = {
  chartType: 'bar',
  labels: cloneLabels(),
  datasets: cloneDatasets(),
  width: DEFAULT_DIMENSIONS.width,
  height: DEFAULT_DIMENSIONS.height,
  title: '',
  showLegend: true,
  fontSize: 12,
};

type EditorInstance = CommandProps['editor'];

interface PaginationExtensionOptions {
  pageHeight: number;
  pageWidth: number;
  pageGap: number;
  pageBreakBackground: string;
  pageHeaderHeight: number;
  pageFooterHeight: number;
  pageGapBorderSize: number;
  footerRight: string;
  footerLeft: string;
  headerRight: string;
  headerLeft: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentMarginTop: number;
  contentMarginBottom: number;
  pageGapBorderColor: string;
}

const INSERTION_PADDING_PX = 24;

function resolvePaginationOptions(editor: EditorInstance | null | undefined): PaginationExtensionOptions | null {
  const extension = editor?.extensionManager.extensions.find(ext => ext.name === 'PaginationPlus');
  if (!extension) {
    return null;
  }

  const options = extension.options as Partial<PaginationExtensionOptions> | undefined;
  if (!options) {
    return null;
  }

  const requiredNumericKeys: Array<keyof PaginationExtensionOptions> = [
    'pageHeight',
    'pageGap',
    'pageHeaderHeight',
    'pageFooterHeight',
    'marginTop',
    'marginBottom',
    'contentMarginTop',
    'contentMarginBottom',
  ];

  for (const key of requiredNumericKeys) {
    if (typeof options[key] !== 'number' || !Number.isFinite(options[key]!)) {
      return null;
    }
  }

  return options as PaginationExtensionOptions;
}

function computeNextPageInsertionPosition(
  options: PaginationExtensionOptions,
  props: CommandProps,
  chartHeight: number
): number | null {
  const view = props.view;
  const selection = props.state.selection;

  if (!view || !selection || typeof selection.from !== 'number') {
    return null;
  }

  const headerSpace = options.pageHeaderHeight + options.contentMarginTop + options.marginTop;
  const footerSpace = options.pageFooterHeight + options.contentMarginBottom + options.marginBottom;
  const usableContentHeight = options.pageHeight - headerSpace - footerSpace;

  if (!Number.isFinite(usableContentHeight) || usableContentHeight <= 0) {
    return null;
  }

  const totalPageSpan = options.pageHeight + options.pageGap;

  let selectionCoords: { top: number; left: number } | null = null;
  try {
    const coords = view.coordsAtPos(selection.from);
    selectionCoords = { top: coords.top, left: coords.left };
  } catch {
    return null;
  }

  if (!selectionCoords) {
    return null;
  }

  const rootRect = (view.dom as HTMLElement).getBoundingClientRect();
  const distanceFromDocTop = selectionCoords.top - rootRect.top;

  if (!Number.isFinite(distanceFromDocTop)) {
    return null;
  }

  const pageIndex = Math.max(0, Math.floor(distanceFromDocTop / totalPageSpan));
  const offsetInsideCycle = distanceFromDocTop - pageIndex * totalPageSpan;
  const contentOffset = Math.max(0, offsetInsideCycle - headerSpace);
  const remainingSpace = usableContentHeight - contentOffset;
  const requiredSpace = chartHeight + INSERTION_PADDING_PX;

  if (remainingSpace >= requiredSpace) {
    return null;
  }

  const nextPageTopOffset = (pageIndex + 1) * options.pageHeight + pageIndex * options.pageGap + headerSpace + 1;
  const targetTop = rootRect.top + nextPageTopOffset;
  const targetLeft = Math.min(Math.max(selectionCoords.left, rootRect.left + 16), rootRect.right - 16);

  const nextPos = view.posAtCoords({ left: targetLeft, top: targetTop });

  if (!nextPos || typeof nextPos.pos !== 'number') {
    return props.state.doc.content.size;
  }

  if (nextPos.pos <= selection.from) {
    return props.state.doc.content.size;
  }

  return nextPos.pos;
}

function normalizeChartAttrs(attrs: Partial<ChartAttrs> = {}): ChartAttrs {
  return {
    chartType: attrs.chartType ?? DEFAULT_ATTRS.chartType,
    labels: cloneLabels(attrs.labels),
    datasets: cloneDatasets(attrs.datasets),
    width: typeof attrs.width === 'number' && Number.isFinite(attrs.width) ? attrs.width : DEFAULT_ATTRS.width,
    height: typeof attrs.height === 'number' && Number.isFinite(attrs.height) ? attrs.height : DEFAULT_ATTRS.height,
    title: attrs.title ?? DEFAULT_ATTRS.title,
    showLegend: attrs.showLegend ?? DEFAULT_ATTRS.showLegend,
    fontSize: typeof attrs.fontSize === 'number' && Number.isFinite(attrs.fontSize) ? attrs.fontSize : DEFAULT_ATTRS.fontSize,
  };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      setChart: (attrs?: Partial<ChartAttrs>) => ReturnType;
    };
  }
}

export const ChartExtension = Node.create({
  name: 'chart',

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  isolating: true,

  addAttributes() {
    return {
      chartType: {
        default: DEFAULT_ATTRS.chartType,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-type') || DEFAULT_ATTRS.chartType,
        renderHTML: (attributes: { chartType?: string }) => ({
          'data-chart-type': attributes.chartType ?? DEFAULT_ATTRS.chartType,
        }),
      },
      labels: {
        default: DEFAULT_ATTRS.labels,
        parseHTML: (element: HTMLElement) => {
          const encoded = element.getAttribute('data-chart-labels');
          if (encoded) {
            try {
              const parsed = JSON.parse(encoded);
              if (Array.isArray(parsed)) {
                return parsed;
              }
            } catch {}
          }
          return DEFAULT_ATTRS.labels;
        },
        renderHTML: (attributes: { labels?: string[] }) => ({
          'data-chart-labels': JSON.stringify(Array.isArray(attributes.labels) ? attributes.labels : DEFAULT_ATTRS.labels),
        }),
      },
      datasets: {
        default: DEFAULT_ATTRS.datasets,
        parseHTML: (element: HTMLElement) => {
          const encoded = element.getAttribute('data-chart-datasets');
          if (encoded) {
            try {
              const parsed = JSON.parse(encoded);
              if (Array.isArray(parsed)) {
                return parsed;
              }
            } catch {}
          }
          return DEFAULT_ATTRS.datasets;
        },
        renderHTML: (attributes: { datasets?: ChartDatasetAttr[] }) => ({
          'data-chart-datasets': JSON.stringify(Array.isArray(attributes.datasets) ? attributes.datasets : DEFAULT_ATTRS.datasets),
        }),
      },
      width: {
        default: DEFAULT_ATTRS.width,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-chart-width');
          const parsed = raw ? Number(raw) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DIMENSIONS.width;
        },
        renderHTML: (attributes: { width?: number }) => ({
          'data-chart-width': attributes.width ?? DEFAULT_DIMENSIONS.width,
        }),
      },
      height: {
        default: DEFAULT_ATTRS.height,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-chart-height');
          const parsed = raw ? Number(raw) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DIMENSIONS.height;
        },
        renderHTML: (attributes: { height?: number }) => ({
          'data-chart-height': attributes.height ?? DEFAULT_DIMENSIONS.height,
        }),
      },
      title: {
        default: DEFAULT_ATTRS.title,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-title') || '',
        renderHTML: (attributes: { title?: string }) => ({
          'data-chart-title': attributes.title ?? '',
        }),
      },
      showLegend: {
        default: DEFAULT_ATTRS.showLegend,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-legend') !== 'false',
        renderHTML: (attributes: { showLegend?: boolean }) => ({
          'data-chart-legend': String(attributes.showLegend ?? true),
        }),
      },
      fontSize: {
        default: DEFAULT_ATTRS.fontSize,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-chart-fontsize');
          const parsed = raw ? Number(raw) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ATTRS.fontSize;
        },
        renderHTML: (attributes: { fontSize?: number }) => ({
          'data-chart-fontsize': attributes.fontSize ?? DEFAULT_ATTRS.fontSize,
        }),
      },
    } satisfies Record<string, any>;
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart-node' })];
  },

  addCommands() {
    return {
      setChart:
        (attrs: Partial<ChartAttrs> = {}) =>
        (commandProps: CommandProps) => {
          const { state, commands, chain, editor } = commandProps;
          const nextAttrs = normalizeChartAttrs(attrs);

          const { selection } = state;
          if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
            return commands.updateAttributes(this.name, nextAttrs);
          }

          const paginationOptions = resolvePaginationOptions(editor ?? null);
          const chartHeight = typeof nextAttrs.height === 'number' ? nextAttrs.height : DEFAULT_DIMENSIONS.height;
          const insertPos = paginationOptions ? computeNextPageInsertionPosition(paginationOptions, commandProps, chartHeight) : null;

          if (typeof insertPos === 'number') {
            return chain()
              .focus()
              .insertContentAt(insertPos, {
                type: this.name,
                attrs: nextAttrs,
              })
              .run();
          }

          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: nextAttrs,
            })
            .run();
        },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(ChartNode);
  },
});
