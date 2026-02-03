<template>
  <div class="slidev-layout pricing h-full p-8">
    <div 
      class="cinematic-frame w-full h-full relative overflow-hidden p-6 flex flex-col"
      :class="$attrs.class"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      
      <div v-if="$slots.header || title" class="text-center mb-8 relative z-10">
        <div v-if="$slots.icon" class="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <slot name="icon" />
        </div>
        <div>
          <h2 v-if="title" class="text-5xl font-bold text-white mb-2">{{ title }}</h2>
          <slot name="header" />
        </div>
      </div>
      
      <div class="flex-1 relative z-10 overflow-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <slot />
        </div>
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
