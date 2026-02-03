/**
 * Structured Motion Configuration Types
 * Replaces CSS animation map with proper data structure
 */

export interface MotionConfig {
  // Slide-level animation
  slide?: SlideMotionConfig
  
  // Content-level animation
  content?: ContentMotionConfig
  
  // Element-level animations
  elements: Record<string, ElementMotionConfig>
  
  // Global animation settings
  global?: GlobalMotionConfig
}

export interface SlideMotionConfig {
  variant: string
  trigger: 'immediate' | 'on-click' | 'on-hover' | 'on-scroll' | 'on-load' | 'delayed'
  delay?: number
  duration?: number
  easing?: string | number[]
  direction?: number
}

export interface ContentMotionConfig {
  variant: string
  trigger: 'immediate' | 'on-click' | 'on-hover' | 'on-scroll' | 'on-load'
  delay?: number
  duration?: number
  easing?: string | number[]
  stagger?: number
  staggerChildren?: number
  delayChildren?: number
}

export interface ElementMotionConfig {
  id: string
  type: 'item' | 'content' | 'progress'
  variant: string
  trigger: 'immediate' | 'on-click' | 'on-hover' | 'on-scroll' | 'on-load'
  delay?: number
  duration?: number
  easing?: string | number[]
  index?: number
  staggerRole?: 'default' | 'leader' | 'follower'
  
  // CSS animation fallback (for compatibility)
  cssAnimation?: {
    enabled: boolean
    type: string
    duration: number
    delay: number
    easing: string
    trigger: 'onLoad' | 'onClick' | 'onHover' | 'onScroll'
    repeat: boolean
    repeatCount: number | 'infinite'
  }
}

export interface GlobalMotionConfig {
  // Performance settings
  reducedMotion: boolean
  respectPrefersReducedMotion: boolean
  
  // Default settings
  defaultSlideVariant: string
  defaultContentVariant: string
  defaultItemVariant: string
  
  // Stagger defaults
  defaultStaggerChildren: number
  defaultDelayChildren: number
  
  // Timeline settings
  enableTimeline: boolean
  autoPlay: boolean
  loop: boolean
}

export interface MotionPreset {
  name: string
  description: string
  category: 'slide' | 'content' | 'item' | 'progress'
  config: SlideMotionConfig | ContentMotionConfig | ElementMotionConfig
}

// Helper functions for creating motion configs
export function createSlideMotionConfig(overrides: Partial<SlideMotionConfig> = {}): SlideMotionConfig {
  return {
    variant: 'venmail3d',
    trigger: 'immediate',
    delay: 0,
    duration: 600,
    easing: [0.25, 0.46, 0.45, 0.94],
    direction: 1,
    ...overrides
  }
}

export function createContentMotionConfig(overrides: Partial<ContentMotionConfig> = {}): ContentMotionConfig {
  return {
    variant: 'default',
    trigger: 'immediate',
    delay: 0,
    duration: 800,
    easing: 'ease-out',
    stagger: 0,
    staggerChildren: 200,
    delayChildren: 300,
    ...overrides
  }
}

export function createElementMotionConfig(
  id: string, 
  type: 'item' | 'content' | 'progress' = 'item',
  overrides: Partial<ElementMotionConfig> = {}
): ElementMotionConfig {
  return {
    id,
    type,
    variant: 'default',
    trigger: 'immediate',
    delay: 0,
    duration: 500,
    easing: 'ease-out',
    index: 0,
    staggerRole: 'default',
    cssAnimation: {
      enabled: false,
      type: 'fadeIn',
      duration: 1000,
      delay: 0,
      easing: 'ease-in-out',
      trigger: 'onLoad',
      repeat: false,
      repeatCount: 1
    },
    ...overrides
  }
}

export function createGlobalMotionConfig(overrides: Partial<GlobalMotionConfig> = {}): GlobalMotionConfig {
  return {
    reducedMotion: false,
    respectPrefersReducedMotion: true,
    defaultSlideVariant: 'venmail3d',
    defaultContentVariant: 'default',
    defaultItemVariant: 'default',
    defaultStaggerChildren: 200,
    defaultDelayChildren: 300,
    enableTimeline: false,
    autoPlay: true,
    loop: false,
    ...overrides
  }
}

// Preset configurations
export const MOTION_PRESETS: MotionPreset[] = [
  // Slide presets
  {
    name: '3D Slide',
    description: '3D perspective slide transition',
    category: 'slide',
    config: createSlideMotionConfig({
      variant: 'venmail3d',
      duration: 600,
      easing: [0.25, 0.46, 0.45, 0.94]
    })
  },
  {
    name: 'Slide Left',
    description: 'Simple slide from left',
    category: 'slide',
    config: createSlideMotionConfig({
      variant: 'slideLeft',
      duration: 400,
      easing: 'ease-out'
    })
  },
  {
    name: 'Zoom In',
    description: 'Zoom in with scale effect',
    category: 'slide',
    config: createSlideMotionConfig({
      variant: 'zoom',
      duration: 400,
      easing: [0.25, 0.46, 0.45, 0.94]
    })
  },
  {
    name: 'Rotate In',
    description: 'Rotate in with scale effect',
    category: 'slide',
    config: createSlideMotionConfig({
      variant: 'rotateIn',
      duration: 600,
      easing: [0.25, 0.46, 0.45, 0.94]
    })
  },
  {
    name: 'Bounce In',
    description: 'Bouncy entrance with spring easing',
    category: 'slide',
    config: createSlideMotionConfig({
      variant: 'bounceIn',
      duration: 800,
      easing: [0.68, -0.55, 0.265, 1.55]
    })
  },
  
  // Content presets
  {
    name: 'Fade In Staggered',
    description: 'Fade in with staggered children',
    category: 'content',
    config: createContentMotionConfig({
      variant: 'fadeIn',
      staggerChildren: 100,
      delayChildren: 100
    })
  },
  {
    name: 'Slide Up Staggered',
    description: 'Slide up with staggered children',
    category: 'content',
    config: createContentMotionConfig({
      variant: 'slideUp',
      staggerChildren: 120,
      delayChildren: 150
    })
  },
  {
    name: 'Scale In Staggered',
    description: 'Scale in with staggered children',
    category: 'content',
    config: createContentMotionConfig({
      variant: 'scaleIn',
      staggerChildren: 150,
      delayChildren: 200
    })
  },
  
  // Item presets
  {
    name: 'Item Fade In',
    description: 'Simple fade in for individual items',
    category: 'item',
    config: createElementMotionConfig('item-fade-in', 'item', {
      variant: 'fadeIn',
      duration: 400,
      easing: 'ease-out'
    })
  },
  {
    name: 'Item Slide Up',
    description: 'Slide up for individual items',
    category: 'item',
    config: createElementMotionConfig('item-slide-up', 'item', {
      variant: 'slideUp',
      duration: 500,
      easing: 'ease-out'
    })
  },
  {
    name: 'Item Scale In',
    description: 'Scale in for individual items',
    category: 'item',
    config: createElementMotionConfig('item-scale-in', 'item', {
      variant: 'itemScaleIn',
      duration: 300,
      easing: [0.25, 0.46, 0.45, 0.94]
    })
  },
  {
    name: 'Item Bounce In',
    description: 'Bouncy entrance for individual items',
    category: 'item',
    config: createElementMotionConfig('item-bounce-in', 'item', {
      variant: 'bounceIn',
      duration: 600,
      easing: [0.68, -0.55, 0.265, 1.55]
    })
  }
]
