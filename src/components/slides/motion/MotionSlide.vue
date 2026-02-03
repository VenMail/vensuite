<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useVenmailMotion, type SlideVariant } from '@/composables/useVenmailMotion'

const props = withDefaults(defineProps<{
  variant?: string
  state?: keyof SlideVariant
  direction?: number
  tag?: string
  class?: string
  trigger?: 'immediate' | 'on-click' | 'on-hover' | 'on-scroll' | 'on-load' | 'delayed'
  delay?: number
  easing?: string | number[]
  duration?: number
}>(), {
  variant: 'venmail3d',
  state: 'center',
  direction: 1,
  tag: 'div',
  trigger: 'immediate',
  delay: 0,
  easing: undefined,
  duration: undefined
})

const { slideVariants, resolveSlideStyle } = useVenmailMotion()
const slideElement = ref<HTMLElement>()
const currentState = ref(props.state)
const hasTriggered = ref(false)

// Resolve variant from data attributes if present
const resolvedVariant = computed(() => {
  if (slideElement.value) {
    const dataVariant = slideElement.value.getAttribute('data-motion-variant')
    if (dataVariant) return dataVariant
  }
  return props.variant
})

const motionStyle = computed(() => {
  const variant = slideVariants[resolvedVariant.value] ?? slideVariants.venmail3d
  const baseStyle = resolveSlideStyle(variant, currentState.value, props.direction)
  
  // Override duration if specified
  if (props.duration && baseStyle.transition) {
    const transitionParts = baseStyle.transition.split(' ')
    transitionParts[1] = `${props.duration}ms`
    baseStyle.transition = transitionParts.join(' ')
  }
  
  // Override easing if specified
  if (props.easing && baseStyle.transition) {
    const transitionParts = baseStyle.transition.split(' ')
    const easingValue = Array.isArray(props.easing) 
      ? `cubic-bezier(${props.easing.join(', ')})` 
      : props.easing
    transitionParts[2] = easingValue
    baseStyle.transition = transitionParts.join(' ')
  }
  
  // Add trigger-based delay if needed
  if (props.trigger === 'delayed' && props.delay > 0) {
    baseStyle.transitionDelay = `${props.delay}ms`
  }
  
  return baseStyle
})

// Handle different trigger types
const executeTrigger = () => {
  if (hasTriggered.value && props.trigger !== 'on-hover') return
  
  currentState.value = 'center'
  hasTriggered.value = true
  
  // Update data attribute for CSS animations
  if (slideElement.value) {
    slideElement.value.setAttribute('data-motion-state', 'center')
    slideElement.value.setAttribute('data-motion-triggered', 'true')
  }
}

// Setup trigger handlers
onMounted(() => {
  if (!slideElement.value) return
  
  switch (props.trigger) {
    case 'on-load':
      // Use requestAnimationFrame for smooth load animation
      requestAnimationFrame(() => {
        setTimeout(executeTrigger, props.delay)
      })
      break
      
    case 'on-click':
      slideElement.value.addEventListener('click', executeTrigger, { once: true })
      break
      
    case 'on-hover':
      slideElement.value.addEventListener('mouseenter', executeTrigger)
      slideElement.value.addEventListener('mouseleave', () => {
        currentState.value = 'enter'
        hasTriggered.value = false
        if (slideElement.value) {
          slideElement.value.setAttribute('data-motion-state', 'enter')
          slideElement.value.removeAttribute('data-motion-triggered')
        }
      })
      break
      
    case 'on-scroll':
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasTriggered.value) {
              executeTrigger()
            }
          })
        },
        { threshold: 0.1 }
      )
      observer.observe(slideElement.value)
      break
      
    case 'delayed':
    case 'immediate':
    default:
      executeTrigger()
      break
  }
})

// Watch for manual state changes
watch(() => props.state, (newState) => {
  currentState.value = newState
})

// Watch for direction changes (for slide transitions)
watch(() => props.direction, () => {
  // Re-trigger animation with new direction
  if (currentState.value === 'center') {
    currentState.value = 'enter'
    setTimeout(() => {
      currentState.value = 'center'
    }, 50)
  }
})
</script>

<template>
  <component
    :is="tag"
    ref="slideElement"
    class="venmail-motion-slide"
    :class="props.class"
    :style="motionStyle"
    data-motion-role="slide"
    :data-motion-variant="resolvedVariant"
    :data-motion-state="currentState"
    :data-motion-trigger="props.trigger"
    :data-motion-delay="props.delay"
    :data-motion-duration="props.duration"
    :data-motion-easing="props.easing"
    :data-motion-direction="props.direction"
  >
    <slot />
  </component>
</template>

<style scoped>
.venmail-motion-slide {
  will-change: transform, opacity;
}
</style>
