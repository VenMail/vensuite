<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Home, FolderTree, FileText, Table, Image, File, Menu } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const items = [
  { name: 'Home', icon: Home, route: '/' },
  { name: 'Browse', icon: FolderTree, route: '/browse' },
  { name: 'Documents', icon: FileText, route: '/documents' },
  { name: 'Spreadsheets', icon: Table, route: '/spreadsheets' },
  { name: 'Media Files', icon: Image, route: '/media' },
  { name: 'Others', icon: File, route: '/others' },
]

const activeItem = ref('Home')
const isSidebarVisible = ref(false)
const isMobile = ref(false)
const route = useRoute()

// Toggle sidebar visibility for mobile
const toggleSidebar = () => {
  isSidebarVisible.value = !isSidebarVisible.value
}

// Hide the sidebar on non-home routes
const shouldAutohideSidebar = computed(() => route.name !== 'home')

const setActiveItem = (item: string) => {
  activeItem.value = item
}

// Detect mobile screen size
onMounted(() => {
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  handleResize()
  window.addEventListener('resize', handleResize)
})

// Auto-hide sidebar on non-home routes
const sidebarClasses = computed(() =>
  cn(
    'fixed top-0 left-0 h-full w-64 bg-white bg-opacity-50 backdrop-blur-lg border-r border-gray-200 p-4 transition-transform transform',
    shouldAutohideSidebar.value ? '-translate-x-full' : '',
    isSidebarVisible.value ? 'translate-x-0' : '',
    isMobile.value ? 'z-50' : 'hover:translate-x-0'
  )
)
</script>

<template>
  <div>
    <!-- Mobile Hamburger Icon -->
    <button v-if="isMobile" @click="toggleSidebar" class="fixed top-4 left-4 z-50 p-2 rounded-md bg-white bg-opacity-50 backdrop-blur-lg">
      <Menu class="h-6 w-6 text-gray-900" />
    </button>

    <!-- Sidebar -->
    <div :class="sidebarClasses">
      <nav class="space-y-2">
        <a
          v-for="item in items"
          :key="item.name"
          :href="item.route"
          @click.prevent="setActiveItem(item.name)"
          :class="cn(
            'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
            activeItem === item.name
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )"
        >
          <component :is="item.icon" class="h-5 w-5 mr-3" />
          {{ item.name }}
        </a>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Add a smooth transition effect to the sidebar */
.fixed {
  transition: transform 0.3s ease;
}
</style>
