<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import type { ComboboxItemEmits, ComboboxItemProps } from 'radix-vue'
import { ComboboxItem, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ComboboxItemEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ComboboxItem
    v-bind="forwarded"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'text-gray-900 dark:text-gray-100',
        'data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class
      )
    "
  >
    <slot />
  </ComboboxItem>
</template>
