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
};

function normalizeChartAttrs(attrs: Partial<ChartAttrs> = {}): ChartAttrs {
  return {
    chartType: attrs.chartType ?? DEFAULT_ATTRS.chartType,
    labels: cloneLabels(attrs.labels),
    datasets: cloneDatasets(attrs.datasets),
    width: typeof attrs.width === 'number' && Number.isFinite(attrs.width) ? attrs.width : DEFAULT_ATTRS.width,
    height: typeof attrs.height === 'number' && Number.isFinite(attrs.height) ? attrs.height : DEFAULT_ATTRS.height,
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
        ({ state, commands, chain }: CommandProps) => {
          const nextAttrs = normalizeChartAttrs(attrs);

          const { selection } = state;
          if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
            return commands.updateAttributes(this.name, nextAttrs);
          }

          return chain()
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
