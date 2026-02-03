/**
 * Venmail Motion Addon for Slidev
 * Registers v-motion-* directives and provides motion utilities
 */

import type { Directive, App } from 'vue'

// Motion directive types
interface MotionDirectiveBinding {
  value?: string | Record<string, any>
  modifiers?: Record<string, boolean>
  arg?: string
}

interface MotionElement extends HTMLElement {
  _motionConfig?: Record<string, any>
  _motionObserver?: MutationObserver
}

// Motion variant registry
const motionVariants = new Map<string, Record<string, any>>()

// Register default variants
function registerDefaultVariants() {
  // Slide variants
  motionVariants.set('venmail3d', {
    enter: {
      opacity: 0,
      transform: 'translateX(-100%) rotateY(-90deg)',
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateX(0) rotateY(0deg)',
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateX(100%) rotateY(90deg)',
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out'
    }
  })

  motionVariants.set('slideLeft', {
    enter: {
      opacity: 0,
      transform: 'translateX(-100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateX(0)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateX(100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    }
  })

  motionVariants.set('slideRight', {
    enter: {
      opacity: 0,
      transform: 'translateX(100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateX(0)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateX(-100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    }
  })

  motionVariants.set('slideUp', {
    enter: {
      opacity: 0,
      transform: 'translateY(100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateY(0)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateY(-100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    }
  })

  motionVariants.set('slideDown', {
    enter: {
      opacity: 0,
      transform: 'translateY(-100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateY(0)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateY(100px)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
    }
  })

  motionVariants.set('fade', {
    enter: {
      opacity: 0,
      transition: 'opacity 0.4s ease-out'
    },
    center: {
      opacity: 1,
      transition: 'opacity 0.4s ease-out'
    },
    exit: {
      opacity: 0,
      transition: 'opacity 0.4s ease-out'
    }
  })

  motionVariants.set('zoom', {
    enter: {
      opacity: 0,
      transform: 'scale(0.8)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'scale(1)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'scale(1.2)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out'
    }
  })

  // Content variants
  motionVariants.set('default', {
    enter: {
      opacity: 0,
      transform: 'translateY(20px)',
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateY(0)',
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateY(-20px)',
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out'
    }
  })

  motionVariants.set('staggered', {
    enter: {
      opacity: 0,
      transform: 'translateY(30px)',
      transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateY(0)',
      transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateY(-30px)',
      transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out'
    }
  })

  // Item variants
  motionVariants.set('item', {
    enter: {
      opacity: 0,
      transform: 'translateX(-20px)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out'
    },
    center: {
      opacity: 1,
      transform: 'translateX(0)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out'
    },
    exit: {
      opacity: 0,
      transform: 'translateX(20px)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out'
    }
  })
}

// Apply motion styles to element
function applyMotionStyles(el: MotionElement, variant: string, state: string = 'center') {
  const motionVariant = motionVariants.get(variant)
  if (!motionVariant || !motionVariant[state]) return

  const styles = motionVariant[state]
  
  // Apply styles
  Object.entries(styles).forEach(([property, value]) => {
    if (property === 'transition') {
      el.style.transition = value as string
    } else {
      el.style.setProperty(property, value as string)
    }
  })

  // Store motion config for later use
  el._motionConfig = {
    variant,
    state,
    styles
  }
}

// Main motion directive
const vMotion: Directive<MotionElement, MotionDirectiveBinding> = {
  mounted(el, binding) {
    const variant = (typeof binding.value === 'string' ? binding.value : binding.arg) || 'default'
    const state = binding.modifiers?.enter ? 'enter' : 
                 binding.modifiers?.exit ? 'exit' : 'center'
    
    applyMotionStyles(el, variant, state)

    // Handle state changes via data attributes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-motion-state') {
          const newState = el.getAttribute('data-motion-state') || 'center'
          applyMotionStyles(el, variant, newState)
        }
      })
    })

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['data-motion-state']
    })

    el._motionObserver = observer
  },

  updated(el, binding) {
    const variant = (typeof binding.value === 'string' ? binding.value : binding.arg) || 'default'
    const state = binding.modifiers?.enter ? 'enter' : 
                 binding.modifiers?.exit ? 'exit' : 'center'
    
    applyMotionStyles(el, variant, state)
  },

  unmounted(el) {
    if (el._motionObserver) {
      el._motionObserver.disconnect()
    }
  }
}

// Role-specific directives
const vMotionSlide: Directive<MotionElement, MotionDirectiveBinding> = {
  mounted(el, binding) {
    const variant = (typeof binding.value === 'string' ? binding.value : 
                    (binding.value && typeof binding.value === 'object' && 'variant' in binding.value ? String(binding.value.variant) : undefined)) || 'venmail3d'
    applyMotionStyles(el, variant, 'center')
  }
}

const vMotionContent: Directive<MotionElement, MotionDirectiveBinding> = {
  mounted(el, binding) {
    const variant = (typeof binding.value === 'string' ? binding.value : 
                    (binding.value && typeof binding.value === 'object' && 'variant' in binding.value ? String(binding.value.variant) : undefined)) || 'default'
    applyMotionStyles(el, variant, 'center')
  }
}

const vMotionItem: Directive<MotionElement, MotionDirectiveBinding> = {
  mounted(el, binding) {
    const variant = (typeof binding.value === 'string' ? binding.value : 
                    (binding.value && typeof binding.value === 'object' && 'variant' in binding.value ? String(binding.value.variant) : undefined)) || 'item'
    applyMotionStyles(el, variant, 'center')
  }
}

// Stagger directive
const vMotionStagger: Directive<MotionElement, MotionDirectiveBinding> = {
  mounted(el, binding) {
    const delay = typeof binding.value === 'number' ? binding.value : 100
    const children = el.children
    
    Array.from(children).forEach((child, index) => {
      const childEl = child as MotionElement
      const staggerDelay = index * delay
      
      setTimeout(() => {
        applyMotionStyles(childEl, 'item', 'center')
      }, staggerDelay)
    })
  }
}

// Venmail motion addon
export const venmailMotionAddon = {
  install(app: App) {
    // Register default variants
    registerDefaultVariants()

    // Register directives
    app.directive('motion', vMotion)
    app.directive('motion-slide', vMotionSlide)
    app.directive('motion-content', vMotionContent)
    app.directive('motion-item', vMotionItem)
    app.directive('motion-stagger', vMotionStagger)

    // Provide motion utilities
    app.provide('motionVariants', motionVariants)
    app.provide('applyMotionStyles', applyMotionStyles)
  }
}

// Export utilities for external use
export { motionVariants, applyMotionStyles }
export type { MotionDirectiveBinding, MotionElement }

// Auto-install if used in browser
if (typeof window !== 'undefined' && (window as any).Vue) {
  venmailMotionAddon.install((window as any).Vue)
}
