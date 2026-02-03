<template>
  <div 
    class="animated-icon inline-flex items-center justify-center"
    :class="iconClass"
    :style="iconStyle"
  >
    <component :is="iconComponent" v-if="iconComponent" />
    <div v-else-if="icon" class="icon-wrapper" :style="iconWrapperStyle">
      {{ icon }}
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon?: string
  animation?: 'pulse' | 'bounce' | 'rotate' | 'scale' | 'shake' | 'float' | 'none'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  color?: string
  duration?: number
  delay?: number
  repeat?: 'infinite' | number
}>(), {
  animation: 'none',
  size: 'md',
  duration: 1000,
  delay: 0,
  repeat: 'infinite'
})

const iconClass = computed(() => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    rotate: 'animate-spin',
    scale: 'animate-scale',
    shake: 'animate-shake',
    float: 'animate-float',
    none: ''
  }
  
  return [
    sizeClasses[props.size],
    animationClasses[props.animation]
  ].filter(Boolean).join(' ')
})

const iconStyle = computed(() => {
  const style: Record<string, string> = {}
  
  if (props.color) {
    style.color = props.color
  }
  
  if (props.animation !== 'none') {
    style.animationDuration = `${props.duration}ms`
    style.animationDelay = `${props.delay}ms`
    
    if (props.repeat !== 'infinite') {
      style.animationIterationCount = String(props.repeat)
    }
  }
  
  return style
})

const iconWrapperStyle = computed(() => {
  const style: Record<string, string> = {}
  
  if (props.color) {
    style.color = props.color
  }
  
  return style
})

const iconComponent = computed(() => {
  // Could be extended to support icon libraries
  return null
})
</script>

<style scoped>
.animated-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-wrapper {
  font-size: inherit;
  line-height: 1;
}

@keyframes scale {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-scale {
  animation: scale 2s ease-in-out infinite;
}

.animate-shake {
  animation: shake 0.5s ease-in-out infinite;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
