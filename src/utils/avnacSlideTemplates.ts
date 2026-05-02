import type { AvnacDocumentV1 } from '@avnac/lib/avnac-document'

export type AvnacDeckTheme =
  | 'blank'
  | 'default'
  | 'professional'
  | 'pitch'
  | 'academic'
  | 'product'
  | 'report'
  | 'sales'
  | 'strategy'
  | 'training'
  | 'portfolio'
  | 'financial'
  | 'marketing'
  | 'operations'
  | 'education'
  | 'minimal'

type ThemeKey = Exclude<AvnacDeckTheme, 'blank'>

const THEME_LABELS: Record<AvnacDeckTheme, string> = {
  blank: 'Blank Presentation',
  default: 'Default Theme Presentation',
  professional: 'Professional Presentation',
  pitch: 'Pitch Deck Presentation',
  academic: 'Academic Presentation',
  product: 'Product Roadmap Presentation',
  report: 'Quarterly Report Presentation',
  sales: 'Sales Proposal Presentation',
  strategy: 'Strategy Brief Presentation',
  training: 'Training Module Presentation',
  portfolio: 'Portfolio Review Presentation',
  financial: 'Financial Review Presentation',
  marketing: 'Marketing Plan Presentation',
  operations: 'Operations Plan Presentation',
  education: 'Lesson Deck Presentation',
  minimal: 'Minimal Deck Presentation',
}

export type AvnacDeckTemplateOption = {
  theme: AvnacDeckTheme
  title: string
  description: string
  accent: string
  surface: string
  text: string
  slides: string
}

export const AVNAC_DECK_TEMPLATE_OPTIONS: AvnacDeckTemplateOption[] = [
  {
    theme: 'blank',
    title: 'Blank canvas',
    description: 'Start from a clean widescreen slide with no layout decisions baked in.',
    accent: '#18181b',
    surface: '#ffffff',
    text: '#111827',
    slides: '1 slide',
  },
  {
    theme: 'pitch',
    title: 'Investor pitch',
    description: 'A high-contrast venture narrative with traction, market, roadmap, and close.',
    accent: '#f97316',
    surface: '#111827',
    text: '#f9fafb',
    slides: '8 slides',
  },
  {
    theme: 'professional',
    title: 'Executive brief',
    description: 'Quiet boardroom styling for decisions, recommendations, and next steps.',
    accent: '#0f766e',
    surface: '#f8fafc',
    text: '#0f172a',
    slides: '8 slides',
  },
  {
    theme: 'product',
    title: 'Product roadmap',
    description: 'Launch-ready structure for priorities, milestones, feature tradeoffs, and release plans.',
    accent: '#7c3aed',
    surface: '#f5f3ff',
    text: '#18181b',
    slides: '8 slides',
  },
  {
    theme: 'report',
    title: 'Quarterly report',
    description: 'Metric-forward pages for performance, risks, observations, and leadership asks.',
    accent: '#0891b2',
    surface: '#ecfeff',
    text: '#164e63',
    slides: '8 slides',
  },
  {
    theme: 'sales',
    title: 'Sales proposal',
    description: 'Customer-facing proposal flow with value, proof, commercial impact, and close.',
    accent: '#ca8a04',
    surface: '#fefce8',
    text: '#1f2937',
    slides: '8 slides',
  },
  {
    theme: 'strategy',
    title: 'Strategy offsite',
    description: 'A structured strategy deck for choices, operating model, roadmap, and owners.',
    accent: '#65a30d',
    surface: '#f7fee7',
    text: '#1a2e05',
    slides: '8 slides',
  },
  {
    theme: 'portfolio',
    title: 'Portfolio review',
    description: 'A polished showcase for selected work, case studies, outcomes, and recommendations.',
    accent: '#0ea5e9',
    surface: '#fafaf9',
    text: '#1c1917',
    slides: '8 slides',
  },
]

const THEME_ALIASES: Record<string, AvnacDeckTheme> = {
  blank: 'blank',
  'blank-canvas': 'blank',
  'blank-presentation': 'blank',
  default: 'default',
  'default-theme': 'default',
  professional: 'professional',
  seriph: 'professional',
  'seriph-theme': 'professional',
  pitch: 'pitch',
  'pitch-deck': 'pitch',
  purplin: 'pitch',
  'purplin-theme': 'pitch',
  academic: 'academic',
  'academic-theme': 'academic',
  product: 'product',
  'product-roadmap': 'product',
  report: 'report',
  'quarterly-report': 'report',
  sales: 'sales',
  'sales-proposal': 'sales',
  strategy: 'strategy',
  'strategy-brief': 'strategy',
  training: 'training',
  'training-module': 'training',
  portfolio: 'portfolio',
  'portfolio-review': 'portfolio',
  financial: 'financial',
  'financial-review': 'financial',
  finance: 'financial',
  marketing: 'marketing',
  'marketing-plan': 'marketing',
  operations: 'operations',
  'operations-plan': 'operations',
  education: 'education',
  'lesson-deck': 'education',
  minimal: 'minimal',
  'minimal-deck': 'minimal',
  neversink: 'minimal',
  'neversink-theme': 'minimal',
}

type TextBox = {
  text: string
  left: number
  top: number
  width: number
  fontSize: number
  fill: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
}

type ThemeColors = {
  bg: string
  title: string
  body: string
  accent: string
  secondary: string
  surface: string
  muted: string
}

const ARTBOARD = { width: 4000, height: 2250 }

const THEME_COLORS: Record<ThemeKey, ThemeColors> = {
  default: {
    bg: '#ffffff',
    title: '#111827',
    body: '#4b5563',
    accent: '#2563eb',
    secondary: '#14b8a6',
    surface: '#eff6ff',
    muted: '#dbeafe',
  },
  professional: {
    bg: '#f8fafc',
    title: '#0f172a',
    body: '#475569',
    accent: '#0f766e',
    secondary: '#2563eb',
    surface: '#ccfbf1',
    muted: '#e2e8f0',
  },
  pitch: {
    bg: '#111827',
    title: '#f9fafb',
    body: '#d1d5db',
    accent: '#f97316',
    secondary: '#38bdf8',
    surface: '#1f2937',
    muted: '#374151',
  },
  academic: {
    bg: '#fff7ed',
    title: '#1c1917',
    body: '#57534e',
    accent: '#b91c1c',
    secondary: '#92400e',
    surface: '#fed7aa',
    muted: '#ffedd5',
  },
  product: {
    bg: '#f5f3ff',
    title: '#18181b',
    body: '#52525b',
    accent: '#7c3aed',
    secondary: '#db2777',
    surface: '#ddd6fe',
    muted: '#ede9fe',
  },
  report: {
    bg: '#ecfeff',
    title: '#164e63',
    body: '#155e75',
    accent: '#0891b2',
    secondary: '#0f766e',
    surface: '#cffafe',
    muted: '#e0f2fe',
  },
  sales: {
    bg: '#fefce8',
    title: '#1f2937',
    body: '#4b5563',
    accent: '#ca8a04',
    secondary: '#16a34a',
    surface: '#fef3c7',
    muted: '#fef9c3',
  },
  strategy: {
    bg: '#f7fee7',
    title: '#1a2e05',
    body: '#3f6212',
    accent: '#65a30d',
    secondary: '#0284c7',
    surface: '#d9f99d',
    muted: '#ecfccb',
  },
  training: {
    bg: '#fdf2f8',
    title: '#831843',
    body: '#9d174d',
    accent: '#be185d',
    secondary: '#4f46e5',
    surface: '#fbcfe8',
    muted: '#fce7f3',
  },
  portfolio: {
    bg: '#fafaf9',
    title: '#1c1917',
    body: '#57534e',
    accent: '#0ea5e9',
    secondary: '#f43f5e',
    surface: '#e7e5e4',
    muted: '#f5f5f4',
  },
  financial: {
    bg: '#f0fdf4',
    title: '#052e16',
    body: '#166534',
    accent: '#15803d',
    secondary: '#0369a1',
    surface: '#bbf7d0',
    muted: '#dcfce7',
  },
  marketing: {
    bg: '#fff1f2',
    title: '#881337',
    body: '#9f1239',
    accent: '#e11d48',
    secondary: '#7c3aed',
    surface: '#fecdd3',
    muted: '#ffe4e6',
  },
  operations: {
    bg: '#f1f5f9',
    title: '#0f172a',
    body: '#334155',
    accent: '#475569',
    secondary: '#ea580c',
    surface: '#cbd5e1',
    muted: '#e2e8f0',
  },
  education: {
    bg: '#eef2ff',
    title: '#312e81',
    body: '#4338ca',
    accent: '#4f46e5',
    secondary: '#0891b2',
    surface: '#c7d2fe',
    muted: '#e0e7ff',
  },
  minimal: {
    bg: '#ffffff',
    title: '#09090b',
    body: '#52525b',
    accent: '#18181b',
    secondary: '#71717a',
    surface: '#f4f4f5',
    muted: '#e4e4e7',
  },
}

function textbox(opts: TextBox) {
  return {
    type: 'Textbox',
    left: opts.left,
    top: opts.top,
    width: opts.width,
    fill: opts.fill,
    fontFamily: 'Inter',
    fontSize: opts.fontSize,
    fontWeight: opts.fontWeight ?? 'normal',
    textAlign: opts.textAlign ?? 'left',
    text: opts.text,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
  } as any
}

function rect(opts: { left: number; top: number; width: number; height: number; fill: string; rx?: number; opacity?: number }) {
  return {
    type: 'Rect',
    left: opts.left,
    top: opts.top,
    width: opts.width,
    height: opts.height,
    fill: opts.fill,
    rx: opts.rx ?? 0,
    ry: opts.rx ?? 0,
    opacity: opts.opacity ?? 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    avnacShape: { kind: 'rect' },
  } as any
}

function baseDoc(theme: ThemeKey, objects: any[]): AvnacDocumentV1 {
  const colors = THEME_COLORS[theme]
  return {
    v: 2,
    artboard: { ...ARTBOARD },
    bg: { type: 'solid', color: colors.bg } as any,
    fabric: {
      version: '6.6.1',
      objects,
    },
  }
}

function titleSlide(theme: ThemeKey, title: string, subtitle: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  return baseDoc(theme, [
    rect({ left: 0, top: 0, width: 4000, height: 2250, fill: c.bg }),
    rect({ left: 260, top: 250, width: 112, height: 112, fill: c.accent, rx: 28 }),
    rect({ left: 395, top: 250, width: 112, height: 112, fill: c.secondary, rx: 28, opacity: 0.74 }),
    textbox({ text: title, left: 260, top: 680, width: 2920, fontSize: 150, fill: c.title, fontWeight: 'bold' }),
    textbox({ text: subtitle, left: 270, top: 1040, width: 2600, fontSize: 60, fill: c.body }),
    rect({ left: 260, top: 1790, width: 1020, height: 18, fill: c.accent, rx: 9 }),
    textbox({ text: 'Prepared for your audience', left: 2720, top: 1840, width: 760, fontSize: 34, fill: c.body, textAlign: 'right' }),
  ])
}

function sectionSlide(theme: ThemeKey, label: string, headline: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  return baseDoc(theme, [
    rect({ left: 300, top: 300, width: 3400, height: 1650, fill: c.surface, rx: 56, opacity: 0.72 }),
    rect({ left: 420, top: 430, width: 1160, height: 16, fill: c.accent, rx: 8 }),
    textbox({ text: label, left: 420, top: 620, width: 800, fontSize: 46, fill: c.accent, fontWeight: 'bold' }),
    textbox({ text: headline, left: 420, top: 800, width: 2860, fontSize: 118, fill: c.title, fontWeight: 'bold' }),
  ])
}

function agendaSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  const items = ['Context', 'Insight', 'Decision', 'Next steps']
  return baseDoc(theme, [
    textbox({ text: title, left: 280, top: 210, width: 2800, fontSize: 96, fill: c.title, fontWeight: 'bold' }),
    rect({ left: 280, top: 470, width: 880, height: 12, fill: c.accent, rx: 6 }),
    ...items.flatMap((item, index) => {
      const top = 720 + index * 300
      return [
        rect({ left: 420, top, width: 130, height: 130, fill: index % 2 ? c.secondary : c.accent, rx: 34 }),
        textbox({ text: String(index + 1), left: 420, top: top + 32, width: 130, fontSize: 54, fill: '#ffffff', fontWeight: 'bold', textAlign: 'center' }),
        textbox({ text: item, left: 650, top: top + 5, width: 1700, fontSize: 62, fill: c.title, fontWeight: 'bold' }),
        textbox({ text: 'Replace this prompt with the message this section needs to land.', left: 650, top: top + 92, width: 2200, fontSize: 38, fill: c.body }),
      ]
    }),
  ])
}

function contentSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  return baseDoc(theme, [
    rect({ left: 260, top: 240, width: 78, height: 78, fill: c.accent, rx: 18 }),
    textbox({ text: title, left: 390, top: 220, width: 2700, fontSize: 94, fill: c.title, fontWeight: 'bold' }),
    rect({ left: 390, top: 520, width: 1300, height: 10, fill: c.accent, rx: 5 }),
    rect({ left: 390, top: 760, width: 1260, height: 840, fill: c.surface, rx: 36 }),
    rect({ left: 1880, top: 760, width: 1260, height: 840, fill: c.muted, rx: 36, opacity: 0.92 }),
    textbox({ text: 'Key point', left: 500, top: 890, width: 960, fontSize: 62, fill: c.title, fontWeight: 'bold' }),
    textbox({ text: 'Use this area for the main message, evidence, or a concise visual explanation.', left: 500, top: 1050, width: 960, fontSize: 42, fill: c.body }),
    textbox({ text: 'Supporting point', left: 1990, top: 890, width: 960, fontSize: 62, fill: c.title, fontWeight: 'bold' }),
    textbox({ text: 'Add details, comparisons, metrics, or next steps without crowding the slide.', left: 1990, top: 1050, width: 960, fontSize: 42, fill: c.body }),
  ])
}

function metricSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  const metrics = [
    ['42%', 'Conversion lift'],
    ['$1.8M', 'Pipeline created'],
    ['3.2x', 'Productivity gain'],
  ]
  return baseDoc(theme, [
    textbox({ text: title, left: 280, top: 220, width: 2800, fontSize: 96, fill: c.title, fontWeight: 'bold' }),
    textbox({ text: 'Swap in your most important proof points and keep the commentary short.', left: 290, top: 410, width: 2400, fontSize: 42, fill: c.body }),
    ...metrics.flatMap(([value, label], index) => {
      const left = 330 + index * 1180
      return [
        rect({ left, top: 780, width: 980, height: 760, fill: index === 1 ? c.accent : c.surface, rx: 42 }),
        textbox({ text: value, left: left + 80, top: 940, width: 760, fontSize: 116, fill: index === 1 ? '#ffffff' : c.title, fontWeight: 'bold' }),
        textbox({ text: label, left: left + 84, top: 1140, width: 760, fontSize: 44, fill: index === 1 ? '#ffffff' : c.body }),
        rect({ left: left + 84, top: 1360, width: 520, height: 12, fill: index === 1 ? '#ffffff' : c.secondary, rx: 6, opacity: 0.8 }),
      ]
    }),
  ])
}

function timelineSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  const labels = ['Discover', 'Design', 'Build', 'Launch']
  return baseDoc(theme, [
    textbox({ text: title, left: 280, top: 220, width: 2800, fontSize: 96, fill: c.title, fontWeight: 'bold' }),
    rect({ left: 520, top: 1110, width: 2820, height: 18, fill: c.muted, rx: 9 }),
    ...labels.flatMap((label, index) => {
      const left = 520 + index * 940
      return [
        rect({ left: left - 45, top: 1035, width: 150, height: 150, fill: index % 2 ? c.secondary : c.accent, rx: 75 }),
        textbox({ text: String(index + 1), left: left - 45, top: 1075, width: 150, fontSize: 50, fill: '#ffffff', fontWeight: 'bold', textAlign: 'center' }),
        textbox({ text: label, left: left - 180, top: 1280, width: 520, fontSize: 52, fill: c.title, fontWeight: 'bold', textAlign: 'center' }),
        textbox({ text: 'Milestone details', left: left - 200, top: 1370, width: 560, fontSize: 34, fill: c.body, textAlign: 'center' }),
      ]
    }),
  ])
}

function comparisonSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  return baseDoc(theme, [
    textbox({ text: title, left: 280, top: 210, width: 2800, fontSize: 96, fill: c.title, fontWeight: 'bold' }),
    rect({ left: 420, top: 610, width: 1420, height: 1120, fill: c.surface, rx: 42 }),
    rect({ left: 2160, top: 610, width: 1420, height: 1120, fill: c.muted, rx: 42 }),
    textbox({ text: 'Current state', left: 540, top: 750, width: 980, fontSize: 66, fill: c.title, fontWeight: 'bold' }),
    textbox({ text: 'Future state', left: 2280, top: 750, width: 980, fontSize: 66, fill: c.title, fontWeight: 'bold' }),
    textbox({ text: 'Pain point\nManual effort\nFragmented tools', left: 560, top: 970, width: 1040, fontSize: 44, fill: c.body }),
    textbox({ text: 'Better outcome\nAutomated flow\nConnected workspace', left: 2300, top: 970, width: 1040, fontSize: 44, fill: c.body }),
    rect({ left: 1900, top: 1080, width: 200, height: 56, fill: c.accent, rx: 28 }),
  ])
}

function processSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  const steps = ['Input', 'Analyze', 'Decide', 'Act']
  return baseDoc(theme, [
    textbox({ text: title, left: 280, top: 220, width: 2800, fontSize: 96, fill: c.title, fontWeight: 'bold' }),
    ...steps.flatMap((step, index) => {
      const left = 330 + index * 880
      return [
        rect({ left, top: 780, width: 700, height: 540, fill: index % 2 ? c.muted : c.surface, rx: 36 }),
        rect({ left: left + 62, top: 860, width: 92, height: 92, fill: index % 2 ? c.secondary : c.accent, rx: 24 }),
        textbox({ text: step, left: left + 62, top: 1020, width: 520, fontSize: 58, fill: c.title, fontWeight: 'bold' }),
        textbox({ text: 'Describe the action, owner, or output for this stage.', left: left + 66, top: 1130, width: 520, fontSize: 36, fill: c.body }),
      ]
    }),
  ])
}

function closingSlide(theme: ThemeKey, title: string): AvnacDocumentV1 {
  const c = THEME_COLORS[theme]
  return baseDoc(theme, [
    rect({ left: 460, top: 420, width: 3080, height: 1320, fill: c.surface, rx: 64, opacity: 0.8 }),
    textbox({ text: title, left: 680, top: 710, width: 2400, fontSize: 128, fill: c.title, fontWeight: 'bold', textAlign: 'center' }),
    textbox({ text: 'Add the single next step you want the audience to take.', left: 820, top: 1010, width: 2120, fontSize: 50, fill: c.body, textAlign: 'center' }),
    rect({ left: 1480, top: 1290, width: 1040, height: 18, fill: c.accent, rx: 9 }),
  ])
}

export function createBlankAvnacSlide(): AvnacDocumentV1 {
  return {
    v: 2,
    artboard: { ...ARTBOARD },
    bg: { type: 'solid', color: '#ffffff' } as any,
    fabric: { version: '6.6.1', objects: [] },
  }
}

export function createDefaultAvnacSlide(): AvnacDocumentV1 {
  return baseDoc('default', [
    textbox({ text: 'Click to add title', left: 260, top: 250, width: 3300, fontSize: 118, fill: '#111827', fontWeight: 'bold' }),
    textbox({ text: 'Click to add content', left: 270, top: 560, width: 3000, fontSize: 58, fill: '#6b7280' }),
    rect({ left: 270, top: 820, width: 1120, height: 620, fill: '#eff6ff', rx: 32 }),
    rect({ left: 1530, top: 820, width: 1120, height: 620, fill: '#ecfeff', rx: 32 }),
  ])
}

export function resolveAvnacDeckTheme(value: string | undefined | null): AvnacDeckTheme {
  if (!value) return 'default'
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return THEME_ALIASES[key] ?? 'default'
}

export function getAvnacDeckThemeTitle(theme: AvnacDeckTheme): string {
  return THEME_LABELS[theme]
}

export function createAvnacSlidesForTheme(theme: AvnacDeckTheme): AvnacDocumentV1[] {
  if (theme === 'blank') return [createBlankAvnacSlide()]
  if (theme === 'default') return [createDefaultAvnacSlide(), agendaSlide('default', 'Presentation agenda'), contentSlide('default', 'Main idea')]

  const names: Record<Exclude<AvnacDeckTheme, 'blank' | 'default'>, [string, string, string, string]> = {
    professional: ['Professional Deck', 'A polished business presentation', 'Executive Summary', 'Recommended path'],
    pitch: ['Pitch Deck', 'A focused story for investors and customers', 'Opportunity', 'Why now'],
    academic: ['Academic Presentation', 'Research, method, findings, and implications', 'Findings', 'Method'],
    product: ['Product Roadmap', 'Priorities, milestones, and launch narrative', 'Roadmap', 'Release plan'],
    report: ['Quarterly Report', 'Performance, insights, and recommendations', 'Highlights', 'Performance'],
    sales: ['Sales Proposal', 'Position value, proof, and a clear close', 'Customer goals', 'Commercial impact'],
    strategy: ['Strategy Brief', 'Choices, trade-offs, and execution plan', 'Strategic choices', 'Operating model'],
    training: ['Training Module', 'Learning objectives, walkthrough, and recap', 'Learning path', 'Practice flow'],
    portfolio: ['Portfolio Review', 'Showcase work, decisions, and outcomes', 'Selected work', 'Case study'],
    financial: ['Financial Review', 'Numbers, risks, and decisions for leadership', 'Financial snapshot', 'Forecast'],
    marketing: ['Marketing Plan', 'Audience, channels, and campaign performance', 'Campaign thesis', 'Channel mix'],
    operations: ['Operations Plan', 'Processes, owners, bottlenecks, and cadence', 'Current flow', 'Improvement plan'],
    education: ['Lesson Deck', 'Concepts, examples, activities, and review', 'Lesson objective', 'Class activity'],
    minimal: ['Minimal Deck', 'Quiet layout for focused executive storytelling', 'Core message', 'Supporting detail'],
  }

  const [title, subtitle, section, detail] = names[theme]
  return [
    titleSlide(theme, title, subtitle),
    agendaSlide(theme, section),
    contentSlide(theme, detail),
    metricSlide(theme, 'Key metrics'),
    timelineSlide(theme, 'Timeline'),
    comparisonSlide(theme, 'Before and after'),
    processSlide(theme, 'Process'),
    closingSlide(theme, 'Next steps'),
  ]
}
