<template>
  <div 
    class="gradient-background absolute inset-0 pointer-events-none"
    :class="gradientClass"
    :style="gradientStyle"
  >
    <div 
      v-if="animated"
      class="gradient-animation absolute inset-0"
      :style="animationStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type?: 'purple' | 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'custom'
  intensity?: 'light' | 'medium' | 'dark'
  animated?: boolean
  customGradient?: string
}>(), {
  type: 'purple',
  intensity: 'medium',
  animated: false
})

const gradientClass = computed(() => {
  const type = props.type
  const intensity = props.intensity
  
  const baseClasses: Record<string, string> = {
    purple: intensity === 'light' ? 'bg-gradient-purple-light' : 
               intensity === 'dark' ? 'bg-gradient-purple-dark' : 'bg-gradient-purple',
    emerald: intensity === 'light' ? 'bg-gradient-emerald-light' : 
               intensity === 'dark' ? 'bg-gradient-emerald-dark' : 'bg-gradient-emerald',
    blue: intensity === 'light' ? 'bg-gradient-blue-light' : 
            intensity === 'dark' ? 'bg-gradient-blue-dark' : 'bg-gradient-blue',
    amber: intensity === 'light' ? 'bg-gradient-amber-light' : 
            intensity === 'dark' ? 'bg-gradient-amber-dark' : 'bg-gradient-amber',
    rose: intensity === 'light' ? 'bg-gradient-rose-light' : 
           intensity === 'dark' ? 'bg-gradient-rose-dark' : 'bg-gradient-rose',
    slate: intensity === 'light' ? 'bg-gradient-slate-light' : 
            intensity === 'dark' ? 'bg-gradient-slate-dark' : 'bg-gradient-slate'
  }
  
  return baseClasses[type] || 'bg-gradient-purple'
})

const gradientStyle = computed(() => {
  if (props.customGradient) {
    return {
      background: props.customGradient
    }
  }
  return {}
})

const animationStyle = computed(() => {
  if (!props.animated) return {}
  
  return {
    animation: 'gradientShift 8s ease-in-out infinite',
    backgroundSize: '200% 200%'
  }
})
</script>

<style scoped>
.gradient-background {
  z-index: -1;
}

.bg-gradient-purple-light {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.1) 50%, rgba(76, 29, 149, 0.1) 100%);
}

.bg-gradient-purple {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(109, 40, 217, 0.2) 50%, rgba(76, 29, 149, 0.2) 100%);
}

.bg-gradient-purple-dark {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(109, 40, 217, 0.3) 50%, rgba(76, 29, 149, 0.3) 100%);
}

.bg-gradient-emerald-light {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 95, 70, 0.1) 50%, rgba(4, 120, 87, 0.1) 100%);
}

.bg-gradient-emerald {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 95, 70, 0.2) 50%, rgba(4, 120, 87, 0.2) 100%);
}

.bg-gradient-emerald-dark {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 95, 70, 0.3) 50%, rgba(4, 120, 87, 0.3) 100%);
}

.bg-gradient-blue-light {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(30, 64, 175, 0.1) 50%, rgba(37, 99, 235, 0.1) 100%);
}

.bg-gradient-blue {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(30, 64, 175, 0.2) 50%, rgba(37, 99, 235, 0.2) 100%);
}

.bg-gradient-blue-dark {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(30, 64, 175, 0.3) 50%, rgba(37, 99, 235, 0.3) 100%);
}

.bg-gradient-amber-light {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 50%, rgba(180, 83, 9, 0.1) 100%);
}

.bg-gradient-amber {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 50%, rgba(180, 83, 9, 0.2) 100%);
}

.bg-gradient-amber-dark {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.3) 50%, rgba(180, 83, 9, 0.3) 100%);
}

.bg-gradient-rose-light {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(190, 18, 60, 0.1) 50%, rgba(159, 18, 57, 0.1) 100%);
}

.bg-gradient-rose {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(190, 18, 60, 0.2) 50%, rgba(159, 18, 57, 0.2) 100%);
}

.bg-gradient-rose-dark {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.3) 0%, rgba(190, 18, 60, 0.3) 50%, rgba(159, 18, 57, 0.3) 100%);
}

.bg-gradient-slate-light {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.1) 0%, rgba(30, 41, 59, 0.1) 50%, rgba(30, 41, 59, 0.1) 100%);
}

.bg-gradient-slate {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(30, 41, 59, 0.2) 50%, rgba(30, 41, 59, 0.2) 100%);
}

.bg-gradient-slate-dark {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.3) 0%, rgba(30, 41, 59, 0.3) 50%, rgba(30, 41, 59, 0.3) 100%);
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
