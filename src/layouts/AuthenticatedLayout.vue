<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/views/Sidebar.vue'
import { useFileStore } from '@/store/files'

const router = useRouter()
const authStore = useAuthStore()
const fileStore = useFileStore()
const { isAuthenticated } = storeToRefs(authStore)
const route = useRoute()

const isSidebarVisible = ref(route.name === 'home')

onMounted(async () => {
  if (isAuthenticated.value) {
    await fileStore.loadDocuments()
  } else {
    await router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
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

watch(() => route.name, (newRouteName) => {
    isSidebarVisible.value = (newRouteName === 'home')
  }
)

// Dynamic class for the main content area
const mainContentClasses = computed(() =>
  isSidebarVisible.value ? 'flex-1' : 'flex-1'
)
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900">
    <!-- Sidebar with dynamic visibility -->
    <Sidebar v-if="isSidebarVisible" />

    <!-- Main content area with dynamic margin -->
    <div :class="mainContentClasses">
      <router-view />
    </div>
  </div>
</template>
