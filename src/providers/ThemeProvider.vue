<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'

const isDark = ref(false)

// Provide theme state and toggle function
provide('theme', {
  isDark,
  toggleTheme: () => {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark', isDark.value)
  }
})

// Check system preference on mount
onMounted(() => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<template>
  <slot />
</template> 