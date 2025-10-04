<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import ThemeProvider from '@/providers/ThemeProvider.vue'
</script>

<template>  
  <ThemeProvider>
    <Toaster 
      position="bottom-right" 
      :duration="3000"
      class="pointer-events-auto" 
    />
    <RouterView />
  </ThemeProvider>
</template>
