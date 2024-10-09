<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

</script>

<template>  
  <Toaster class="pointer-events-auto" />
  <div id="app" class="h-screen flex flex-col">
    <router-view />
  </div>
</template>
