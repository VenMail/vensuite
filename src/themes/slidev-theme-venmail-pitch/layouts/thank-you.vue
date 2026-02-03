<template>
  <div class="slidev-layout thank-you h-full p-8">
    <div 
      class="cinematic-frame w-full h-full relative overflow-hidden p-12 flex flex-col"
      :class="$attrs.class"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      
      <div class="flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <div v-if="$slots.icon" class="w-20 h-20 mb-6 flex items-center justify-center">
          <slot name="icon" />
        </div>
        
        <h1 v-if="title" class="text-6xl font-bold text-white mb-4">
          {{ title }}
        </h1>
        
        <p v-if="$slots.subtitle" class="text-2xl text-gray-300 mb-8">
          <slot name="subtitle" />
        </p>
        
        <div class="space-y-4">
          <slot />
        </div>
        
        <div v-if="$slots.footer" class="mt-12">
          <slot name="footer" />
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
