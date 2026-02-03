<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useVenmailMotion, type ProgressVariant } from '@/composables/useVenmailMotion'

const props = withDefaults(defineProps<{
  variant?: string
  state?: keyof ProgressVariant
  tag?: string
  class?: string
  trigger?: string
  delay?: number
}>(), {
  variant: 'default',
  state: 'visible',
  tag: 'div',
  trigger: 'immediate',
  delay: 0
})

const { progressVariants, resolveVariantStyle } = useVenmailMotion()
const progressElement = ref<HTMLElement>()

// Resolve variant from data attributes if present
const resolvedVariant = computed(() => {
  if (progressElement.value) {
    const dataVariant = progressElement.value.getAttribute('data-motion-variant')
    if (dataVariant) return dataVariant
  }
  return props.variant
})

const activeVariant = computed(() => progressVariants[resolvedVariant.value] ?? progressVariants.default)
const variantState = computed(() => activeVariant.value[props.state])

const motionStyle = computed(() => {
  const style = resolveVariantStyle(variantState.value)
  
  // Add delay if specified
  if (props.delay > 0 && props.state === 'visible') {
    style.transitionDelay = `${props.delay}ms`
  }
  
  return style
})

// Handle trigger-based animations
onMounted(() => {
  if (props.trigger === 'on-load' && progressElement.value) {
    // Trigger animation after load
    setTimeout(() => {
      progressElement.value?.setAttribute('data-motion-state', 'visible')
    }, props.delay)
  }
})
</script>

<template>
  <component
    :is="tag"
    ref="progressElement"
    class="venmail-motion-progress"
    :class="props.class"
    :style="motionStyle"
    data-motion-role="progress"
    :data-motion-variant="resolvedVariant"
    :data-motion-state="props.state"
    :data-motion-trigger="props.trigger"
    :data-motion-delay="props.delay"
  >
    <slot />
  </component>
</template>

<style scoped>
.venmail-motion-progress {
  will-change: transform, opacity, width;
}
</style>
