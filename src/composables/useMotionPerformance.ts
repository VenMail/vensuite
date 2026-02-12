/**
 * Motion Performance and Accessibility Composable
 * Handles performance optimizations and prefers-reduced-motion support
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface MotionPerformanceConfig {
  // Performance settings
  enableGPUAcceleration: boolean
  enableWillChange: boolean
  maxConcurrentAnimations: number
  animationFrameBudget: number // ms per frame
  
  // Accessibility settings
  respectPrefersReducedMotion: boolean
  reducedMotionVariants: Record<string, string>
  
  // Fallback settings
  enableCSSFallbacks: boolean
  enableJavaScriptFallbacks: boolean
  
  // Debug settings
  enablePerformanceMonitoring: boolean
  logPerformanceMetrics: boolean
}

export interface PerformanceMetrics {
  frameRate: number
  animationDuration: number
  layoutShifts: number
  paintTime: number
  memoryUsage: number
  activeAnimations: number
}

export function useMotionPerformance(initialConfig?: Partial<MotionPerformanceConfig>) {
  // Reactive state
  const isEnabled = ref(true)
  const isReducedMotion = ref(false)
  const isLowPerformanceDevice = ref(false)
  const performanceMetrics = ref<PerformanceMetrics>({
    frameRate: 60,
    animationDuration: 0,
    layoutShifts: 0,
    paintTime: 0,
    memoryUsage: 0,
    activeAnimations: 0
  })
  
  const activeAnimations = ref(new Set<string>())
  const animationQueue = ref<Array<{ id: string; callback: () => void; priority: number }>>([])
  
  // Configuration
  const config = ref<MotionPerformanceConfig>({
    enableGPUAcceleration: true,
    enableWillChange: true,
    maxConcurrentAnimations: 10,
    animationFrameBudget: 16.67, // 60fps
    respectPrefersReducedMotion: true,
    reducedMotionVariants: {
      'venmail3d': 'fade',
      'slideLeft': 'fade',
      'slideRight': 'fade',
      'slideUp': 'fade',
      'slideDown': 'fade',
      'zoom': 'fade',
      'rotateIn': 'fade',
      'flipIn': 'fade',
      'bounceIn': 'fade',
      'scaleIn': 'fade'
    },
    enableCSSFallbacks: true,
    enableJavaScriptFallbacks: true,
    enablePerformanceMonitoring: true,
    logPerformanceMetrics: false,
    ...initialConfig
  })
  
  // Computed properties
  const shouldOptimize = computed(() => {
    return isLowPerformanceDevice.value || activeAnimations.value.size > config.value.maxConcurrentAnimations
  })
  
  const effectiveVariants = computed(() => {
    if (isReducedMotion.value && config.value.respectPrefersReducedMotion) {
      return config.value.reducedMotionVariants
    }
    return {}
  })
  
  // Performance monitoring
  let frameCount = 0
  let lastFrameTime = performance.now()
  let animationFrameId: number | null = null
  
  function startPerformanceMonitoring() {
    if (!config.value.enablePerformanceMonitoring) return
    
    function measurePerformance() {
      const now = performance.now()
      const deltaTime = now - lastFrameTime
      
      frameCount++
      
      // Calculate FPS every second
      if (frameCount % 60 === 0) {
        const fps = 1000 / deltaTime
        performanceMetrics.value.frameRate = fps
        
        // Detect low performance
        if (fps < 30) {
          isLowPerformanceDevice.value = true
        } else if (fps > 50) {
          isLowPerformanceDevice.value = false
        }
        
        if (config.value.logPerformanceMetrics) {
          console.log('Motion Performance Metrics:', {
            fps,
            activeAnimations: activeAnimations.value.size,
            isLowPerformance: isLowPerformanceDevice.value
          })
        }
      }
      
      lastFrameTime = now
      animationFrameId = requestAnimationFrame(measurePerformance)
    }
    
    animationFrameId = requestAnimationFrame(measurePerformance)
  }
  
  function stopPerformanceMonitoring() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
  
  // Animation management
  function registerAnimation(id: string, priority: number = 0): boolean {
    if (!isEnabled.value) return false
    
    // Check if we should queue the animation
    if (shouldOptimize.value && activeAnimations.value.size >= config.value.maxConcurrentAnimations) {
      animationQueue.value.push({ id, callback: () => {}, priority })
      animationQueue.value.sort((a, b) => b.priority - a.priority)
      return false
    }
    
    activeAnimations.value.add(id)
    performanceMetrics.value.activeAnimations = activeAnimations.value.size
    
    return true
  }
  
  function unregisterAnimation(id: string) {
    activeAnimations.value.delete(id)
    performanceMetrics.value.activeAnimations = activeAnimations.value.size
    
    // Process queued animations
    if (animationQueue.value.length > 0 && !shouldOptimize.value) {
      const next = animationQueue.value.shift()
      if (next) {
        registerAnimation(next.id, next.priority)
        next.callback()
      }
    }
  }
  
  function optimizeAnimation(element: HTMLElement, variant: string): string {
    // Apply reduced motion variant if needed
    if (isReducedMotion.value && config.value.respectPrefersReducedMotion) {
      const reducedVariant = config.value.reducedMotionVariants[variant]
      if (reducedVariant) {
        return reducedVariant
      }
    }
    
    // Apply performance optimizations
    if (shouldOptimize.value) {
      // Disable complex animations on low-end devices
      if (isLowPerformanceDevice.value) {
        const complexVariants = ['venmail3d', 'rotateIn', 'flipIn', 'bounceIn']
        if (complexVariants.includes(variant)) {
          return 'fade'
        }
      }
      
      // Reduce animation duration
      if (element.style.transitionDuration) {
        const currentDuration = parseFloat(element.style.transitionDuration)
        if (currentDuration > 500) {
          element.style.transitionDuration = '300ms'
        }
      }
    }
    
    return variant
  }
  
  function applyPerformanceOptimizations(element: HTMLElement) {
    // GPU acceleration
    if (config.value.enableGPUAcceleration) {
      element.style.transform = element.style.transform || 'translateZ(0)'
      element.style.backfaceVisibility = 'hidden'
      element.style.perspective = '1000px'
    }
    
    // Will-change hint
    if (config.value.enableWillChange) {
      element.style.willChange = 'transform, opacity'
      
      // Remove will-change after animation
      setTimeout(() => {
        element.style.willChange = 'auto'
      }, 1000)
    }
    
    // Performance monitoring
    if (config.value.enablePerformanceMonitoring) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            performanceMetrics.value.layoutShifts += (entry as PerformanceEntry).duration
          } else if (entry.entryType === 'paint') {
            performanceMetrics.value.paintTime = (entry as PerformanceEntry).startTime
          }
        }
      })
      
      observer.observe({ entryTypes: ['layout-shift', 'paint'] })
    }
  }
  
  function removePerformanceOptimizations(element: HTMLElement) {
    // Clean up GPU acceleration hints
    if (!config.value.enableGPUAcceleration) {
      element.style.transform = element.style.transform.replace(/translateZ\(0\)/, '').trim()
      element.style.backfaceVisibility = ''
      element.style.perspective = ''
    }
    
    // Clean up will-change
    element.style.willChange = 'auto'
  }
  
  // Accessibility helpers
  function checkReducedMotionPreference() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      isReducedMotion.value = mediaQuery.matches
      
      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        isReducedMotion.value = e.matches
      })
    }
  }
  
  function createReducedMotionStylesheet(): string {
    return `
      @media (prefers-reduced-motion: reduce) {
        .venmail-motion-slide,
        .venmail-motion-content,
        .venmail-motion-item {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        
        .venmail-motion-slide[data-motion-variant="venmail3d"],
        .venmail-motion-slide[data-motion-variant="rotateIn"],
        .venmail-motion-slide[data-motion-variant="flipIn"],
        .venmail-motion-slide[data-motion-variant="bounceIn"] {
          transform: none !important;
        }
      }
    `
  }
  
  function injectReducedMotionStyles() {
    if (typeof document !== 'undefined' && config.value.respectPrefersReducedMotion) {
      const styleId = 'venmail-reduced-motion-styles'
      let styleElement = document.getElementById(styleId) as HTMLStyleElement
      
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        styleElement.textContent = createReducedMotionStylesheet()
        document.head.appendChild(styleElement)
      }
    }
  }
  
  function removeReducedMotionStyles() {
    if (typeof document !== 'undefined') {
      const styleElement = document.getElementById('venmail-reduced-motion-styles')
      if (styleElement) {
        styleElement.remove()
      }
    }
  }
  
  // Memory management
  function checkMemoryUsage() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      performanceMetrics.value.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      
      // Disable animations if memory usage is too high
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        isLowPerformanceDevice.value = true
      }
    }
  }
  
  function optimizeMemoryUsage() {
    // Clean up completed animations
    activeAnimations.value.forEach(id => {
      const element = document.querySelector(`[data-motion-id="${id}"]`)
      if (element && !element.getAttribute('data-motion-active')) {
        unregisterAnimation(id)
      }
    })
    
    // Limit animation queue size
    if (animationQueue.value.length > 50) {
      animationQueue.value = animationQueue.value.slice(-20)
    }
  }
  
  // Public API
  function enable() {
    isEnabled.value = true
    startPerformanceMonitoring()
    injectReducedMotionStyles()
  }
  
  function disable() {
    isEnabled.value = false
    stopPerformanceMonitoring()
    removeReducedMotionStyles()
    
    // Clear all active animations
    activeAnimations.value.clear()
    animationQueue.value = []
  }
  
  function updateConfig(newConfig: Partial<MotionPerformanceConfig>) {
    config.value = { ...config.value, ...newConfig }
    
    // Re-inject styles if needed
    if (newConfig.respectPrefersReducedMotion !== undefined) {
      removeReducedMotionStyles()
      if (newConfig.respectPrefersReducedMotion) {
        injectReducedMotionStyles()
      }
    }
  }
  
  function getOptimizedVariant(originalVariant: string): string {
    return effectiveVariants.value[originalVariant] || originalVariant
  }
  
  function shouldAnimate(_element: HTMLElement): boolean {
    if (!isEnabled.value) return false
    if (isReducedMotion.value && config.value.respectPrefersReducedMotion) return false
    if (isLowPerformanceDevice.value && activeAnimations.value.size > config.value.maxConcurrentAnimations) return false
    
    return true
  }
  
  // Lifecycle
  onMounted(() => {
    checkReducedMotionPreference()
    checkMemoryUsage()
    startPerformanceMonitoring()
    injectReducedMotionStyles()
    
    // Periodic memory check
    const memoryCheckInterval = setInterval(() => {
      checkMemoryUsage()
      optimizeMemoryUsage()
    }, 10000) // Every 10 seconds
    
    onUnmounted(() => {
      clearInterval(memoryCheckInterval)
    })
  })
  
  onUnmounted(() => {
    stopPerformanceMonitoring()
    removeReducedMotionStyles()
    disable()
  })
  
  return {
    // State
    isEnabled,
    isReducedMotion,
    isLowPerformanceDevice,
    performanceMetrics,
    activeAnimations: computed(() => Array.from(activeAnimations.value)),
    config,
    
    // Methods
    enable,
    disable,
    updateConfig,
    registerAnimation,
    unregisterAnimation,
    optimizeAnimation,
    applyPerformanceOptimizations,
    removePerformanceOptimizations,
    getOptimizedVariant,
    shouldAnimate,
    
    // Monitoring
    checkMemoryUsage,
    optimizeMemoryUsage
  }
}
