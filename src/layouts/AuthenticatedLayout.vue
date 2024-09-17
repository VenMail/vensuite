<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/views/Sidebar.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

onMounted(async () => {
  if (!isAuthenticated.value) {
    const isValid = await authStore.fetchFiles()
    if (!isValid) {
      await router.push({ 
        name: 'login', 
        query: { redirect: router.currentRoute.value.fullPath } 
      })
    }
  }
})

watch(isAuthenticated, async (newValue) => {
  if (!newValue) {
    await router.push({ 
      name: 'login', 
      query: { redirect: router.currentRoute.value.fullPath } 
    })
  }
})
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900">
    <Sidebar />
    <div class="flex-1 flex flex-col overflow-hidden">
      <router-view />
    </div>
  </div>
</template>
