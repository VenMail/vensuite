<template>
  <header class="px-3 sm:px-6 py-3 sm:py-4 border-b transition-colors duration-200 bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800">
    <!-- Mobile Header: Title + Actions -->
    <div class="flex items-center justify-between gap-3 sm:hidden mb-3">
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-lg font-semibold text-gray-800 dark:text-gray-100">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
          {{ subtitle }}
        </p>
      </div>
      
      <!-- Mobile Actions -->
      <div v-if="hasSelection && actions?.length" class="flex items-center gap-1 shrink-0">
        <!-- Selection Badge -->
        <div class="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-md text-xs font-medium border border-primary-200 dark:border-primary-700">
          {{ selectedCount }} selected
        </div>
        
        <!-- Primary Actions -->
        <component
          v-for="action in getVisibleActions().slice(0, 2)"
          :is="action.component || Button"
          :key="action.key || action.label"
          v-bind="action.props"
          size="sm"
          @click="emitAction(action)"
        >
          <component v-if="action.icon" :is="action.icon" class="h-4 w-4" />
          <span v-if="action.mobileLabel || action.label" class="hidden sm:inline">{{ action.mobileLabel || action.label }}</span>
        </component>
        
        <!-- More Actions Button -->
        <Button
          v-if="getVisibleActions().length > 2"
          variant="ghost"
          size="sm"
          class="relative"
          @click="showMobileActions = !showMobileActions"
        >
          <MoreHorizontal class="h-4 w-4" />
          <span v-if="showMobileActions" class="absolute -top-1 -right-1 h-2 w-2 bg-primary-500 rounded-full"></span>
        </Button>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <div v-if="showNavigation && breadcrumbs?.length" class="flex items-center gap-2 sm:hidden mb-3">
      <button
        class="inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors shrink-0"
        :class="navigationButtonClass"
        :disabled="!canNavigateUp"
        aria-label="Up one level"
        title="Up one level"
        @click="$emit('navigate-up')"
      >
        <ArrowUp class="h-3 w-3 text-primary-600" />
      </button>
      
      <!-- Mobile Breadcrumb -->
      <div class="flex items-center text-xs text-gray-600 dark:text-gray-400 min-w-0">
        <button
          class="text-primary-600 hover:underline truncate"
          @click="$emit('navigate-breadcrumb', breadcrumbs.length - 2)"
        >
          {{ breadcrumbs[breadcrumbs.length - 2]?.title }}
        </button>
        <span class="mx-1">/</span>
        <span class="truncate font-medium">{{ breadcrumbs[breadcrumbs.length - 1]?.title }}</span>
      </div>
    </div>

    <!-- Mobile Stats & Filters -->
    <div class="flex flex-col gap-3 sm:hidden">
      <!-- Mobile Stats -->
      <div v-if="stats?.length" class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <template v-for="(stat, index) in stats" :key="stat.label">
          <span class="font-medium">{{ stat.value }}</span>
          <span>{{ stat.label }}</span>
          <span v-if="index < stats.length - 1" class="text-gray-400">•</span>
        </template>
      </div>

      <!-- Mobile Filters -->
      <div v-if="filters?.length" class="flex items-center gap-1 overflow-x-auto pb-1">
        <Button
          v-for="filter in filters.slice(0, 3)"
          :key="filter.key || filter.label"
          variant="outline"
          size="sm"
          :class="filter.active ? 'border-primary-500 text-primary-600' : ''"
          @click="$emit('filter-select', filter.value)"
        >
          <component v-if="filter.icon" :is="filter.icon" class="h-3 w-3 mr-1" />
          {{ filter.label }}
        </Button>
        <Button
          v-if="filters.length > 3"
          variant="outline"
          size="sm"
          @click="showMobileFilters = !showMobileFilters"
        >
          +{{ filters.length - 3 }}
        </Button>
      </div>

      <!-- Mobile View Options -->
      <div v-if="viewOptions?.length" class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <Button
          v-for="option in viewOptions"
          :key="option.value"
          variant="ghost"
          size="sm"
          :class="option.active ? 'bg-white dark:bg-gray-700 shadow-sm' : ''"
          @click="$emit('view-change', option.value)"
        >
          <component v-if="option.icon" :is="option.icon" class="h-3 w-3" />
        </Button>
      </div>
    </div>

    <!-- Mobile Actions Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div v-if="showMobileActions && actions?.length" class="sm:hidden mt-2">
        <div class="relative">
          <!-- Dropdown Arrow -->
          <div class="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-50 dark:border-b-gray-800"></div>
          
          <!-- Dropdown Content -->
          <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <!-- Header -->
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">More Actions</span>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  @click="showMobileActions = false"
                >
                  <X class="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <!-- Action List -->
            <div class="max-h-64 overflow-y-auto">
              <div class="py-1">
                <component
                  v-for="action in getVisibleActions().slice(2)"
                  :is="action.component || Button"
                  :key="action.key || action.label"
                  v-bind="{...action.props, variant: 'ghost', size: 'sm'}"
                  class="w-full justify-start px-3 py-2 h-auto hover:bg-gray-50 dark:hover:bg-gray-800 rounded-none border-0 text-left"
                  @click="emitAction(action); showMobileActions = false"
                >
                  <div class="flex items-center w-full">
                    <component v-if="action.icon" :is="action.icon" class="h-4 w-4 mr-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <div class="flex-1 text-left">
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ action.mobileLabel || action.label }}</div>
                      <div v-if="action.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ action.description }}</div>
                    </div>
                  </div>
                </component>
              </div>
            </div>
            
            <!-- Footer -->
            <div v-if="getVisibleActions().length > 5" class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ getVisibleActions().length - 2 }} more actions available
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile Filters Dropdown -->
    <div v-if="showMobileFilters && filters?.length" class="sm:hidden mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="grid grid-cols-2 gap-2">
        <Button
          v-for="filter in filters.slice(3)"
          :key="filter.key || filter.label"
          variant="outline"
          size="sm"
          :class="filter.active ? 'border-primary-500 text-primary-600' : ''"
          @click="$emit('filter-select', filter.value); showMobileFilters = false"
        >
          <component v-if="filter.icon" :is="filter.icon" class="h-3 w-3 mr-1" />
          {{ filter.label }}
        </Button>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="hidden sm:flex flex-row items-center gap-4 w-full">
      <div class="flex flex-row items-center gap-4 flex-1 min-w-0">
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
            class="flex items-center text-sm"
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

        <div v-if="getVisibleActions().length" class="flex items-center gap-2 ml-auto">
          <component
            v-for="action in getVisibleActions()"
            :is="action.component || Button"
            :key="action.key || action.label"
            v-bind="action.props"
            @click="emitAction(action)"
            :class="{
              'ring-2 ring-primary-500': hasSelection && action.requiresSelection
            }"
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

      <div class="flex flex-row items-center gap-4">
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
import { computed, ref } from 'vue'
import { ArrowUp, MoreHorizontal, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface BreadcrumbItem {
  id?: string | null
  title: string
}

interface ActionItem {
  key?: string
  label?: string
  description?: string
  mobileLabel?: string
  icon?: any
  component?: any
  props?: Record<string, unknown>
  onClick?: () => void
  slot?: string
  requiresSelection?: boolean
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
  hasSelection: {
    type: Boolean,
    default: false
  },
  selectedCount: {
    type: Number,
    default: 0
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

// Mobile dropdown states
const showMobileActions = ref(false)
const showMobileFilters = ref(false)

// Computed property to filter actions based on selection state
const getVisibleActions = () => {
  if (!props.actions) return []
  
  // If no selection, only show actions that don't require selection
  if (!props.hasSelection) {
    return props.actions.filter(action => !action.requiresSelection)
  }
  
  // If has selection, show all actions
  return props.actions
}

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
