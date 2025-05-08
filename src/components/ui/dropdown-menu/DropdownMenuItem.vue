<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import {
  DropdownMenuItem,
  type DropdownMenuItemProps,
  useForwardProps,
} from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuItem
    v-bind="forwardedProps"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'text-gray-900 dark:text-gray-100',
        'focus:bg-gray-100 dark:focus:bg-gray-800',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
