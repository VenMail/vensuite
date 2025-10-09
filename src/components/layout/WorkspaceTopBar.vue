<template>
  <header class="px-4 sm:px-6 py-4 border-b transition-colors duration-200 bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800">
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div v-if="showNavigation" class="flex items-center gap-2">
          <button
            class="inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors shrink-0"
            :class="navigationButtonClass"
            :disabled="!canNavigateUp"
            aria-label="Up one level"
            title="Up one level"
            @click="$emit('navigate-up')"
          >
            <ArrowUp class="h-4 w-4 text-primary-600" />
          </button>

          <nav
            v-if="breadcrumbs?.length"
            aria-label="Breadcrumb"
            class="hidden sm:flex items-center text-sm"
          >
            <template v-for="(crumb, idx) in breadcrumbs.slice(0, -1)" :key="crumb.id ?? idx">
              <button
                class="text-primary-600 hover:underline"
                @click="$emit('navigate-breadcrumb', idx)"
              >
                {{ crumb.title }}
              </button>
              <span v-if="idx < breadcrumbs.slice(0, -1).length - 1" class="mx-2 text-gray-400">/</span>
            </template>
          </nav>
        </div>

        <div class="min-w-0">
          <h2 class="truncate text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {{ title }}
          </h2>
          <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 truncate">
            {{ subtitle }}
          </p>
        </div>

        <div v-if="actions?.length" class="flex items-center gap-2">
          <component
            v-for="action in actions"
            :is="action.component || Button"
            :key="action.key || action.label"
            v-bind="action.props"
            @click="emitAction(action)"
          >
            <slot
              v-if="action.slot"
              :name="`action-${action.slot}`"
              :action="action"
            />
            <template v-else>
              <component v-if="action.icon" :is="action.icon" class="h-4 w-4" />
              <span v-if="action.label">{{ action.label }}</span>
            </template>
          </component>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
        <slot name="stats">
          <div v-if="stats?.length" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <template v-for="(stat, index) in stats" :key="stat.label">
              <span>{{ stat.value }} {{ stat.label }}</span>
              <span v-if="index < stats.length - 1">•</span>
            </template>
          </div>
        </slot>

        <div v-if="filters?.length" class="flex items-center gap-2 flex-wrap">
          <Button
            v-for="filter in filters"
            :key="filter.key || filter.label"
            variant="outline"
            size="sm"
            :class="filter.active ? 'border-primary-500 text-primary-600' : ''"
            @click="$emit('filter-select', filter.value)"
          >
            <component v-if="filter.icon" :is="filter.icon" class="h-4 w-4 mr-2" />
            {{ filter.label }}
          </Button>
        </div>

        <div v-if="viewOptions?.length" class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <Button
            v-for="option in viewOptions"
            :key="option.value"
            variant="ghost"
            size="sm"
            :class="option.active ? 'bg-white dark:bg-gray-700 shadow-sm' : ''"
            @click="$emit('view-change', option.value)"
          >
            <component v-if="option.icon" :is="option.icon" class="h-4 w-4" />
            <span v-else>{{ option.label }}</span>
          </Button>
        </div>

        <slot name="extra" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface BreadcrumbItem {
  id?: string | null
  title: string
}

interface ActionItem {
  key?: string
  label?: string
  icon?: any
  component?: any
  props?: Record<string, unknown>
  onClick?: () => void
  slot?: string
}

interface StatItem {
  label: string
  value: string | number
}

interface FilterItem {
  key?: string
  label: string
  value: string
  icon?: any
  active?: boolean
}

interface ViewOption {
  label?: string
  value: string
  icon?: any
  active?: boolean
}

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  breadcrumbs: {
    type: Array as () => BreadcrumbItem[],
    default: () => []
  },
  canNavigateUp: {
    type: Boolean,
    default: false
  },
  showNavigation: {
    type: Boolean,
    default: true
  },
  actions: {
    type: Array as () => ActionItem[],
    default: () => []
  },
  stats: {
    type: Array as () => StatItem[],
    default: () => []
  },
  filters: {
    type: Array as () => FilterItem[],
    default: () => []
  },
  viewOptions: {
    type: Array as () => ViewOption[],
    default: () => []
  }
})

const emit = defineEmits(['navigate-up', 'navigate-breadcrumb', 'action', 'filter-select', 'view-change'])

const navigationButtonClass = computed(() => [
  'bg-white border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700',
  props.canNavigateUp ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
])

const emitAction = (action: ActionItem) => {
  if (action.onClick) {
    action.onClick()
  }
  emit('action', action)
}
</script>
