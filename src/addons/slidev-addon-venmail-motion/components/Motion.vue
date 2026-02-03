<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface MotionProps {
  initial?: { x?: number; y?: number; opacity?: number; scale?: number; rotate?: number }
  enter?: { x?: number; y?: number; opacity?: number; scale?: number; rotate?: number; duration?: number; delay?: number }
  leave?: { x?: number; y?: number; opacity?: number; scale?: number; rotate?: number; duration?: number }
  tag?: string
}

const props = withDefaults(defineProps<MotionProps>(), {
  tag: 'div'
})

const isVisible = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isVisible.value = true
  })
})

const getInitialStyle = () => {
  return {
    transform: `translate(${props.initial?.x || 0}px, ${props.initial?.y || 0}px) scale(${props.initial?.scale ?? 1}) rotate(${props.initial?.rotate || 0}deg)`,
    opacity: props.initial?.opacity ?? 0,
    transition: 'none'
  }
}

const getEnterStyle = () => {
  const duration = props.enter?.duration ?? 600
  const delay = props.enter?.delay ?? 0
  return {
    transform: `translate(${props.enter?.x ?? 0}px, ${props.enter?.y ?? 0}px) scale(${props.enter?.scale ?? 1}) rotate(${props.enter?.rotate ?? 0}deg)`,
    opacity: props.enter?.opacity ?? 1,
    transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`
  }
}
</script>

<template>
  <component
    :is="tag"
    class="motion-wrapper"
    :style="isVisible ? getEnterStyle() : getInitialStyle()"
  >
    <slot />
  </component>
</template>

<style scoped>
.motion-wrapper {
  will-change: transform, opacity;
}
</style>
