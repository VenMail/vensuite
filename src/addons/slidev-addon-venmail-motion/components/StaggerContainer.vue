<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface StaggerProps {
  delay?: number
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  tag?: string
}

const props = withDefaults(defineProps<StaggerProps>(), {
  delay: 300,
  staggerDelay: 100,
  direction: 'up',
  tag: 'div'
})

const isVisible = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isVisible.value = true
  })
})

const getTransform = (_index: number) => {
  const distance = 30
  switch (props.direction) {
    case 'up': return `translateY(${distance}px)`
    case 'down': return `translateY(-${distance}px)`
    case 'left': return `translateX(${distance}px)`
    case 'right': return `translateX(-${distance}px)`
  }
}

const getItemStyle = (index: number) => {
  const baseDelay = props.delay + (index * props.staggerDelay)
  return {
    opacity: isVisible.value ? 1 : 0,
    transform: isVisible.value ? 'none' : getTransform(index),
    transition: `all 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${baseDelay}ms`
  }
}
</script>

<template>
  <component :is="tag" class="stagger-container">
    <div
      v-for="(_, index) in $slots.default?.() || []"
      :key="index"
      class="stagger-item"
      :style="getItemStyle(index)"
    >
      <slot :name="`item-${index}`" />
    </div>
    <slot />
  </component>
</template>

<style scoped>
.stagger-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stagger-item {
  will-change: transform, opacity;
}
</style>
