/**
 * Intersection Observer Directive
 * Provides lazy loading functionality for elements
 */

import type { Directive, DirectiveBinding } from 'vue'

export const vIntersection: Directive<HTMLElement, () => void> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<() => void>) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            binding.value()
            observer.unobserve(el)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )
    
    observer.observe(el)
    
    // Store observer for cleanup
    ;(el as any)._intersectionObserver = observer
  },
  
  unmounted(el: HTMLElement) {
    const observer = (el as any)._intersectionObserver
    if (observer) {
      observer.disconnect()
    }
  }
}
