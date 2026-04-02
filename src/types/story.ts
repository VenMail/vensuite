/**
 * StoryTeller Module - Type Definitions
 * Visual story builder with drag-and-drop editing, GSAP animations, and AI integration
 */

// ─── Block Types ─────────────────────────────────────────────────────
export type StoryBlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'embed'
  | 'shape'
  | 'chart'
  | 'code'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'stat'
  | 'icon'
  | 'spacer'
  | 'group';

export type StoryLayoutMode = 'freeform' | 'auto-stack';
export type StoryPresentationMode = 'scroll' | 'slide' | 'auto';

// ─── Animation Types ─────────────────────────────────────────────────
export type StoryAnimationTrigger =
  | 'on-enter'
  | 'on-click'
  | 'on-load'
  | 'after-previous'
  | 'with-previous';

export type EasingPreset =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'power1.out'
  | 'power2.out'
  | 'power3.out'
  | 'power4.out'
  | 'back.out'
  | 'elastic.out'
  | 'bounce.out'
  | 'circ.out'
  | 'expo.out';

export type StoryAnimationPresetName =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoomIn'
  | 'zoomOut'
  | 'rotateIn'
  | 'flipX'
  | 'flipY'
  | 'typewriter'
  | 'parallax'
  | 'bounceIn'
  | 'blurIn'
  | 'countUp'
  | 'staggerChildren'
  | 'none'
  | 'custom';

export interface StoryAnimation {
  id: string;
  blockId: string;
  trigger: StoryAnimationTrigger;
  preset: StoryAnimationPresetName;
  duration: number;
  delay: number;
  easing: EasingPreset | string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  scrollTrigger?: {
    start?: string;
    end?: string;
    scrub?: boolean | number;
    pin?: boolean;
  };
  order: number;
}

// ─── Block Position & Style ──────────────────────────────────────────
export interface StoryBlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
}

export interface StoryBlockStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  opacity?: number;
  padding?: string;
  overflow?: 'visible' | 'hidden' | 'auto';
  backdropFilter?: string;
  mixBlendMode?: string;
}

// ─── Block Content (no type field — block.type handles dispatch) ─────
export interface StoryTextContent {
  html: string;
  tiptapJson?: unknown;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface StoryImageContent {
  src: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  objectPosition?: string;
  filter?: string;
  caption?: string;
}

export interface StoryVideoContent {
  src: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export interface StoryEmbedContent {
  url: string;
  embedHtml?: string;
  aspectRatio?: string;
}

export interface StoryShapeContent {
  shape: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'star' | 'custom';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  svgPath?: string;
}

export interface StoryChartContent {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'radar';
  data: unknown;
  options?: unknown;
  animateOnReveal?: boolean;
}

export interface StoryCodeContent {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  typewriterReveal?: boolean;
}

export interface StoryQuoteContent {
  text: string;
  attribution?: string;
  variant: 'minimal' | 'bordered' | 'large' | 'pullquote';
}

export interface StoryDividerContent {
  variant: 'line' | 'dots' | 'gradient' | 'wave';
  color?: string;
}

export interface StoryCalloutContent {
  variant: 'info' | 'warning' | 'success' | 'error' | 'tip';
  title?: string;
  body: string;
  icon?: string;
}

export interface StoryStatContent {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  animateCount?: boolean;
}

export interface StoryIconContent {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export interface StorySpacerContent {
  height: number;
}

export type StoryBlockContent =
  | StoryTextContent
  | StoryImageContent
  | StoryVideoContent
  | StoryEmbedContent
  | StoryShapeContent
  | StoryChartContent
  | StoryCodeContent
  | StoryQuoteContent
  | StoryDividerContent
  | StoryCalloutContent
  | StoryStatContent
  | StoryIconContent
  | StorySpacerContent;

// ─── Block ───────────────────────────────────────────────────────────
export interface StoryBlock {
  id: string;
  type: StoryBlockType;
  position: StoryBlockPosition;
  style: StoryBlockStyle;
  content: StoryBlockContent;
  animations: StoryAnimation[];
  locked?: boolean;
  hidden?: boolean;
  name?: string;
  groupId?: string;
}

// ─── Scene ───────────────────────────────────────────────────────────
export interface StorySceneBackground {
  type: 'solid' | 'gradient' | 'image' | 'video';
  value: string;
  overlay?: string;
  parallaxStrength?: number;
}

export interface StorySceneTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'flip' | 'morph' | 'parallax';
  duration: number;
  easing: EasingPreset;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface StoryScene {
  id: string;
  name: string;
  blocks: StoryBlock[];
  background: StorySceneBackground;
  transition: StorySceneTransition;
  duration?: number;
  notes?: string;
  layout: StoryLayoutMode;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16' | 'auto';
}

// ─── Theme ───────────────────────────────────────────────────────────
export interface StoryTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    baseSize: number;
    scaleRatio: number;
  };
  spacing: {
    unit: number;
    scenePadding: number;
  };
  effects: {
    borderRadius: string;
    shadow: string;
    glassmorphism: boolean;
    darkMode: boolean;
  };
}

// ─── Settings ────────────────────────────────────────────────────────
export interface StorySettings {
  presentationMode: StoryPresentationMode;
  autoAdvance: boolean;
  autoAdvanceInterval: number;
  loopPresentation: boolean;
  showProgressBar: boolean;
  showSceneIndicator: boolean;
  scrollSnap: boolean;
  enableKeyboardNav: boolean;
  defaultSceneTransition: StorySceneTransition;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  canvasWidth: number;
  canvasHeight: number;
}

// ─── Document (top-level) ────────────────────────────────────────────
export interface StoryDocument {
  id: string;
  title: string;
  scenes: StoryScene[];
  theme: StoryTheme;
  settings: StorySettings;
  version: number;
}

// ─── Templates ───────────────────────────────────────────────────────
export type StoryTemplateCategory =
  | 'pitch-deck'
  | 'product-story'
  | 'case-study'
  | 'annual-report'
  | 'educational'
  | 'personal'
  | 'onboarding'
  | 'portfolio'
  | 'custom';

export interface StoryTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: StoryTemplateCategory;
  thumbnail?: string;
  theme: StoryTheme;
  scenes: Omit<StoryScene, 'id'>[];
  isBuiltIn: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

// ─── Defaults & Factories ────────────────────────────────────────────

export function createDefaultTheme(): StoryTheme {
  return {
    id: 'default',
    name: 'Default',
    colors: {
      primary: '#FF5C39',
      secondary: '#1a1a2e',
      accent: '#e94560',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#1a1a2e',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      monoFont: 'JetBrains Mono, monospace',
      baseSize: 16,
      scaleRatio: 1.25,
    },
    spacing: {
      unit: 8,
      scenePadding: 64,
    },
    effects: {
      borderRadius: '12px',
      shadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
      glassmorphism: false,
      darkMode: false,
    },
  };
}

export function createDefaultSettings(): StorySettings {
  return {
    presentationMode: 'slide',
    autoAdvance: false,
    autoAdvanceInterval: 5000,
    loopPresentation: false,
    showProgressBar: true,
    showSceneIndicator: true,
    scrollSnap: true,
    enableKeyboardNav: true,
    defaultSceneTransition: {
      type: 'fade',
      duration: 500,
      easing: 'ease-out',
    },
    aspectRatio: '16:9',
    canvasWidth: 1920,
    canvasHeight: 1080,
  };
}

export function createDefaultScene(name?: string): StoryScene {
  return {
    id: crypto.randomUUID(),
    name: name || 'Untitled Scene',
    blocks: [],
    background: {
      type: 'solid',
      value: '#ffffff',
    },
    transition: {
      type: 'fade',
      duration: 500,
      easing: 'ease-out',
    },
    layout: 'auto-stack',
  };
}

export function createDefaultBlock(type: StoryBlockType, partial?: Partial<StoryBlock>): StoryBlock {
  const defaults: Record<StoryBlockType, () => StoryBlockContent> = {
    text: () => ({ html: '<p>Enter text...</p>', textAlign: 'left' }) as StoryTextContent,
    heading: () => ({ html: '<h2>Heading</h2>', fontSize: 48, fontWeight: '700', textAlign: 'center' }) as StoryTextContent,
    image: () => ({ src: '', alt: '', objectFit: 'cover' }) as StoryImageContent,
    video: () => ({ src: '', autoplay: false, loop: false, muted: true, controls: true }) as StoryVideoContent,
    embed: () => ({ url: '' }) as StoryEmbedContent,
    shape: () => ({ shape: 'rectangle', fill: '#e5e7eb', stroke: 'transparent', strokeWidth: 0 }) as StoryShapeContent,
    chart: () => ({ chartType: 'bar', data: {} }) as StoryChartContent,
    code: () => ({ code: '', language: 'javascript', showLineNumbers: true }) as StoryCodeContent,
    quote: () => ({ text: 'Quote text...', variant: 'minimal' }) as StoryQuoteContent,
    divider: () => ({ variant: 'line', color: '#e5e7eb' }) as StoryDividerContent,
    callout: () => ({ variant: 'info', body: 'Callout content...' }) as StoryCalloutContent,
    stat: () => ({ value: '0', label: 'Label', animateCount: true }) as StoryStatContent,
    icon: () => ({ name: 'star', size: 48, color: '#1a1a2e' }) as StoryIconContent,
    spacer: () => ({ height: 48 }) as StorySpacerContent,
    group: () => ({ html: '' }) as StoryTextContent,
  };

  return {
    id: crypto.randomUUID(),
    type,
    position: {
      x: 0,
      y: 0,
      width: type === 'spacer' || type === 'divider' ? 1920 : 600,
      height: type === 'spacer' ? 48 : type === 'heading' ? 80 : type === 'text' ? 120 : 400,
      rotation: 0,
      zIndex: 0,
    },
    style: {},
    content: defaults[type](),
    animations: [],
    ...partial,
  };
}

export function createDefaultDocument(title?: string): StoryDocument {
  const scene = createDefaultScene('Scene 1');
  scene.blocks = [
    createDefaultBlock('heading', {
      position: { x: 160, y: 200, width: 1600, height: 120, zIndex: 1 },
      content: { html: '<h1>Your Story Title</h1>', fontSize: 64, fontWeight: '800', textAlign: 'center', color: '#1a1a2e' } as StoryTextContent,
    }),
    createDefaultBlock('text', {
      position: { x: 360, y: 380, width: 1200, height: 80, zIndex: 1 },
      content: { html: '<p>Click to edit and start telling your story</p>', fontSize: 24, textAlign: 'center', color: '#6b7280' } as StoryTextContent,
    }),
  ];

  return {
    id: crypto.randomUUID(),
    title: title || 'Untitled Story',
    scenes: [scene],
    theme: createDefaultTheme(),
    settings: createDefaultSettings(),
    version: 1,
  };
}
