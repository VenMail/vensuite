<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/auth/index'
import Landing from './Landing.vue'
import Home from './Home.vue'
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'

const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<template>
  <Landing v-if="!isAuthenticated" />
  <AuthenticatedLayout v-else>
    <Home />
  </AuthenticatedLayout>
</template>
