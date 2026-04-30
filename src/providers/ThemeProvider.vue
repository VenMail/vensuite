<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'

const isDark = ref(false)

function setDarkMode(value: boolean) {
  isDark.value = value
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem('theme', value ? 'dark' : 'light')
}

// Provide theme state and toggle function
provide('theme', {
  isDark,
  toggleTheme: () => {
    setDarkMode(!isDark.value)
  }
})

// Initialize theme on mount
onMounted(() => {
  // Check for saved preference first
  const savedTheme = localStorage.getItem('theme')
  
  if (savedTheme === 'dark') {
    setDarkMode(true)
  } else if (savedTheme === 'light') {
    setDarkMode(false)
  } else {
    // No saved preference, check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true)
    }
  }
})
</script>

<template>
  <slot />
</template> 