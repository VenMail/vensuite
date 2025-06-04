<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/views/Sidebar.vue'
import { useFileStore } from '@/store/files'
import { ToastProvider } from '@/components/ui/toast'
import TopNav from '@/components/layout/TopNav.vue'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const fileStore = useFileStore()
const { isAuthenticated } = storeToRefs(authStore)

const isMobile = ref(false)
const isDark = ref(false)
const sidebarVisible = ref(true)
const sidebarCollapsed = ref(false)
// const searchValue = ref("")

// Get hideLayout from route meta
const hideLayout = computed(() => route.meta.hideLayout === true)

// Show sidebar on specific routes
watch(() => route.name, (newRouteName) => {
  sidebarVisible.value = (newRouteName === 'home' || newRouteName === 'forms' || newRouteName === 'media' || newRouteName === 'docs-view' || newRouteName === 'sheets-view')
})

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const toggleCollapse = (collapsed: boolean) => {
  sidebarCollapsed.value = collapsed
}

// const toggleDarkMode = () => {
//   isDark.value = !isDark.value
//   document.documentElement.classList.toggle('dark', isDark.value)
// }

// const navigateToRoute = (route: string) => {
//   router.push(route)
// }

onMounted(async () => {
  // Handle authentication
  console.log('hideLayout', hideLayout.value)
  if (isAuthenticated.value) {
    await fileStore.loadDocuments()
  } else {
    await router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
  }
  
  // Handle responsive design
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
    if (isMobile.value) {
      sidebarCollapsed.value = true
    }
  }
  handleResize()
  window.addEventListener('resize', handleResize)
  
  // Check system preference for dark mode
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDark.value = true
    document.documentElement.classList.add('dark')
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

// Watch for hideLayout changes to collapse sidebar
watch(hideLayout, (newValue) => {
  if (newValue) {
    sidebarCollapsed.value = true
  }
})

// Dynamic class for the main content area
const mainContentClasses = computed(() =>
  cn(
    'flex-1 overflow-auto',
    'bg-gray-50 dark:bg-gray-950',
    'transition-all duration-200',
    hideLayout.value ? 'w-full' : ''
  )
)
</script>

<template>
  <ToastProvider>
    <div class="min-h-screen flex flex-col">
      <TopNav 
        v-if="!hideLayout"
        :isMobile="isMobile"
        @toggleSidebar="toggleSidebar"
      />

      <!-- Main Content Area with Sidebar -->
      <div class="flex flex-1 overflow-hidden">
        <Sidebar 
          v-if="!hideLayout"
          :isVisible="sidebarVisible" 
          :isCollapsed="sidebarCollapsed"
          @toggle="toggleSidebar"
          @collapse="toggleCollapse"
        />
        
        <main :class="mainContentClasses">
          <router-view />
        </main>
      </div>
    </div>
  </ToastProvider>
</template>