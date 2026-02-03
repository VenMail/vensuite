<template>
  <div class="slidev-layout content h-full p-8">
    <div 
      class="cinematic-frame w-full h-full relative overflow-hidden p-8 flex flex-col"
      :class="$attrs.class"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      
      <div v-if="$slots.header || title" class="flex items-center gap-4 mb-6 relative z-10">
        <div v-if="$slots.icon" class="w-12 h-12 flex items-center justify-center">
          <slot name="icon" />
        </div>
        <div>
          <h2 v-if="title" class="text-4xl font-bold text-white">{{ title }}</h2>
          <slot name="header" />
        </div>
      </div>
      
      <div class="flex-1 relative z-10 overflow-auto">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  class?: string
}>()
</script>
