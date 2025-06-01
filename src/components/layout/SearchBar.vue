<script setup lang="ts">
import { Search, Filter } from 'lucide-vue-next'
import { ref } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  isMobile: boolean
}>()

const searchValue = ref("")
</script>

<template>
  <div :class="cn(
    'flex items-center rounded-full',
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
      :placeholder="props.isMobile ? 'Search' : 'Search files...'"
      :class="cn(
        'flex-1 bg-transparent outline-none min-w-0',
        'text-gray-900 dark:text-gray-100',
        'placeholder:text-gray-500 dark:placeholder:text-gray-400',
        props.isMobile ? 'text-sm' : 'text-base'
      )"
    />
    <Filter v-if="!props.isMobile" class="text-gray-500 dark:text-gray-400 ml-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0" />
  </div>
</template> 