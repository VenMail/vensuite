<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/auth'
import Sidebar from '@/views/Sidebar.vue'
import { useFileStore } from '@/store/files'
import { ToastProvider } from '@/components/ui/toast'
import { Menu, Search, Filter, Moon, Sun, Globe, Mail, Calendar, UserPlus } from 'lucide-vue-next'
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
const searchValue = ref("")

// Get hideLayout from route meta
const hideLayout = computed(() => route.meta.hideLayout === true)

// Show sidebar on specific routes
watch(() => route.name, (newRouteName) => {
  sidebarVisible.value = (newRouteName === 'home' || newRouteName === 'forms')
})

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const toggleCollapse = (collapsed: boolean) => {
  sidebarCollapsed.value = collapsed
}

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

const navigateToRoute = (route: string) => {
  router.push(route)
}

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
    <div :class="['min-h-screen flex flex-col', isDark ? 'dark' : '']">
      <!-- Top Navigation Bar -->
      <nav v-if="!hideLayout"
        :class="cn(
          'flex w-full items-center gap-2 sm:gap-4 border-b py-3',
          'px-2 sm:px-6',
          'bg-white dark:bg-gray-900',
          'border-gray-200 dark:border-gray-800',
          'transition-all duration-200',
          isMobile ? 'h-16' : 'h-20',
        )"
      >
        <div :class="cn(
          'flex items-center w-full',
          isMobile ? 'justify-between' : 'justify-start'
        )">
          <!-- Left section: Logo and menu -->
          <div :class="cn(
            'flex items-center',
            isMobile ? 'space-x-2' : 'space-x-6'
          )">
            <button 
              v-if="isMobile" 
              @click="toggleSidebar"
              :class="cn(
                'inline-flex items-center justify-center p-2 rounded-sm',
                'text-gray-600 dark:text-gray-300',
                'hover:text-gray-800 dark:hover:text-gray-100',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-400',
                'transition duration-150 ease-in-out'
              )"
            >
              <Menu class="h-5 w-5" />
            </button>

            <div :class="cn(
              'flex items-center',
              isMobile ? '!ml-[-4px] scale-90' : 'mr-[158px]'
            )">
              <img src="/logo.png" alt="VDrive Logo" class="h-8" /> VCloud
            </div>

            <!-- Search Bar -->
            <div :class="cn(
              'flex items-center rounded-full',
              isMobile ? 'px-2 py-2' : 'px-4 py-3',
              'bg-gray-100 dark:bg-gray-800',
              'focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400',
              'transition-all duration-200',
              isMobile ? 'ml-0 mr-1 w-full max-w-[180px]' : 'w-96'
            )">
              <Search :class="cn(
                'text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0',
                isMobile ? 'h-4 w-4' : 'h-5 w-5'
              )" />
              <input
                v-model="searchValue"
                type="text"
                :placeholder="isMobile ? 'Search' : 'Search files...'"
                :class="cn(
                  'flex-1 bg-transparent outline-none min-w-0',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                  isMobile ? 'text-sm' : 'text-base'
                )"
              />
              <Filter v-if="!isMobile" class="text-gray-500 dark:text-gray-400 ml-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0" />
            </div>
            
            <!-- Navigation Icons -->
            <div class="flex items-center space-x-2">
              <button
                v-for="(item, index) in [
                  { icon: Mail, route: '/mail' },
                  { icon: Calendar, route: '/calendar' },
                  { icon: UserPlus, route: '/contacts' }
                ]"
                :key="index"
                @click="navigateToRoute(item.route)"
                :class="cn(
                  'p-2 rounded-sm',
                  'text-gray-600 dark:text-gray-300',
                  'hover:text-gray-800 dark:hover:text-gray-100',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'transition-colors duration-200'
                )"
              >
                <component :is="item.icon" class="h-5 w-5" />
              </button>
            </div>

          </div>

          <!-- Right section: Actions and profile -->
          <div :class="cn(
            'flex items-center',
            isMobile ? 'ml-1' : 'space-x-4 ml-auto'
          )">
            <button
              v-if="!isMobile"
              @click="toggleDarkMode"
              :class="cn(
                'p-2 rounded-full',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors duration-200'
              )"
            >
              <component 
                :is="isDark ? Moon : Sun" 
                class="h-6 w-6" 
                :class="isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'" 
              />
            </button>

            <div class="w-[150px] flex justify-end">
              <Globe class="text-gray-600 dark:text-gray-300" />
            </div>

            <!-- User Profile -->
            <div class="flex items-center">
              <div class="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center">
                <span>U</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

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