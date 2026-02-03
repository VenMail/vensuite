<script setup lang="ts">
import { computed, provide, onMounted, ref, watch } from 'vue'
import { useVenmailMotion, type ContentVariant } from '@/composables/useVenmailMotion'
import { VenmailStaggerContext, defaultStaggerConfig } from './context'

const props = withDefaults(defineProps<{
  variant?: string
  state?: keyof ContentVariant
  tag?: string
  class?: string
  trigger?: 'immediate' | 'on-click' | 'on-hover' | 'on-scroll' | 'on-load'
  stagger?: number
  delay?: number
  easing?: string | number[]
  duration?: number
}>(), {
  variant: 'default',
  state: 'visible',
  tag: 'div',
  trigger: 'immediate',
  stagger: 0,
  delay: 0,
  easing: undefined,
  duration: undefined
})

const { contentVariants, resolveVariantStyle } = useVenmailMotion()
const contentElement = ref<HTMLElement>()
const currentState = ref(props.state)
const hasTriggered = ref(false)

// Resolve variant from data attributes if present
const resolvedVariant = computed(() => {
  if (contentElement.value) {
    const dataVariant = contentElement.value.getAttribute('data-motion-variant')
    if (dataVariant) return dataVariant
  }
  return props.variant
})

const activeVariant = computed(() => contentVariants[resolvedVariant.value] ?? contentVariants.default)
const variantState = computed(() => activeVariant.value[currentState.value])

const motionStyle = computed(() => {
  const baseStyle = resolveVariantStyle(variantState.value, props.delay)
  
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
  
  // Add stagger delay if specified
  if (props.stagger > 0 && currentState.value === 'visible') {
    baseStyle.transitionDelay = `${props.stagger}ms`
  }
  
  return baseStyle
})

const staggerConfig = computed(() => {
  if (currentState.value !== 'visible') return defaultStaggerConfig
  const transition = activeVariant.value.visible.transition
  return {
    delayChildren: transition?.delayChildren ?? 0,
    staggerChildren: transition?.staggerChildren ?? 0
  }
})

// Handle different trigger types
const executeTrigger = () => {
  if (hasTriggered.value && props.trigger !== 'on-hover') return
  
  currentState.value = 'visible'
  hasTriggered.value = true
  
  // Update data attribute for CSS animations
  if (contentElement.value) {
    contentElement.value.setAttribute('data-motion-state', 'visible')
    contentElement.value.setAttribute('data-motion-triggered', 'true')
  }
}

// Setup trigger handlers
onMounted(() => {
  if (!contentElement.value) return
  
  switch (props.trigger) {
    case 'on-load':
      // Use requestAnimationFrame for smooth load animation
      requestAnimationFrame(() => {
        setTimeout(executeTrigger, props.delay)
      })
      break
      
    case 'on-click':
      contentElement.value.addEventListener('click', executeTrigger, { once: true })
      break
      
    case 'on-hover':
      contentElement.value.addEventListener('mouseenter', executeTrigger)
      contentElement.value.addEventListener('mouseleave', () => {
        currentState.value = 'hidden'
        hasTriggered.value = false
        if (contentElement.value) {
          contentElement.value.setAttribute('data-motion-state', 'hidden')
          contentElement.value.removeAttribute('data-motion-triggered')
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
      observer.observe(contentElement.value)
      break
      
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

provide(VenmailStaggerContext, staggerConfig)
</script>

<template>
  <component
    :is="tag"
    ref="contentElement"
    class="venmail-motion-content"
    :class="props.class"
    :style="motionStyle"
    data-motion-role="content"
    :data-motion-variant="resolvedVariant"
    :data-motion-state="currentState"
    :data-motion-trigger="props.trigger"
    :data-motion-stagger="props.stagger"
    :data-motion-delay="props.delay"
    :data-motion-duration="props.duration"
    :data-motion-easing="props.easing"
  >
    <slot />
  </component>
</template>

<style scoped>
.venmail-motion-content {
  will-change: transform, opacity;
}
</style>
