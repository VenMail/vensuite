<template>
  <div class="slidev-layout cover h-full flex items-center justify-center p-8">
    <div 
      class="cinematic-frame w-full max-w-4xl text-center relative overflow-hidden p-12"
      :class="$attrs.class"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      
      <div v-if="$slots.icon" class="w-20 h-20 mx-auto mb-6 relative z-10 flex items-center justify-center">
        <slot name="icon" />
      </div>
      
      <h1 class="text-6xl font-bold text-white mb-4 relative z-10">
        <slot />
      </h1>
      
      <p v-if="$slots.subtitle" class="text-2xl text-gray-300 mb-6 relative z-10">
        <slot name="subtitle" />
      </p>
      
      <p v-if="$slots.tagline" class="text-lg text-gray-400 relative z-10">
        <slot name="tagline" />
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>
