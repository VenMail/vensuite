<template>
  <div class="slidev-layout section-divider h-full flex items-center justify-center p-8">
    <div 
      class="cinematic-frame w-full max-w-4xl text-center relative overflow-hidden p-16"
      :class="$attrs.class"
    >
      <div class="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-blue-900/30 pointer-events-none" />
      
      <!-- Section number indicator -->
      <div v-if="$slots.number" class="absolute top-8 left-8 text-8xl font-bold text-white/10">
        <slot name="number" />
      </div>
      
      <!-- Icon -->
      <div v-if="$slots.icon" class="w-24 h-24 mx-auto mb-8 relative z-10 flex items-center justify-center">
        <slot name="icon" />
      </div>
      
      <!-- Main title -->
      <h1 class="text-5xl font-bold text-white mb-6 relative z-10 leading-tight">
        <slot />
      </h1>
      
      <!-- Subtitle/description -->
      <p v-if="$slots.description" class="text-xl text-gray-300 max-w-2xl mx-auto relative z-10 leading-relaxed">
        <slot name="description" />
      </p>
      
      <!-- Decorative elements -->
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>
