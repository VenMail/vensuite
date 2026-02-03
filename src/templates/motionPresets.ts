/**
 * Motion Template Presets
 * Pre-configured animation combinations for different presentation types
 */

import type { MotionConfig, MotionPreset } from '@/types/motion'
import { createSlideMotionConfig, createContentMotionConfig, createElementMotionConfig, createGlobalMotionConfig } from '@/types/motion'

export interface MotionTemplate {
  id: string
  name: string
  description: string
  category: 'business' | 'creative' | 'educational' | 'technical' | 'minimal'
  preview: string // Preview image or description
  config: MotionConfig
  presets: MotionPreset[]
}

// Business Presentation Templates
export const businessTemplates: MotionTemplate[] = [
  {
    id: 'professional-pitch',
    name: 'Professional Pitch',
    description: 'Clean, corporate animations perfect for business presentations',
    category: 'business',
    preview: 'Smooth slide transitions with staggered content reveals',
    config: {
      slide: createSlideMotionConfig({
        variant: 'slideLeft',
        duration: 500,
        easing: 'ease-out'
      }),
      content: createContentMotionConfig({
        variant: 'slideUp',
        staggerChildren: 100,
        delayChildren: 200,
        duration: 600
      }),
      elements: {
        'title': createElementMotionConfig('title', 'content', {
          variant: 'slideUp',
          duration: 700,
          delay: 300,
          easing: 'ease-out'
        }),
        'bullet-points': createElementMotionConfig('bullet-points', 'item', {
          variant: 'slideUp',
          duration: 400,
          delay: 500,
          easing: 'ease-out',
          staggerRole: 'follower'
        }),
        'chart': createElementMotionConfig('chart', 'content', {
          variant: 'scaleIn',
          duration: 800,
          delay: 800,
          easing: [0.25, 0.46, 0.45, 0.94]
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'slideLeft',
        defaultContentVariant: 'slideUp',
        defaultItemVariant: 'slideUp',
        enableTimeline: true,
        autoPlay: false
      })
    },
    presets: [
      {
        name: 'Professional Slide',
        description: 'Clean slide transition',
        category: 'slide',
        config: createSlideMotionConfig({
          variant: 'slideLeft',
          duration: 500,
          easing: 'ease-out'
        })
      },
      {
        name: 'Content Reveal',
        description: 'Staggered content appearance',
        category: 'content',
        config: createContentMotionConfig({
          variant: 'slideUp',
          staggerChildren: 100,
          delayChildren: 200
        })
      }
    ]
  },
  {
    id: 'data-driven',
    name: 'Data-Driven Presentation',
    description: 'Focus on charts and data visualization with subtle animations',
    category: 'business',
    preview: 'Emphasizes data elements with scale and fade effects',
    config: {
      slide: createSlideMotionConfig({
        variant: 'fade',
        duration: 400,
        easing: 'ease-in-out'
      }),
      content: createContentMotionConfig({
        variant: 'fadeIn',
        staggerChildren: 150,
        delayChildren: 100
      }),
      elements: {
        'chart': createElementMotionConfig('chart', 'content', {
          variant: 'scaleIn',
          duration: 600,
          delay: 200,
          easing: [0.25, 0.46, 0.45, 0.94]
        }),
        'data-point': createElementMotionConfig('data-point', 'item', {
          variant: 'bounceIn',
          duration: 500,
          delay: 400,
          easing: [0.68, -0.55, 0.265, 1.55]
        }),
        'legend': createElementMotionConfig('legend', 'content', {
          variant: 'fadeIn',
          duration: 400,
          delay: 600
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'fade',
        defaultContentVariant: 'fadeIn',
        enableTimeline: true,
        autoPlay: false
      })
    },
    presets: []
  }
]

// Creative Presentation Templates
export const creativeTemplates: MotionTemplate[] = [
  {
    id: 'dynamic-showcase',
    name: 'Dynamic Showcase',
    description: 'Bold, eye-catching animations for creative presentations',
    category: 'creative',
    preview: '3D effects, rotations, and bouncy animations',
    config: {
      slide: createSlideMotionConfig({
        variant: 'venmail3d',
        duration: 600,
        easing: [0.25, 0.46, 0.45, 0.94]
      }),
      content: createContentMotionConfig({
        variant: 'scaleIn',
        staggerChildren: 120,
        delayChildren: 150,
        duration: 700
      }),
      elements: {
        'hero-image': createElementMotionConfig('hero-image', 'content', {
          variant: 'rotateIn',
          duration: 800,
          delay: 200,
          easing: [0.25, 0.46, 0.45, 0.94]
        }),
        'headline': createElementMotionConfig('headline', 'content', {
          variant: 'bounceIn',
          duration: 700,
          delay: 400,
          easing: [0.68, -0.55, 0.265, 1.55]
        }),
        'creative-element': createElementMotionConfig('creative-element', 'item', {
          variant: 'rotateIn',
          duration: 600,
          delay: 600,
          easing: [0.25, 0.46, 0.45, 0.94]
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'venmail3d',
        defaultContentVariant: 'scaleIn',
        defaultItemVariant: 'bounceIn',
        enableTimeline: true,
        autoPlay: true
      })
    },
    presets: []
  },
  {
    id: 'storytelling',
    name: 'Storytelling Flow',
    description: 'Narrative-focused animations that guide the audience',
    category: 'creative',
    preview: 'Sequential reveals with emotional pacing',
    config: {
      slide: createSlideMotionConfig({
        variant: 'flipIn',
        duration: 700,
        easing: [0.25, 0.46, 0.45, 0.94]
      }),
      content: createContentMotionConfig({
        variant: 'slideDown',
        staggerChildren: 200,
        delayChildren: 300,
        duration: 800
      }),
      elements: {
        'story-image': createElementMotionConfig('story-image', 'content', {
          variant: 'fadeIn',
          duration: 1000,
          delay: 300,
          easing: 'ease-in-out'
        }),
        'narrative-text': createElementMotionConfig('narrative-text', 'content', {
          variant: 'slideDown',
          duration: 600,
          delay: 800,
          easing: 'ease-out'
        }),
        'emotion-element': createElementMotionConfig('emotion-element', 'item', {
          variant: 'scaleIn',
          duration: 500,
          delay: 1200,
          easing: [0.68, -0.55, 0.265, 1.55]
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'flipIn',
        defaultContentVariant: 'slideDown',
        enableTimeline: true,
        autoPlay: false
      })
    },
    presets: []
  }
]

// Educational Presentation Templates
export const educationalTemplates: MotionTemplate[] = [
  {
    id: 'classroom-lesson',
    name: 'Classroom Lesson',
    description: 'Clear, educational animations that enhance learning',
    category: 'educational',
    preview: 'Structured reveals perfect for teaching concepts',
    config: {
      slide: createSlideMotionConfig({
        variant: 'slideUp',
        duration: 500,
        easing: 'ease-out'
      }),
      content: createContentMotionConfig({
        variant: 'fadeIn',
        staggerChildren: 100,
        delayChildren: 200,
        duration: 600
      }),
      elements: {
        'lesson-title': createElementMotionConfig('lesson-title', 'content', {
          variant: 'slideDown',
          duration: 600,
          delay: 200,
          easing: 'ease-out'
        }),
        'key-concept': createElementMotionConfig('key-concept', 'content', {
          variant: 'scaleIn',
          duration: 500,
          delay: 500,
          easing: [0.25, 0.46, 0.45, 0.94]
        }),
        'example': createElementMotionConfig('example', 'item', {
          variant: 'fadeIn',
          duration: 400,
          delay: 800,
          easing: 'ease-out'
        }),
        'exercise': createElementMotionConfig('exercise', 'item', {
          variant: 'slideUp',
          duration: 400,
          delay: 1000,
          easing: 'ease-out'
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'slideUp',
        defaultContentVariant: 'fadeIn',
        enableTimeline: true,
        autoPlay: false
      })
    },
    presets: []
  },
  {
    id: 'step-by-step',
    name: 'Step-by-Step Tutorial',
    description: 'Sequential animations perfect for tutorials',
    category: 'educational',
    preview: 'Clear progression through learning stages',
    config: {
      slide: createSlideMotionConfig({
        variant: 'slideRight',
        duration: 400,
        easing: 'ease-out'
      }),
      content: createContentMotionConfig({
        variant: 'slideUp',
        staggerChildren: 150,
        delayChildren: 100,
        duration: 700
      }),
      elements: {
        'step-number': createElementMotionConfig('step-number', 'content', {
          variant: 'scaleIn',
          duration: 400,
          delay: 100,
          easing: [0.25, 0.46, 0.45, 0.94]
        }),
        'instruction': createElementMotionConfig('instruction', 'content', {
          variant: 'fadeIn',
          duration: 500,
          delay: 300,
          easing: 'ease-out'
        }),
        'demo-element': createElementMotionConfig('demo-element', 'item', {
          variant: 'bounceIn',
          duration: 600,
          delay: 600,
          easing: [0.68, -0.55, 0.265, 1.55]
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'slideRight',
        defaultContentVariant: 'slideUp',
        enableTimeline: true,
        autoPlay: false
      })
    },
    presets: []
  }
]

// Technical Presentation Templates
export const technicalTemplates: MotionTemplate[] = [
  {
    id: 'tech-demo',
    name: 'Technical Demo',
    description: 'Precise animations for technical presentations',
    category: 'technical',
    preview: 'Clean, systematic reveals for technical content',
    config: {
      slide: createSlideMotionConfig({
        variant: 'zoom',
        duration: 400,
        easing: [0.25, 0.46, 0.45, 0.94]
      }),
      content: createContentMotionConfig({
        variant: 'fadeIn',
        staggerChildren: 80,
        delayChildren: 150,
        duration: 500
      }),
      elements: {
        'code-block': createElementMotionConfig('code-block', 'content', {
          variant: 'slideDown',
          duration: 600,
          delay: 200,
          easing: 'ease-out'
        }),
        'api-endpoint': createElementMotionConfig('api-endpoint', 'item', {
          variant: 'fadeIn',
          duration: 400,
          delay: 500,
          easing: 'ease-out'
        }),
        'diagram': createElementMotionConfig('diagram', 'content', {
          variant: 'scaleIn',
          duration: 700,
          delay: 800,
          easing: [0.25, 0.46, 0.45, 0.94]
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'zoom',
        defaultContentVariant: 'fadeIn',
        enableTimeline: true,
        autoPlay: false
      })
    },
    presets: []
  }
]

// Minimal Presentation Templates
export const minimalTemplates: MotionTemplate[] = [
  {
    id: 'clean-simple',
    name: 'Clean & Simple',
    description: 'Minimal animations for elegant presentations',
    category: 'minimal',
    preview: 'Subtle fades and gentle transitions',
    config: {
      slide: createSlideMotionConfig({
        variant: 'fade',
        duration: 300,
        easing: 'ease-in-out'
      }),
      content: createContentMotionConfig({
        variant: 'fadeIn',
        staggerChildren: 50,
        delayChildren: 100,
        duration: 400
      }),
      elements: {
        'minimal-text': createElementMotionConfig('minimal-text', 'content', {
          variant: 'fadeIn',
          duration: 500,
          delay: 200,
          easing: 'ease-in-out'
        }),
        'simple-element': createElementMotionConfig('simple-element', 'item', {
          variant: 'fadeIn',
          duration: 300,
          delay: 400,
          easing: 'ease-in-out'
        })
      },
      global: createGlobalMotionConfig({
        defaultSlideVariant: 'fade',
        defaultContentVariant: 'fadeIn',
        defaultItemVariant: 'fadeIn',
        enableTimeline: false,
        autoPlay: false
      })
    },
    presets: []
  }
]

// All templates combined
export const allMotionTemplates: MotionTemplate[] = [
  ...businessTemplates,
  ...creativeTemplates,
  ...educationalTemplates,
  ...technicalTemplates,
  ...minimalTemplates
]

// Template management functions
export function getTemplateById(id: string): MotionTemplate | undefined {
  return allMotionTemplates.find(template => template.id === id)
}

export function getTemplatesByCategory(category: MotionTemplate['category']): MotionTemplate[] {
  return allMotionTemplates.filter(template => template.category === category)
}

export function getTemplateCategories(): MotionTemplate['category'][] {
  return ['business', 'creative', 'educational', 'technical', 'minimal']
}

export function applyTemplate(template: MotionTemplate, targetConfig: MotionConfig): MotionConfig {
  return {
    ...targetConfig,
    slide: template.config.slide,
    content: template.config.content,
    elements: { ...template.config.elements },
    global: { ...targetConfig.global, ...template.config.global }
  }
}

// Template metadata for UI
export const templateMetadata = {
  business: {
    name: 'Business',
    description: 'Professional presentations for corporate environments',
    color: '#3b82f6',
    icon: 'briefcase'
  },
  creative: {
    name: 'Creative',
    description: 'Bold animations for creative and artistic presentations',
    color: '#8b5cf6',
    icon: 'palette'
  },
  educational: {
    name: 'Educational',
    description: 'Clear animations optimized for learning and teaching',
    color: '#10b981',
    icon: 'graduation-cap'
  },
  technical: {
    name: 'Technical',
    description: 'Precise animations for technical demonstrations',
    color: '#f59e0b',
    icon: 'code'
  },
  minimal: {
    name: 'Minimal',
    description: 'Subtle animations for clean, elegant presentations',
    color: '#6b7280',
    icon: 'circle'
  }
}
