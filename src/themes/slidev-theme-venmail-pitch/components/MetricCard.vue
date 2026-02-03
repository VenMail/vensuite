<template>
  <div 
    class="metric-card"
    :class="cardClass"
    :style="cardStyle"
    :data-motion-id="`metric-${id}`"
    data-motion-role="item"
    :data-motion-variant="variant"
  >
    <div class="metric-header" v-if="$slots.header || title">
      <div v-if="$slots.icon" class="metric-icon">
        <slot name="icon" />
      </div>
      <h3 v-if="title" class="metric-title">{{ title }}</h3>
      <slot name="header" />
    </div>
    
    <div class="metric-value" :class="valueClass">
      <span v-if="prefix" class="metric-prefix">{{ prefix }}</span>
      <span class="metric-number">{{ formattedValue }}</span>
      <span v-if="suffix" class="metric-suffix">{{ suffix }}</span>
    </div>
    
    <div v-if="$slots.content || description" class="metric-content">
      <p v-if="description" class="metric-description">{{ description }}</p>
      <slot name="content" />
    </div>
    
    <div v-if="trend" class="metric-trend" :class="trendClass">
      <span class="trend-icon">{{ trendIcon }}</span>
      <span class="trend-value">{{ trendValue }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  id?: string
  title?: string
  value: number | string
  prefix?: string
  suffix?: string
  description?: string
  variant?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string | number
  format?: 'number' | 'currency' | 'percentage' | 'custom'
  precision?: number
}>(), {
  id: () => `metric-${Math.random().toString(36).substr(2, 9)}`,
  variant: 'default',
  size: 'md',
  color: 'primary',
  format: 'number',
  precision: 0
})

const cardClass = computed(() => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const colorClasses = {
    primary: 'metric-card-primary',
    secondary: 'metric-card-secondary',
    success: 'metric-card-success',
    warning: 'metric-card-warning',
    error: 'metric-card-error'
  }
  
  return [
    'metric-card-base',
    sizeClasses[props.size],
    colorClasses[props.color]
  ].filter(Boolean).join(' ')
})

const cardStyle = computed(() => {
  return {}
})

const valueClass = computed(() => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  }
  
  return [
    'metric-value-base',
    sizeClasses[props.size]
  ].filter(Boolean).join(' ')
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') {
    return props.value
  }
  
  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: props.precision,
        maximumFractionDigits: props.precision
      }).format(props.value)
    
    case 'percentage':
      return `${props.value.toFixed(props.precision)}%`
    
    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: props.precision,
        maximumFractionDigits: props.precision
      }).format(props.value)
  }
})

const trendClass = computed(() => {
  const trendClasses: Record<string, string> = {
    up: 'trend-up',
    down: 'trend-down',
    neutral: 'trend-neutral'
  }
  
  return ['metric-trend-base', trendClasses[props.trend || 'neutral']].filter(Boolean).join(' ')
})

const trendIcon = computed(() => {
  const icons: Record<string, string> = {
    up: '↑',
    down: '↓',
    neutral: '→'
  }
  
  return icons[props.trend || 'neutral'] || ''
})
</script>

<style scoped>
.metric-card-base {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.metric-card-base:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.metric-card-primary {
  border-color: rgba(139, 92, 246, 0.5);
}

.metric-card-secondary {
  border-color: rgba(156, 163, 175, 0.5);
}

.metric-card-success {
  border-color: rgba(34, 197, 94, 0.5);
}

.metric-card-warning {
  border-color: rgba(245, 158, 11, 0.5);
}

.metric-card-error {
  border-color: rgba(239, 68, 68, 0.5);
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.metric-value-base {
  font-weight: bold;
  color: white;
  margin-bottom: 0.5rem;
}

.metric-prefix,
.metric-suffix {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.metric-number {
  color: white;
}

.metric-content {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
}

.metric-description {
  margin-bottom: 0;
}

.metric-trend-base {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.trend-up {
  color: rgb(74, 222, 128);
}

.trend-down {
  color: rgb(248, 113, 113);
}

.trend-neutral {
  color: rgb(156, 163, 175);
}

.trend-icon {
  font-weight: bold;
}
</style>
