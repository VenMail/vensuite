<script setup lang="ts">
import { ref, computed, onMounted, defineProps, defineEmits } from 'vue'
import { Home, FileText, Table, Image, Menu, FormInput } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { router } from '@/main';

const items = [
  { name: 'Home', icon: Home, route: '/' },
  { name: 'New Document', icon: FileText, route: '/docs' },
  { name: 'New Spreadsheet', icon: Table, route: '/sheets' },
  { name: 'Forms and Surveys', icon: FormInput, route: '/forms' },
  { name: 'Browse Media', icon: Image, route: '/media' },
]

// Props to control visibility from parent
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: true,
  }
})

// Emit event to toggle visibility
const emit = defineEmits(['toggle'])

const activeItem = ref('Home')
const isMobile = ref(false)

// Toggle sidebar visibility for mobile
const toggleSidebar = () => {
  emit('toggle')
}

const setActiveItem = (item: string, route: string) => {
  activeItem.value = item
  router.push(route)
}

// Detect mobile screen size
onMounted(() => {
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  handleResize()
  window.addEventListener('resize', handleResize)
})

// Sidebar classes
const sidebarClasses = computed(() =>
  cn(
    'h-full w-64 bg-white bg-opacity-50 backdrop-blur-lg border-r border-gray-200 p-4 transition-transform',
    props.isVisible ? 'translate-x-0' : '-translate-x-full',
    isMobile.value ? 'fixed top-0 left-0 z-50' : ''
  )
)
</script>

<template>
  <div>
    <!-- Sidebar -->
    <div :class="sidebarClasses">
      <nav class="space-y-2">
        <a
          v-for="item in items"
          :key="item.name"
          :href="item.route"
          @click.prevent="setActiveItem(item.name, item.route)"
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

    <!-- Mobile Hamburger Icon -->
    <button v-if="isMobile" @click="toggleSidebar" class="fixed top-4 left-4 z-50 p-2 rounded-md bg-white bg-opacity-50 backdrop-blur-lg">
      <Menu class="h-6 w-6 text-gray-900" />
    </button>
  </div>
</template>

<style scoped>
/* Add a smooth transition effect to the sidebar */
.transition-transform {
  transition: transform 0.3s ease;
}
</style>
