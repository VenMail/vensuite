/**
 * Slide Block System
 * 
 * Provides a registry of reusable block components that can be authored
 * in markdown using the :::block-type{props} container syntax and rendered
 * to themed HTML.  Each block definition declares:
 *   - the CSS class(es) it maps to
 *   - an editable property schema (for the properties panel)
 *   - a render function that converts props → HTML
 *
 * Markdown syntax (MDC-style containers):
 *   :::market-slide{gradient="blue"}
 *   Content here (parsed as inner markdown)
 *   :::
 *
 * Nested blocks:
 *   :::metrics{cols=4}
 *   :::metric{value="$8.5B" label="Market Size" detail="9.2% CAGR"}
 *   :::
 *   :::metric{value="150K+" label="Target SMBs" detail="Fastest-growing"}
 *   :::
 *   :::
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockPropSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'color' | 'boolean' | 'textarea';
  default?: any;
  options?: { label: string; value: string }[];
  placeholder?: string;
  group?: string;
}

export interface BlockDefinition {
  /** Unique block type name used in :::type syntax */
  type: string;
  /** Human-readable label for the UI */
  label: string;
  /** Short description */
  description: string;
  /** Category for grouping in the block picker */
  category: 'layout' | 'content' | 'data' | 'media' | 'decoration';
  /** Icon name (lucide) */
  icon: string;
  /** Editable properties */
  props: BlockPropSchema[];
  /** Whether this block can contain inner markdown / child blocks */
  hasChildren: boolean;
  /** Render block to HTML given resolved props and optional inner HTML */
  render: (props: Record<string, any>, innerHtml: string, blockId: string) => string;
  /** Generate default markdown for inserting this block */
  defaultMarkdown: (props?: Record<string, any>) => string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cls(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const GRADIENT_MAP: Record<string, string> = {
  purple: 'bg-gradient-purple',
  emerald: 'bg-gradient-emerald',
  blue: 'bg-gradient-blue',
  amber: 'bg-gradient-amber',
  rose: 'bg-gradient-rose',
  slate: 'bg-gradient-slate',
};

const GRADIENT_STYLE_MAP: Record<string, string> = {
  purple: 'linear-gradient(135deg, #581c87 0%, #6b21a8 50%, #4c1d95 100%)',
  emerald: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
  blue: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
  amber: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
  rose: 'linear-gradient(135deg, #881337 0%, #be123c 50%, #9f1239 100%)',
  slate: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
  orange: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)',
  green: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
  red: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
  cyan: 'linear-gradient(135deg, #164e63 0%, #155e75 50%, #0e7490 100%)',
  indigo: 'linear-gradient(135deg, #312e81 0%, #3730a3 50%, #4338ca 100%)',
  pink: 'linear-gradient(135deg, #831843 0%, #9d174d 50%, #be185d 100%)',
  teal: 'linear-gradient(135deg, #134e4a 0%, #115e59 50%, #0f766e 100%)',
};

function resolveGradientClass(gradient?: string): string {
  if (!gradient) return 'bg-gradient-purple';
  return GRADIENT_MAP[gradient] || `bg-gradient-${gradient}`;
}

function resolveGradientStyle(gradient?: string): string {
  if (!gradient) return GRADIENT_STYLE_MAP.purple;
  return GRADIENT_STYLE_MAP[gradient] || GRADIENT_STYLE_MAP.purple;
}

// ---------------------------------------------------------------------------
// Block Definitions
// ---------------------------------------------------------------------------

const marketSlide: BlockDefinition = {
  type: 'market-slide',
  label: 'Market Slide',
  description: 'Full cinematic slide with gradient background',
  category: 'layout',
  icon: 'Presentation',
  hasChildren: true,
  props: [
    { key: 'gradient', label: 'Gradient', type: 'select', default: 'blue', options: [
      { label: 'Purple', value: 'purple' },
      { label: 'Emerald', value: 'emerald' },
      { label: 'Blue', value: 'blue' },
      { label: 'Amber', value: 'amber' },
      { label: 'Rose', value: 'rose' },
      { label: 'Slate', value: 'slate' },
      { label: 'Orange', value: 'orange' },
      { label: 'Green', value: 'green' },
      { label: 'Red', value: 'red' },
      { label: 'Cyan', value: 'cyan' },
      { label: 'Indigo', value: 'indigo' },
      { label: 'Pink', value: 'pink' },
      { label: 'Teal', value: 'teal' },
    ], group: 'Style' },
  ],
  render(props, innerHtml, blockId) {
    const gradientCls = resolveGradientClass(props.gradient);
    const gradientStyle = resolveGradientStyle(props.gradient);
    return `<section class="${cls('venmail-market-slide', gradientCls, 'text-white')}" style="background: ${gradientStyle}" data-block-type="market-slide" data-block-id="${esc(blockId)}">${innerHtml}</section>`;
  },
  defaultMarkdown() {
    return `:::market-slide{gradient="blue"}\n\n:::headline{pill="Market Opportunity"}\n# $160M ARR in underserved SMB markets\nEmail • Collaboration • Automation — one stack\n:::\n\n:::metrics{cols=4}\n:::metric{value="$8.5B" label="Email Software" detail="9.2% CAGR by 2030"}\n:::\n:::metric{value="150K+" label="Target SMBs" detail="Fastest-growing"}\n:::\n:::metric{value="$50B+" label="Public Sector" detail="12% CAGR"}\n:::\n:::metric{value="$30K" label="Effective ACV" detail="Storage-based pricing"}\n:::\n:::\n\n:::`;
  },
};

const headline: BlockDefinition = {
  type: 'headline',
  label: 'Headline',
  description: 'Section headline with optional pill badge',
  category: 'content',
  icon: 'Type',
  hasChildren: true,
  props: [
    { key: 'pill', label: 'Pill Badge', type: 'text', default: '', placeholder: 'e.g. Market Opportunity', group: 'Content' },
  ],
  render(props, innerHtml, blockId) {
    const pillHtml = props.pill
      ? `<div class="market-pill">${esc(props.pill)}</div>`
      : '';
    return `<header class="market-headline" data-block-type="headline" data-block-id="${esc(blockId)}">${pillHtml}<div class="market-title-row">${innerHtml}</div></header>`;
  },
  defaultMarkdown(props) {
    const pill = props?.pill || 'Section Title';
    return `:::headline{pill="${pill}"}\n# Your Headline Here\nSubtitle or tagline\n:::`;
  },
};

const metrics: BlockDefinition = {
  type: 'metrics',
  label: 'Metrics Grid',
  description: 'Grid of metric cards',
  category: 'data',
  icon: 'BarChart3',
  hasChildren: true,
  props: [
    { key: 'cols', label: 'Columns', type: 'select', default: '4', options: [
      { label: '2 Columns', value: '2' },
      { label: '3 Columns', value: '3' },
      { label: '4 Columns', value: '4' },
    ], group: 'Layout' },
  ],
  render(props, innerHtml, blockId) {
    const cols = props.cols || '4';
    return `<div class="market-metrics" style="grid-template-columns:repeat(${esc(cols)},minmax(0,1fr))" data-block-type="metrics" data-block-id="${esc(blockId)}">${innerHtml}</div>`;
  },
  defaultMarkdown() {
    return `:::metrics{cols=4}\n:::metric{value="$8.5B" label="Market Size" detail="Growing 18% YoY"}\n:::\n:::metric{value="250M+" label="Active Users" detail="Global reach"}\n:::\n:::metric{value="85%" label="Satisfaction" detail="Industry leading"}\n:::\n:::metric{value="12M" label="Enterprises" detail="Fortune 500"}\n:::\n:::`;
  },
};

const metric: BlockDefinition = {
  type: 'metric',
  label: 'Metric Card',
  description: 'Single metric with value, label, and detail',
  category: 'data',
  icon: 'Hash',
  hasChildren: false,
  props: [
    { key: 'value', label: 'Value', type: 'text', default: '0', placeholder: 'e.g. $8.5B', group: 'Content' },
    { key: 'label', label: 'Label', type: 'text', default: 'Metric', placeholder: 'e.g. Market Size', group: 'Content' },
    { key: 'detail', label: 'Detail', type: 'text', default: '', placeholder: 'e.g. Growing 18% YoY', group: 'Content' },
    { key: 'color', label: 'Value Color', type: 'select', default: 'blue', options: [
      { label: 'Blue', value: 'blue' },
      { label: 'Purple', value: 'purple' },
      { label: 'Emerald', value: 'emerald' },
      { label: 'Amber', value: 'amber' },
      { label: 'Rose', value: 'rose' },
      { label: 'White', value: 'white' },
      { label: 'Orange', value: 'orange' },
      { label: 'Green', value: 'green' },
      { label: 'Red', value: 'red' },
      { label: 'Cyan', value: 'cyan' },
      { label: 'Indigo', value: 'indigo' },
      { label: 'Pink', value: 'pink' },
      { label: 'Teal', value: 'teal' },
    ], group: 'Style' },
  ],
  render(props, _innerHtml, blockId) {
    const colorClass = props.color ? `text-${props.color}-400` : 'text-blue-400';
    const METRIC_COLOR_MAP: Record<string, string> = {
      blue: '#60a5fa', purple: '#a78bfa', emerald: '#34d399',
      amber: '#fbbf24', rose: '#fb7185', white: '#ffffff',
      orange: '#fb923c', green: '#4ade80', red: '#f87171',
      cyan: '#22d3ee', indigo: '#818cf8', pink: '#f472b6', teal: '#2dd4bf',
    };
    const metricColor = METRIC_COLOR_MAP[props.color || 'blue'] || '#60a5fa';
    const detailHtml = props.detail ? `<small>${esc(props.detail)}</small>` : '';
    return `<div class="market-metric" data-block-type="metric" data-block-id="${esc(blockId)}"><span>${esc(props.label || 'Metric')}</span><strong class="${colorClass}" style="color: ${metricColor}">${esc(props.value || '0')}</strong>${detailHtml}</div>`;
  },
  defaultMarkdown(props) {
    return `:::metric{value="${props?.value || '$0'}" label="${props?.label || 'Metric'}" detail="${props?.detail || ''}"}\n:::`;
  },
};

const cardGrid: BlockDefinition = {
  type: 'card-grid',
  label: 'Card Grid',
  description: 'Grid of content cards',
  category: 'layout',
  icon: 'LayoutGrid',
  hasChildren: true,
  props: [
    { key: 'cols', label: 'Columns', type: 'select', default: '2', options: [
      { label: '1 Column', value: '1' },
      { label: '2 Columns', value: '2' },
      { label: '3 Columns', value: '3' },
    ], group: 'Layout' },
  ],
  render(props, innerHtml, blockId) {
    const cols = props.cols || '2';
    return `<div class="market-grid" style="grid-template-columns:repeat(${esc(cols)},minmax(0,1fr))" data-block-type="card-grid" data-block-id="${esc(blockId)}">${innerHtml}</div>`;
  },
  defaultMarkdown() {
    return `:::card-grid{cols=2}\n:::card{title="Card 1"}\n- **Item A**: Description\n- **Item B**: Description\n:::\n:::card{title="Card 2"}\n- **Item C**: Description\n- **Item D**: Description\n:::\n:::`;
  },
};

const card: BlockDefinition = {
  type: 'card',
  label: 'Card',
  description: 'Content card with title and optional badge',
  category: 'content',
  icon: 'Square',
  hasChildren: true,
  props: [
    { key: 'title', label: 'Title', type: 'text', default: 'Card Title', placeholder: 'Card title', group: 'Content' },
    { key: 'badge', label: 'Badge', type: 'text', default: '', placeholder: 'e.g. Milestone Plan', group: 'Content' },
    { key: 'highlight', label: 'Highlight', type: 'boolean', default: false, group: 'Style' },
  ],
  render(props, innerHtml, blockId) {
    const highlightCls = props.highlight ? ' market-highlight' : '';
    const titleHtml = props.title ? `<div class="market-card-title">${esc(props.title)}</div>` : '';
    const badgeHtml = props.badge ? `<div class="market-badge">${esc(props.badge)}</div>` : '';
    return `<article class="${cls('market-card', highlightCls)}" data-block-type="card" data-block-id="${esc(blockId)}">${titleHtml}${badgeHtml}${innerHtml}</article>`;
  },
  defaultMarkdown(props) {
    const title = props?.title || 'Card Title';
    return `:::card{title="${title}"}\n- **Item**: Description\n- **Item**: Description\n:::`;
  },
};

const cinematicFrame: BlockDefinition = {
  type: 'cinematic-frame',
  label: 'Cinematic Frame',
  description: 'Frosted glass card with border glow',
  category: 'decoration',
  icon: 'Frame',
  hasChildren: true,
  props: [
    { key: 'border', label: 'Border Color', type: 'select', default: 'purple', options: [
      { label: 'Purple', value: 'purple' },
      { label: 'Emerald', value: 'emerald' },
      { label: 'Blue', value: 'blue' },
      { label: 'Amber', value: 'amber' },
      { label: 'Rose', value: 'rose' },
    ], group: 'Style' },
    { key: 'padding', label: 'Padding', type: 'select', default: '8', options: [
      { label: 'Small (4)', value: '4' },
      { label: 'Medium (8)', value: '8' },
      { label: 'Large (12)', value: '12' },
    ], group: 'Style' },
  ],
  render(props, innerHtml, blockId) {
    const borderCls = props.border ? `border-${props.border}-700` : 'border-purple-700';
    const padCls = `p-${props.padding || '8'}`;
    const BORDER_COLOR_MAP: Record<string, string> = {
      purple: '#6d28d9', emerald: '#047857', blue: '#1d4ed8',
      amber: '#b45309', rose: '#be123c', slate: '#334155',
      orange: '#c2410c', green: '#15803d', red: '#b91c1c',
      cyan: '#0e7490', indigo: '#4338ca', pink: '#be185d', teal: '#0f766e',
    };
    const PAD_MAP: Record<string, string> = { '4': '1rem', '8': '2rem', '12': '3rem' };
    const borderColor = BORDER_COLOR_MAP[props.border || 'purple'] || '#6d28d9';
    const padding = PAD_MAP[props.padding || '8'] || '2rem';
    return `<div class="${cls('cinematic-frame', borderCls, padCls)}" style="border-color: ${borderColor}; padding: ${padding}" data-block-type="cinematic-frame" data-block-id="${esc(blockId)}">${innerHtml}</div>`;
  },
  defaultMarkdown() {
    return `:::cinematic-frame{border="purple" padding="8"}\n# Title\nContent goes here\n:::`;
  },
};

const iconRow: BlockDefinition = {
  type: 'icon-row',
  label: 'Icon + Heading Row',
  description: 'Horizontal row with icon and heading',
  category: 'content',
  icon: 'Smile',
  hasChildren: true,
  props: [
    { key: 'icon', label: 'Icon/Emoji', type: 'text', default: '🚀', placeholder: 'Emoji or icon name', group: 'Content' },
    { key: 'color', label: 'Icon Color', type: 'select', default: 'purple', options: [
      { label: 'Purple', value: 'purple' },
      { label: 'Emerald', value: 'emerald' },
      { label: 'Blue', value: 'blue' },
      { label: 'Amber', value: 'amber' },
      { label: 'Rose', value: 'rose' },
    ], group: 'Style' },
  ],
  render(props, innerHtml, blockId) {
    const colorCls = props.color ? `text-${props.color}-400` : 'text-purple-400';
    const ICON_COLOR_MAP: Record<string, string> = {
      purple: '#a78bfa', emerald: '#34d399', blue: '#60a5fa',
      amber: '#fbbf24', rose: '#fb7185', slate: '#94a3b8',
      orange: '#fb923c', green: '#4ade80', red: '#f87171',
      cyan: '#22d3ee', indigo: '#818cf8', pink: '#f472b6', teal: '#2dd4bf',
    };
    const iconColor = ICON_COLOR_MAP[props.color || 'purple'] || '#a78bfa';
    return `<div class="flex items-center gap-4 mb-6" style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem" data-block-type="icon-row" data-block-id="${esc(blockId)}"><div class="w-12 h-12 ${colorCls} text-4xl flex items-center justify-center" style="width:3rem;height:3rem;color:${iconColor};font-size:2.25rem;display:flex;align-items:center;justify-content:center">${esc(props.icon || '🚀')}</div><div class="flex-1" style="flex:1">${innerHtml}</div></div>`;
  },
  defaultMarkdown(props) {
    const icon = props?.icon || '🚀';
    return `:::icon-row{icon="${icon}" color="purple"}\n## Your Heading\n:::`;
  },
};

const dataList: BlockDefinition = {
  type: 'data-list',
  label: 'Data List',
  description: 'Labeled list with bold values (like TAM/SAM/SOM)',
  category: 'data',
  icon: 'List',
  hasChildren: true,
  props: [],
  render(_props, innerHtml, blockId) {
    return `<ul class="market-list" data-block-type="data-list" data-block-id="${esc(blockId)}">${innerHtml}</ul>`;
  },
  defaultMarkdown() {
    return `:::data-list\n:::data-item{label="TAM" value="400M SMBs globally"}\n:::\n:::data-item{label="SAM" value="40M tech-enabled SMBs"}\n:::\n:::`;
  },
};

const dataItem: BlockDefinition = {
  type: 'data-item',
  label: 'Data Item',
  description: 'Single labeled data point',
  category: 'data',
  icon: 'Minus',
  hasChildren: false,
  props: [
    { key: 'label', label: 'Label', type: 'text', default: 'Label', placeholder: 'e.g. TAM', group: 'Content' },
    { key: 'value', label: 'Value', type: 'text', default: 'Value', placeholder: 'e.g. 400M SMBs globally', group: 'Content' },
  ],
  render(props, _innerHtml, blockId) {
    return `<li data-block-type="data-item" data-block-id="${esc(blockId)}"><span>${esc(props.label || 'Label')}</span><strong>${esc(props.value || 'Value')}</strong></li>`;
  },
  defaultMarkdown(props) {
    return `:::data-item{label="${props?.label || 'Label'}" value="${props?.value || 'Value'}"}\n:::`;
  },
};

const coverSlide: BlockDefinition = {
  type: 'cover-slide',
  label: 'Cover Slide',
  description: 'Full-screen cover with centered content',
  category: 'layout',
  icon: 'Maximize',
  hasChildren: true,
  props: [
    { key: 'gradient', label: 'Gradient', type: 'select', default: 'purple', options: [
      { label: 'Purple', value: 'purple' },
      { label: 'Emerald', value: 'emerald' },
      { label: 'Blue', value: 'blue' },
      { label: 'Amber', value: 'amber' },
      { label: 'Rose', value: 'rose' },
      { label: 'Slate', value: 'slate' },
      { label: 'Orange', value: 'orange' },
      { label: 'Green', value: 'green' },
      { label: 'Red', value: 'red' },
      { label: 'Cyan', value: 'cyan' },
      { label: 'Indigo', value: 'indigo' },
      { label: 'Pink', value: 'pink' },
      { label: 'Teal', value: 'teal' },
    ], group: 'Style' },
    { key: 'align', label: 'Alignment', type: 'select', default: 'center', options: [
      { label: 'Center', value: 'center' },
      { label: 'Left', value: 'left' },
    ], group: 'Layout' },
  ],
  render(props, innerHtml, blockId) {
    const gradientCls = resolveGradientClass(props.gradient);
    const gradientStyle = resolveGradientStyle(props.gradient);
    const alignCls = props.align === 'left' ? 'text-left items-start' : 'text-center items-center';
    return `<section class="${cls('venmail-market-slide', gradientCls, 'text-white flex flex-col justify-center', alignCls)}" style="background: ${gradientStyle}" data-block-type="cover-slide" data-block-id="${esc(blockId)}">${innerHtml}</section>`;
  },
  defaultMarkdown() {
    return `:::cover-slide{gradient="purple" align="center"}\n# Presentation Title\n\nSubtitle or tagline goes here\n\n*Company Name — Date*\n:::`;
  },
};

const splitLayout: BlockDefinition = {
  type: 'split',
  label: 'Split Layout',
  description: 'Two-column split layout',
  category: 'layout',
  icon: 'Columns',
  hasChildren: true,
  props: [
    { key: 'ratio', label: 'Ratio', type: 'select', default: '50-50', options: [
      { label: '50 / 50', value: '50-50' },
      { label: '60 / 40', value: '60-40' },
      { label: '40 / 60', value: '40-60' },
      { label: '70 / 30', value: '70-30' },
    ], group: 'Layout' },
    { key: 'gap', label: 'Gap', type: 'select', default: '6', options: [
      { label: 'Small', value: '4' },
      { label: 'Medium', value: '6' },
      { label: 'Large', value: '8' },
    ], group: 'Layout' },
  ],
  render(props, innerHtml, blockId) {
    const ratioMap: Record<string, string> = {
      '50-50': '1fr 1fr',
      '60-40': '3fr 2fr',
      '40-60': '2fr 3fr',
      '70-30': '7fr 3fr',
    };
    const cols = ratioMap[props.ratio || '50-50'] || '1fr 1fr';
    const gap = props.gap || '6';
    return `<div class="grid gap-${gap}" style="grid-template-columns:${cols}" data-block-type="split" data-block-id="${esc(blockId)}">${innerHtml}</div>`;
  },
  defaultMarkdown() {
    return `:::split{ratio="50-50" gap="6"}\n:::col\nLeft column content\n:::\n:::col\nRight column content\n:::\n:::`;
  },
};

const col: BlockDefinition = {
  type: 'col',
  label: 'Column',
  description: 'Column within a split layout',
  category: 'layout',
  icon: 'AlignJustify',
  hasChildren: true,
  props: [],
  render(_props, innerHtml, blockId) {
    return `<div class="flex flex-col gap-4" data-block-type="col" data-block-id="${esc(blockId)}">${innerHtml}</div>`;
  },
  defaultMarkdown() {
    return `:::col\nColumn content\n:::`;
  },
};

const spacer: BlockDefinition = {
  type: 'spacer',
  label: 'Spacer',
  description: 'Vertical spacing between blocks',
  category: 'decoration',
  icon: 'Minus',
  hasChildren: false,
  props: [
    { key: 'size', label: 'Size', type: 'select', default: '4', options: [
      { label: 'Small (2)', value: '2' },
      { label: 'Medium (4)', value: '4' },
      { label: 'Large (8)', value: '8' },
      { label: 'XL (12)', value: '12' },
    ], group: 'Layout' },
  ],
  render(props, _innerHtml, blockId) {
    const size = props.size || '4';
    return `<div class="h-${size}" data-block-type="spacer" data-block-id="${esc(blockId)}"></div>`;
  },
  defaultMarkdown(props) {
    return `:::spacer{size="${props?.size || '4'}"}\n:::`;
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const BLOCK_REGISTRY = new Map<string, BlockDefinition>();

function registerBlock(def: BlockDefinition) {
  BLOCK_REGISTRY.set(def.type, def);
}

// Register all built-in blocks
[
  marketSlide, headline, metrics, metric, cardGrid, card,
  cinematicFrame, iconRow, dataList, dataItem,
  coverSlide, splitLayout, col, spacer,
].forEach(registerBlock);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY.get(type);
}

export function getAllBlockDefinitions(): BlockDefinition[] {
  return Array.from(BLOCK_REGISTRY.values());
}

export function getBlocksByCategory(category: BlockDefinition['category']): BlockDefinition[] {
  return getAllBlockDefinitions().filter(b => b.category === category);
}

export function renderBlock(type: string, props: Record<string, any>, innerHtml: string, blockId: string): string {
  const def = BLOCK_REGISTRY.get(type);
  if (!def) {
    // Fallback: render as a generic div with the type as class
    return `<div class="block-${esc(type)}" data-block-type="${esc(type)}" data-block-id="${esc(blockId)}">${innerHtml}</div>`;
  }
  return def.render(props, innerHtml, blockId);
}

/**
 * Parse the props string from :::type{propsString}
 * e.g. 'gradient="blue" cols=4 highlight' → { gradient: 'blue', cols: '4', highlight: 'true' }
 */
export function parseBlockProps(propsString: string): Record<string, string> {
  const props: Record<string, string> = {};
  if (!propsString) return props;

  // Match key="value", key='value', key=value, or bare key
  const regex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(propsString)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? 'true';
    props[key] = value;
  }
  return props;
}

/**
 * Serialize props back to the :::type{propsString} format
 */
export function serializeBlockProps(props: Record<string, any>, _definition?: BlockDefinition): string {
  const parts: string[] = [];
  const entries = Object.entries(props).filter(([, v]) => v !== undefined && v !== null && v !== '');

  for (const [key, value] of entries) {
    if (value === 'true' || value === true) {
      parts.push(key);
    } else {
      const strVal = String(value);
      if (strVal.includes(' ') || strVal.includes('"')) {
        parts.push(`${key}='${strVal}'`);
      } else {
        parts.push(`${key}="${strVal}"`);
      }
    }
  }
  return parts.join(' ');
}

/**
 * Update a single prop in a :::block{props} line within markdown content.
 * Returns the updated markdown string.
 * Uses the same blockId generation as extractBlockInstances to ensure matching.
 */
export function updateBlockPropInMarkdown(
  markdown: string,
  blockId: string,
  propKey: string,
  propValue: any
): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let idCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Must match the same pattern as extractBlockInstances: :::type{props} or :::type
    const openMatch = trimmed.match(/^(:{3,})(\w[\w-]*)(?:\{([^}]*)\})?\s*$/);
    if (openMatch) {
      const [, colons, type, propsStr] = openMatch;
      const currentId = `container-${type}-${idCounter++}`;

      if (currentId === blockId) {
        const props = parseBlockProps(propsStr || '');
        props[propKey] = String(propValue);
        const def = getBlockDefinition(type);
        const newPropsStr = serializeBlockProps(props, def);
        result.push(`${colons}${type}{${newPropsStr}}`);
        continue;
      }
    }
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Get all block instances from markdown content with their line positions
 */
export interface BlockInstance {
  type: string;
  props: Record<string, string>;
  blockId: string;
  startLine: number;
  endLine: number;
  depth: number;
}

export function extractBlockInstances(markdown: string): BlockInstance[] {
  const lines = markdown.split('\n');
  const instances: BlockInstance[] = [];
  const stack: { type: string; startLine: number; depth: number }[] = [];
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Opening: :::type{props} or :::type
    const openMatch = trimmed.match(/^(:{3,})(\w[\w-]*)(?:\{([^}]*)\})?\s*$/);
    if (openMatch) {
      const [, , type, propsStr] = openMatch;
      const props = parseBlockProps(propsStr || '');
      const blockId = `container-${type}-${idCounter++}`;
      stack.push({ type, startLine: i, depth: stack.length });
      instances.push({
        type,
        props,
        blockId,
        startLine: i,
        endLine: i, // will be updated on close
        depth: stack.length - 1,
      });
      continue;
    }

    // Closing: ::: (bare)
    if (/^:{3,}\s*$/.test(trimmed) && stack.length > 0) {
      const opened = stack.pop()!;
      // Find the matching instance and update endLine
      for (let j = instances.length - 1; j >= 0; j--) {
        if (instances[j].startLine === opened.startLine) {
          instances[j].endLine = i;
          break;
        }
      }
    }
  }

  return instances;
}
