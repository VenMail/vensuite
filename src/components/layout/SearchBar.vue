<script setup lang="ts">
import { Search, Filter, X, FileText, Image, FileSpreadsheet, Trash2 } from 'lucide-vue-next'
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  isMobile: boolean
}>()

const route = useRoute()
const searchValue = ref("")
const selectedFilters = ref<string[]>([])

// Context-aware placeholder based on current route
const placeholder = computed(() => {
  if (props.isMobile) return 'Search'
  
  const path = route.path
  if (path.includes('/docs')) return 'Search documents...'
  if (path.includes('/sheets')) return 'Search spreadsheets...'
  if (path.includes('/media')) return 'Search media files...'
  if (path.includes('/bin')) return 'Search trash...'
  return 'Search files...'
})

// Context-aware filter options based on current route
const availableFilters = computed(() => {
  const path = route.path
  
  if (path.includes('/docs')) {
    return [
      { value: 'docx', label: 'Word Documents', icon: FileText },
      { value: 'pdf', label: 'PDF Files', icon: FileText },
      { value: 'txt', label: 'Text Files', icon: FileText },
    ]
  }
  
  if (path.includes('/sheets')) {
    return [
      { value: 'xlsx', label: 'Excel Files', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV Files', icon: FileSpreadsheet },
      { value: 'ods', label: 'OpenDocument', icon: FileSpreadsheet },
    ]
  }
  
  if (path.includes('/media')) {
    return [
      { value: 'images', label: 'Images', icon: Image },
      { value: 'videos', label: 'Videos', icon: Image },
      { value: 'audio', label: 'Audio', icon: Image },
    ]
  }
  
  if (path.includes('/bin')) {
    return [
      { value: 'documents', label: 'Documents', icon: FileText },
      { value: 'spreadsheets', label: 'Spreadsheets', icon: FileSpreadsheet },
      { value: 'media', label: 'Media', icon: Image },
      { value: 'folders', label: 'Folders', icon: Trash2 },
    ]
  }
  
  // Default filters for home/all files
  return [
    { value: 'documents', label: 'Documents', icon: FileText },
    { value: 'spreadsheets', label: 'Spreadsheets', icon: FileSpreadsheet },
    { value: 'media', label: 'Media', icon: Image },
    { value: 'folders', label: 'Folders', icon: FileText },
  ]
})

const hasActiveFilters = computed(() => selectedFilters.value.length > 0)

function toggleFilter(filterValue: string) {
  const index = selectedFilters.value.indexOf(filterValue)
  if (index > -1) {
    selectedFilters.value.splice(index, 1)
  } else {
    selectedFilters.value.push(filterValue)
  }
  emitSearch()
}

function clearFilters() {
  selectedFilters.value = []
  emitSearch()
}

function clearSearch() {
  searchValue.value = ""
  emitSearch()
}

function emitSearch() {
  // Emit search event with query and filters
  window.dispatchEvent(new CustomEvent('global-search', {
    detail: {
      query: searchValue.value,
      filters: selectedFilters.value,
      context: route.path
    }
  }))
}

// Watch for search value changes
watch(searchValue, () => {
  emitSearch()
})

// Clear filters when route changes
watch(() => route.path, () => {
  selectedFilters.value = []
})
</script>

<template>
  <div class="flex items-center gap-2">
    <div :class="cn(
      'flex items-center rounded-full relative',
      props.isMobile ? 'px-2 py-2' : 'px-4 py-3',
      'bg-gray-100 dark:bg-gray-800',
      'focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400',
      'transition-all duration-200',
      props.isMobile ? 'ml-0 mr-1 w-full max-w-[180px]' : 'w-96'
    )">
      <Search :class="cn(
        'text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0',
        props.isMobile ? 'h-4 w-4' : 'h-5 w-5'
      )" />
      <input
        v-model="searchValue"
        type="text"
        :placeholder="placeholder"
        :class="cn(
          'flex-1 bg-transparent outline-none min-w-0',
          'text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-500 dark:placeholder:text-gray-400',
          props.isMobile ? 'text-sm' : 'text-base'
        )"
      />
      <X 
        v-if="searchValue"
        @click="clearSearch"
        :class="cn(
          'text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0',
          props.isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'
        )"
      />
      
      <DropdownMenu v-if="!props.isMobile">
        <DropdownMenuTrigger as-child>
          <div class="relative cursor-pointer">
            <Filter 
              :class="cn(
                'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0',
                hasActiveFilters && 'text-primary-600 dark:text-primary-400'
              )" 
            />
            <Badge 
              v-if="hasActiveFilters"
              variant="destructive"
              class="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {{ selectedFilters.length }}
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <div class="px-2 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Filter by Type
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="filter in availableFilters"
            :key="filter.value"
            @click="toggleFilter(filter.value)"
            class="cursor-pointer"
          >
            <component :is="filter.icon" class="h-4 w-4 mr-2" />
            <span class="flex-1">{{ filter.label }}</span>
            <div 
              v-if="selectedFilters.includes(filter.value)"
              class="h-2 w-2 rounded-full bg-primary-600"
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="hasActiveFilters" />
          <DropdownMenuItem 
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="cursor-pointer text-red-600 dark:text-red-400"
          >
            <X class="h-4 w-4 mr-2" />
            Clear Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>