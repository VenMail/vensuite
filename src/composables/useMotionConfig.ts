import { ref, computed, watch } from 'vue'
import type { MotionConfig, SlideMotionConfig, ContentMotionConfig, ElementMotionConfig, GlobalMotionConfig, MotionPreset } from '@/types/motion'
import { createSlideMotionConfig, createContentMotionConfig, createElementMotionConfig, createGlobalMotionConfig, MOTION_PRESETS } from '@/types/motion'

export function useMotionConfig(initialConfig?: Partial<MotionConfig>) {
  // Reactive motion configuration
  const config = ref<MotionConfig>({
    elements: {},
    global: createGlobalMotionConfig(),
    ...initialConfig
  })

  // Computed properties for easy access
  const slideConfig = computed(() => config.value.slide ?? createSlideMotionConfig())
  const contentConfig = computed(() => config.value.content ?? createContentMotionConfig())
  const globalConfig = computed(() => config.value.global ?? createGlobalMotionConfig())
  const elements = computed(() => config.value.elements)

  // Helper functions
  function updateSlideConfig(newConfig: Partial<SlideMotionConfig>) {
    config.value.slide = { ...slideConfig.value, ...newConfig }
  }

  function updateContentConfig(newConfig: Partial<ContentMotionConfig>) {
    config.value.content = { ...contentConfig.value, ...newConfig }
  }

  function updateGlobalConfig(newConfig: Partial<GlobalMotionConfig>) {
    config.value.global = { ...globalConfig.value, ...newConfig }
  }

  function upsertElementConfig(elementId: string, newConfig: Partial<ElementMotionConfig>) {
    const existing = config.value.elements[elementId]
    if (existing) {
      config.value.elements[elementId] = { ...existing, ...newConfig }
    } else {
      config.value.elements[elementId] = createElementMotionConfig(elementId, 'item', newConfig)
    }
  }

  function removeElementConfig(elementId: string) {
    delete config.value.elements[elementId]
  }

  function getElementConfig(elementId: string): ElementMotionConfig | undefined {
    return config.value.elements[elementId]
  }

  function hasElementConfig(elementId: string): boolean {
    return elementId in config.value.elements
  }

  // Preset management
  function applyPreset(preset: MotionPreset, targetId?: string) {
    switch (preset.category) {
      case 'slide':
        updateSlideConfig(preset.config as SlideMotionConfig)
        break
      case 'content':
        updateContentConfig(preset.config as ContentMotionConfig)
        break
      case 'item':
      case 'progress':
        if (targetId) {
          upsertElementConfig(targetId, preset.config as ElementMotionConfig)
        }
        break
    }
  }

  function getPresetsByCategory(category: MotionPreset['category']): MotionPreset[] {
    return MOTION_PRESETS.filter(preset => preset.category === category)
  }

  function getPresetByName(name: string): MotionPreset | undefined {
    return MOTION_PRESETS.find(preset => preset.name === name)
  }

  // Serialization for persistence
  function serialize(): string {
    return JSON.stringify(config.value, null, 2)
  }

  function deserialize(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString)
      config.value = { ...config.value, ...parsed }
      return true
    } catch (error) {
      console.error('Failed to deserialize motion config:', error)
      return false
    }
  }

  // Export to frontmatter format
  function toFrontmatter(): Record<string, any> {
    const frontmatter: Record<string, any> = {}

    if (config.value.slide) {
      frontmatter.motion = {
        slide: config.value.slide
      }
    }

    if (config.value.content) {
      frontmatter.motion = {
        ...frontmatter.motion,
        content: config.value.content
      }
    }

    if (Object.keys(config.value.elements).length > 0) {
      frontmatter.motion = {
        ...frontmatter.motion,
        elements: config.value.elements
      }
    }

    if (config.value.global) {
      frontmatter.motion = {
        ...frontmatter.motion,
        global: config.value.global
      }
    }

    return frontmatter
  }

  // Import from frontmatter format
  function fromFrontmatter(frontmatter: Record<string, any>): void {
    if (frontmatter.motion) {
      const motion = frontmatter.motion

      if (motion.slide) {
        config.value.slide = motion.slide
      }

      if (motion.content) {
        config.value.content = motion.content
      }

      if (motion.elements) {
        config.value.elements = motion.elements
      }

      if (motion.global) {
        config.value.global = { ...globalConfig.value, ...motion.global }
      }
    }
  }

  // CSS animation compatibility (for legacy support)
  function convertToCSSAnimation(elementId: string): any | null {
    const elementConfig = getElementConfig(elementId)
    if (!elementConfig?.cssAnimation?.enabled) return null

    return {
      enabled: elementConfig.cssAnimation.enabled,
      type: elementConfig.cssAnimation.type,
      duration: elementConfig.cssAnimation.duration,
      delay: elementConfig.cssAnimation.delay,
      easing: elementConfig.cssAnimation.easing,
      trigger: elementConfig.cssAnimation.trigger,
      repeat: elementConfig.cssAnimation.repeat,
      repeatCount: elementConfig.cssAnimation.repeatCount
    }
  }

  function updateFromCSSAnimation(elementId: string, cssAnimation: any): void {
    upsertElementConfig(elementId, {
      cssAnimation: {
        enabled: cssAnimation.enabled ?? false,
        type: cssAnimation.type ?? 'fadeIn',
        duration: cssAnimation.duration ?? 1000,
        delay: cssAnimation.delay ?? 0,
        easing: cssAnimation.easing ?? 'ease-in-out',
        trigger: cssAnimation.trigger ?? 'onLoad',
        repeat: cssAnimation.repeat ?? false,
        repeatCount: cssAnimation.repeatCount ?? 1
      }
    })
  }

  // Validation and cleanup
  function validate(): boolean {
    // Basic validation
    if (!config.value.elements || typeof config.value.elements !== 'object') {
      return false
    }

    // Validate each element config
    for (const [elementId, elementConfig] of Object.entries(config.value.elements)) {
      if (!elementConfig.id || elementConfig.id !== elementId) {
        return false
      }

      if (!['item', 'content', 'progress'].includes(elementConfig.type)) {
        return false
      }

      if (!elementConfig.variant) {
        return false
      }
    }

    return true
  }

  function cleanup(): void {
    // Remove invalid element configs
    const validElements: Record<string, ElementMotionConfig> = {}
    
    for (const [elementId, elementConfig] of Object.entries(config.value.elements)) {
      if (elementConfig && elementConfig.id === elementId && ['item', 'content', 'progress'].includes(elementConfig.type)) {
        validElements[elementId] = elementConfig
      }
    }

    config.value.elements = validElements
  }

  // Watch for changes and auto-cleanup
  watch(() => config.value.elements, () => {
    if (!validate()) {
      cleanup()
    }
  }, { deep: true })

  return {
    // State
    config,
    slideConfig,
    contentConfig,
    globalConfig,
    elements,

    // Update methods
    updateSlideConfig,
    updateContentConfig,
    updateGlobalConfig,
    upsertElementConfig,
    removeElementConfig,

    // Query methods
    getElementConfig,
    hasElementConfig,

    // Preset methods
    applyPreset,
    getPresetsByCategory,
    getPresetByName,

    // Serialization
    serialize,
    deserialize,
    toFrontmatter,
    fromFrontmatter,

    // CSS compatibility
    convertToCSSAnimation,
    updateFromCSSAnimation,

    // Validation
    validate,
    cleanup
  }
}
