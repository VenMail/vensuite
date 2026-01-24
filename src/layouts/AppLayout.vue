<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Sidebar from './Sidebar.vue'
import { Search, Filter, Moon, Sun, Plus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/composables/useMobileDetection'

defineProps({
  title: {
    type: String,
    default: 'VenMail'
  }
})

const { isMobile } = useMobileDetection({ breakpoint: 1024 })
const isDark = ref(false)
const sidebarVisible = ref(true)
const sidebarCollapsed = ref(false)

const THEME_STORAGE_KEY = 'theme'
const THEME_EVENT = 'theme-change'

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const toggleCollapse = (collapsed: boolean) => {
  sidebarCollapsed.value = collapsed
}

const applyTheme = (mode: 'light' | 'dark', emitEvent = false, persist = true) => {
  const nextIsDark = mode === 'dark'
  isDark.value = nextIsDark
  document.documentElement.classList.toggle('dark', nextIsDark)
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  }
  if (emitEvent) {
    window.dispatchEvent(new CustomEvent<'light' | 'dark'>(THEME_EVENT, { detail: mode }))
  }
}

const toggleDarkMode = () => {
  const mode: 'light' | 'dark' = isDark.value ? 'light' : 'dark'
  applyTheme(mode, true)
}

const syncThemeFromStorage = () => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored, false)
  } else {
    applyTheme('light', false, false)
  }
}

const handleExternalTheme = (event: Event) => {
  const detail = (event as CustomEvent<'light' | 'dark'>).detail
  if (detail === 'light' || detail === 'dark') {
    applyTheme(detail, false)
  }
}

onMounted(() => {
  syncThemeFromStorage()
  window.addEventListener(THEME_EVENT, handleExternalTheme as EventListener)
})

onUnmounted(() => {
  window.removeEventListener(THEME_EVENT, handleExternalTheme as EventListener)
})
</script>

<template>
  <div :class="['min-h-screen flex flex-col', isDark ? 'dark' : '']">
    <!-- Top Navigation Bar -->
    <nav
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
          <div :class="cn(
            'flex items-center',
            isMobile ? '!ml-[-4px] scale-90' : 'mr-20'
          )">
            <img v-if="isMobile" src="/manifest-icon-512.maskable.png" alt="VenMail Logo" class="h-6 w-6 rounded-sm" />
            <img v-else src="/logo-black.png" alt="VenMail Logo" class="h-6 w-full" />
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
              type="text"
              :placeholder="isMobile ? 'Search' : 'Search email'"
              :class="cn(
                'flex-1 bg-transparent outline-none min-w-0',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                isMobile ? 'text-sm' : 'text-base'
              )"
            />
            <Filter v-if="!isMobile" class="text-gray-500 dark:text-gray-400 ml-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0" />
          </div>
        </div>

        <!-- Mobile New Button -->
        <button
          v-if="isMobile"
          class="p-1.5 rounded-sm bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <Plus class="h-4 w-4" />
        </button>

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
        :isVisible="sidebarVisible" 
        :isCollapsed="sidebarCollapsed"
        @toggle="toggleSidebar"
        @collapse="toggleCollapse"
      />
      
      <main :class="cn(
        'flex-1 overflow-auto p-6',
        'bg-gray-50 dark:bg-gray-950',
        'transition-all duration-200',
      )">
        <slot />
      </main>
    </div>
  </div>
</template>