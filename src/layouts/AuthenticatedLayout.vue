<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/auth/index'
import Sidebar from '@/views/Sidebar.vue'
// import { ToastProvider } from '@/components/ui/toast'
import TopNav from '@/components/layout/TopNav.vue'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/store/sidebar'
import { useMobileDetection } from '@/composables/useMobileDetection'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const { isMobile } = useMobileDetection({ breakpoint: 1024 })
const isDark = ref(false)
const sidebarStore = useSidebarStore()
const { isVisible, isCollapsed } = storeToRefs(sidebarStore)
// const searchValue = ref("")

// Get hideLayout from route meta
const hideLayout = computed(() => route.meta.hideLayout === true)

// Show sidebar on specific routes
watch(() => route.name, (newRouteName) => {
  const show = (
    newRouteName === 'home' ||
    newRouteName === 'forms' ||
    newRouteName === 'slides' ||
    newRouteName === 'media' ||
    newRouteName === 'stories' ||
    newRouteName === 'docs-view' ||
    newRouteName === 'sheets-view' ||
    newRouteName === 'bin-view' // Add bin-view to keep sidebar visible
  )
  sidebarStore.setVisible(show && !isMobile.value)
  if (isMobile.value) {
    sidebarStore.setCollapsed(true)
  }
})

watch(isMobile, (mobile) => {
  if (mobile) {
    sidebarStore.enforceMobileDefaults()
  } else if (!hideLayout.value) {
    sidebarStore.enforceDesktopDefaults()
  }
}, { immediate: true })

const toggleSidebar = () => {
  sidebarStore.toggleVisible()
}

const toggleCollapse = (collapsed: boolean) => {
  sidebarStore.setCollapsed(collapsed)
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
  const name = router.currentRoute.value.name as string | undefined
  const params: any = router.currentRoute.value.params
  const isPublicViewer = (
    (router.currentRoute.value.meta as any)?.public === true ||
    (name === 'docs-edit' && typeof params.appFileId === 'string' && params.appFileId !== 'new') ||
    (name === 'sheet' && typeof params.id === 'string' && params.id !== 'new') ||
    (name === 'file' && typeof params.id === 'string')
  )

  if (!isAuthenticated.value && isPublicViewer) {
    // Allow unauthenticated users to view public/link-access items without redirecting
  } else if (!isAuthenticated.value) {
    await router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
  }
  
  // Check system preference for dark mode
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})

watch(isAuthenticated, async (newValue) => {
  if (!newValue) {
    const name = router.currentRoute.value.name as string | undefined
    const params: any = router.currentRoute.value.params
    const isPublicViewer = (
      (router.currentRoute.value.meta as any)?.public === true ||
      (name === 'docs-edit' && typeof params.appFileId === 'string' && params.appFileId !== 'new') ||
      (name === 'sheet' && typeof params.id === 'string' && params.id !== 'new') ||
      (name === 'file' && typeof params.id === 'string')
    )
    if (!isPublicViewer) {
      await router.push({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath }
      })
    }
  }
})

// Do not auto-collapse based on hideLayout; collapse only on explicit user action

// Dynamic class for the main content area
const mainContentClasses = computed(() =>
  cn(
    'flex-1 min-h-0 overflow-auto',
    'bg-slate-50 dark:bg-slate-950',
    'transition-all duration-200',
    hideLayout.value ? 'w-full' : ''
  )
)
</script>

<template>
  <div class="h-screen min-h-0 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
    <TopNav 
      v-if="!hideLayout"
      :isMobile="isMobile"
      @toggleSidebar="toggleSidebar"
    />

    <!-- Main Content Area with Sidebar -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar 
        v-if="!hideLayout"
        :isVisible="isVisible" 
        :isCollapsed="isCollapsed"
        @toggle="toggleSidebar"
        @collapse="toggleCollapse"
      />
      
      <main :class="mainContentClasses">
        <slot />
        <router-view v-if="$slots.default === undefined" />
      </main>
    </div>
  </div>
</template>
