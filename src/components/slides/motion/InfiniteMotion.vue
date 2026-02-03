<template>
  <component
    :is="tag"
    ref="motionElement"
    class="infinite-motion"
    :class="props.class"
    :style="motionStyle"
    :data-motion-variant="variant"
    :data-motion-infinite="true"
    :data-motion-duration="duration"
    :data-motion-delay="delay"
    :data-motion-easing="easing"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVenmailMotion } from '@/composables/useVenmailMotion'

const props = withDefaults(defineProps<{
  variant?: 'pulse' | 'rotate' | 'bounce' | 'float' | 'glow' | 'shake'
  tag?: string
  class?: string
  duration?: number
  delay?: number
  easing?: string
  paused?: boolean
}>(), {
  variant: 'pulse',
  tag: 'div',
  duration: 2000,
  delay: 0,
  easing: 'easeInOut',
  paused: false
})

const { infiniteVariants } = useVenmailMotion()
const motionElement = ref<HTMLElement>()

const motionStyle = computed(() => {
  const variant = infiniteVariants[props.variant]
  if (!variant) return {}

  const style: Record<string, any> = {}
  
  // Apply initial state
  Object.entries(variant.initial).forEach(([property, value]) => {
    style[property] = value
  })

  // Apply animation
  const animation = []
  const animateValues = Object.entries(variant.animate).map(([property, value]) => {
    if (Array.isArray(value)) {
      return `${property}: ${value.join(' ')}`
    }
    return `${property}: ${value}`
  }).join(', ')
  
  animation.push(animateValues)
  animation.push(`${props.duration}ms`)
  animation.push(props.easing)
  animation.push(`${props.delay}ms`)
  animation.push('infinite')
  
  style.animation = animation.join(' ')
  style.animationPlayState = props.paused ? 'paused' : 'running'
  style.animationFillMode = 'both'
  
  return style
})

// Handle pause/play
const play = () => {
  if (motionElement.value) {
    motionElement.value.style.animationPlayState = 'running'
  }
}

const pause = () => {
  if (motionElement.value) {
    motionElement.value.style.animationPlayState = 'paused'
  }
}

// Expose methods
defineExpose({
  play,
  pause
})
</script>

<style scoped>
.infinite-motion {
  will-change: transform, opacity;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  .infinite-motion {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
</style>
