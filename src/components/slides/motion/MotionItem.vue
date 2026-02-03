<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useVenmailMotion, type ItemVariant } from '@/composables/useVenmailMotion'
import { VenmailStaggerContext, defaultStaggerConfig, type StaggerContextRef } from './context'

const props = withDefaults(defineProps<{
  variant?: string
  state?: keyof ItemVariant
  index?: number
  tag?: string
  class?: string
  trigger?: 'immediate' | 'on-click' | 'on-hover' | 'on-scroll' | 'on-load'
  delay?: number
  easing?: string | number[]
  duration?: number
  staggerRole?: string
}>(), {
  variant: 'default',
  state: 'visible',
  index: 0,
  tag: 'div',
  trigger: 'immediate',
  delay: 0,
  easing: undefined,
  duration: undefined,
  staggerRole: 'default'
})

const { itemVariants, resolveVariantStyle } = useVenmailMotion()
const staggerRef = inject<StaggerContextRef | null>(VenmailStaggerContext, null)
const itemElement = ref<HTMLElement>()
const currentState = ref(props.state)
const hasTriggered = ref(false)

// Resolve variant from data attributes if present
const resolvedVariant = computed(() => {
  if (itemElement.value) {
    const dataVariant = itemElement.value.getAttribute('data-motion-variant')
    if (dataVariant) return dataVariant
  }
  return props.variant
})

const activeVariant = computed(() => itemVariants[resolvedVariant.value] ?? itemVariants.default)
const variantState = computed(() => activeVariant.value[currentState.value])

const motionStyle = computed(() => {
  const stagger = staggerRef?.value ?? defaultStaggerConfig
  
  // Calculate stagger delay based on role and index
  let staggerDelay = 0
  if (props.staggerRole === 'leader' && props.index === 0) {
    // Leader items get no delay
    staggerDelay = stagger.delayChildren
  } else if (props.staggerRole === 'follower') {
    // Followers get extra delay
    staggerDelay = stagger.delayChildren + (props.index + 1) * stagger.staggerChildren
  } else {
    // Default stagger calculation
    staggerDelay = stagger.delayChildren + props.index * stagger.staggerChildren
  }
  
  const totalDelay = Math.max(props.delay, staggerDelay)
  
  const baseStyle = resolveVariantStyle(variantState.value, totalDelay)
  
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
  
  return baseStyle
})

// Handle different trigger types
const executeTrigger = () => {
  if (hasTriggered.value && props.trigger !== 'on-hover') return
  
  currentState.value = 'visible'
  hasTriggered.value = true
  
  // Update data attribute for CSS animations
  if (itemElement.value) {
    itemElement.value.setAttribute('data-motion-state', 'visible')
    itemElement.value.setAttribute('data-motion-triggered', 'true')
  }
}

// Setup trigger handlers
onMounted(() => {
  if (!itemElement.value) return
  
  switch (props.trigger) {
    case 'on-load':
      // Use requestAnimationFrame for smooth load animation
      requestAnimationFrame(() => {
        setTimeout(executeTrigger, props.delay)
      })
      break
      
    case 'on-click':
      itemElement.value.addEventListener('click', executeTrigger, { once: true })
      break
      
    case 'on-hover':
      itemElement.value.addEventListener('mouseenter', executeTrigger)
      itemElement.value.addEventListener('mouseleave', () => {
        currentState.value = 'hidden'
        hasTriggered.value = false
        if (itemElement.value) {
          itemElement.value.setAttribute('data-motion-state', 'hidden')
          itemElement.value.removeAttribute('data-motion-triggered')
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
      observer.observe(itemElement.value)
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
</script>

<template>
  <component
    :is="tag"
    ref="itemElement"
    class="venmail-motion-item"
    :class="props.class"
    :style="motionStyle"
    data-motion-role="item"
    :data-motion-variant="resolvedVariant"
    :data-motion-state="currentState"
    :data-motion-index="props.index"
    :data-motion-trigger="props.trigger"
    :data-motion-delay="props.delay"
    :data-motion-duration="props.duration"
    :data-motion-easing="props.easing"
    :data-motion-stagger-role="props.staggerRole"
  >
    <slot />
  </component>
</template>

<style scoped>
.venmail-motion-item {
  will-change: transform, opacity;
}
</style>
