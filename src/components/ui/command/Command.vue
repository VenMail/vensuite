<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import type { ComboboxRootEmits, ComboboxRootProps } from 'radix-vue'
import { ComboboxRoot, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<ComboboxRootProps & { class?: HTMLAttributes['class'] }>(), {
  open: true,
  modelValue: '',
})

const emits = defineEmits<ComboboxRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ComboboxRoot
    v-bind="forwarded"
    :class="
      cn(
        'flex h-full w-full flex-col overflow-hidden rounded-sm',
        'bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-800',
        'text-gray-900 dark:text-gray-100',
        props.class
      )
    "
  >
    <slot />
  </ComboboxRoot>
</template>
