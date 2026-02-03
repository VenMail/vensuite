<template>
  <div class="motion-list" :class="listClass">
    <div 
      v-for="(item, index) in items" 
      :key="index"
      class="motion-list-item"
      :class="itemClass"
      :style="getItemStyle(index)"
      :data-motion-id="`list-item-${index}`"
      data-motion-role="item"
      :data-motion-variant="itemVariant"
      :data-motion-delay="getItemDelay(index)"
    >
      <slot name="item" :item="item" :index="index">
        <div class="flex items-start gap-3">
          <div class="motion-list-marker" :class="markerClass">
            {{ marker }}
          </div>
          <div class="motion-list-content flex-1">
            {{ item }}
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  items: string[]
  marker?: string | number
  type?: 'bullet' | 'numbered' | 'check' | 'arrow' | 'custom'
  stagger?: number
  itemVariant?: string
  direction?: 'up' | 'down' | 'left' | 'right'
  class?: string
}>(), {
  marker: '•',
  type: 'bullet',
  stagger: 100,
  itemVariant: 'default',
  direction: 'up'
})

const listClass = computed(() => {
  const baseClass = 'space-y-3'
  return [baseClass, props.class].filter(Boolean).join(' ')
})

const itemClass = computed(() => {
  return 'motion-item'
})

const markerClass = computed(() => {
  const typeClasses = {
    bullet: 'text-venmail-primary',
    numbered: 'text-venmail-primary font-mono',
    check: 'text-green-500',
    arrow: 'text-venmail-primary',
    custom: ''
  }
  
  return [
    'flex-shrink-0 w-6 h-6 flex items-center justify-center',
    typeClasses[props.type]
  ].filter(Boolean).join(' ')
})

const getItemStyle = (index: number) => {
  const delay = index * props.stagger
  return {
    '--motion-delay': `${delay}ms`
  }
}

const getItemDelay = (index: number) => {
  return String(index * props.stagger)
}
</script>

<style scoped>
.motion-list {
  position: relative;
}

.motion-list-item {
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.6s ease-out forwards;
  animation-delay: var(--motion-delay);
}

.motion-list-marker {
  font-size: 1.2rem;
  line-height: 1.5;
}

.motion-list-content {
  line-height: 1.6;
}

@keyframes slideInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Direction variants */
.motion-list-item[data-motion-direction="down"] {
  transform: translateY(-20px);
  animation: slideInDown 0.6s ease-out forwards;
}

.motion-list-item[data-motion-direction="left"] {
  transform: translateX(20px);
  animation: slideInLeft 0.6s ease-out forwards;
}

.motion-list-item[data-motion-direction="right"] {
  transform: translateX(-20px);
  animation: slideInRight 0.6s ease-out forwards;
}

@keyframes slideInDown {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
