<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Home, FileText, Table, Image, Menu, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { useRouter, useRoute } from 'vue-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: true
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle', 'collapse'])

const items = [
  { name: 'Home', icon: Home, route: '/' },
  { name: 'Documents', icon: FileText, route: '/docs' },
  { name: 'Spreadsheets', icon: Table, route: '/sheets' },
  { name: 'Media', icon: Image, route: '/media' },
  { name: 'Bin', icon: Trash2, route: '/bin' }
]

const router = useRouter()
const route = useRoute()
const activeItem = ref('Home')
const isMobile = ref(false)
const collapsed = ref(props.isCollapsed)
const isDialogOpen = ref(false) // Add dialog state management
const dialogRef = ref(null) // Reference to dialog component

watch(() => props.isCollapsed, (value) => {
  collapsed.value = value
})

// Watch route changes and update active item
watch(() => route.path, (path) => {
  console.log('Route path changed:', path)
  // Find the best matching item (longest route match)
  const matchingItems = items.filter(item => path.startsWith(item.route))
  if (matchingItems.length > 0) {
    // Sort by route length (longest first) to get the most specific match
    const bestMatch = matchingItems.sort((a, b) => b.route.length - a.route.length)[0]
    console.log('Found matching item:', bestMatch.name)
    activeItem.value = bestMatch.name
  } else {
    console.log('No matching item found for path:', path)
  }
}, { immediate: true })

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
  emit('collapse', collapsed.value)
}

const toggleSidebar = () => {
  emit('toggle')
}

const setActiveItem = (item: string, route: string) => {
  console.log('setActiveItem called:', item, route)
  activeItem.value = item
  router.push(route)
}

// Detect mobile screen size (do not auto-collapse; only change layout classes)
onMounted(() => {
  console.log('Sidebar mounted, initial route path:', route.path)
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  handleResize()
  window.addEventListener('resize', handleResize)
})

// Sidebar classes
const sidebarClasses = computed(() =>
  cn(
    'h-full border-r transition-all duration-200',
    'bg-white dark:bg-gray-900',
    'border-gray-200 dark:border-gray-800',
    props.isVisible ? 'translate-x-0' : '-translate-x-full',
    collapsed.value ? 'w-16' : 'w-64',
    isMobile.value ? 'fixed top-0 left-0 z-40' : ''
  )
)

const templates = {
  Documents: [
    { name: "Blank Document", icon: defaultIcons.IconMicrosoftWord },
    { name: "Resume", icon: defaultIcons.IconMicrosoftWord },
    { name: "Letter", icon: defaultIcons.IconMicrosoftWord },
  ],
  Spreadsheets: [
    { name: "Blank Spreadsheet", icon: defaultIcons.IconMicrosoftExcel },
    { name: "Budget", icon: defaultIcons.IconMicrosoftExcel },
    { name: "Invoice", icon: defaultIcons.IconMicrosoftExcel },
  ],
}

function handleTemplateClick(category: string, templateName: string) {
  // Immediately close the dialog and navigate
  isDialogOpen.value = false
  createNewFile(category, templateName)
}

function createNewFile(type: string, template?: string) {
  console.log('Creating new file:', type, template) // Debug log
  
  if (type === "Spreadsheets") {
    if (template?.toLowerCase().includes("blank")) {
      console.log('Navigating directly to /sheets/new') // Debug log
      router.push("/sheets/new")
    } else {
      console.log('Navigating to /sheets/t/' + template) // Debug log
      router.push("/sheets/t/" + template)
    }
  } else if (type === "Documents") {
    if (template?.toLowerCase().includes("blank")) {
      console.log('Navigating directly to /docs/new') // Debug log
      router.push("/docs/new")
    } else {
      console.log('Navigating to /docs/t/' + template) // Debug log
      router.push("/docs/t/" + template)
    }
  }
}
</script>

<template>
  <div>
    <!-- Collapsed Sidebar -->
    <div :class="sidebarClasses">
      <div class="flex flex-col h-full">
        <!-- Top Section with New Button and Collapse Toggle -->
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <Dialog v-model:open="isDialogOpen" ref="dialogRef">
            <DialogTrigger asChild>
              <button
                class="flex items-center justify-center rounded-sm bg-primary-600 text-white hover:bg-primary-700 transition-colors py-2"
                :class="collapsed ? 'w-8 -ml-2' : 'w-full'"
              >
                <Plus class="h-5 w-5" :class="collapsed ? 'w-7' : 'mr-2'" />
                <span v-if="!collapsed">New</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
              </DialogHeader>
              <Tabs default-value="Documents">
                <TabsList>
                  <TabsTrigger v-for="category in Object.keys(templates)" :key="category" :value="category">
                    {{ category }}
                  </TabsTrigger>
                </TabsList>
                <TabsContent v-for="(items, category) in templates" :key="category" :value="category">
                  <div class="grid grid-cols-2 gap-4">
                    <button v-for="template in items" :key="template.name"
                      class="h-24 flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                      @click="handleTemplateClick(category, template.name)"
                      type="button">
                      <component :is="template.icon" class="w-8 h-8 pointer-events-none" />
                      <span class="mt-2 text-sm pointer-events-none">{{ template.name }}</span>
                    </button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          
          <button v-if="!isMobile" @click="toggleCollapse" :class="cn(
            'p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800',
            collapsed ? 'w-6' : 'ml-2'
          )">
            <ChevronLeft v-if="!collapsed" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <ChevronRight v-else class="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <!-- File Navigation -->
        <div class="px-2 flex-1 py-4">
          <nav class="space-y-1">
            <a
              v-for="item in items"
              :key="item.name"
              :href="item.route"
              @click.prevent="setActiveItem(item.name, item.route)"
              :class="cn(
                'flex items-center rounded-sm transition-colors',
                collapsed ? 'justify-center py-3 px-2' : 'px-3 py-2',
                activeItem === item.name
                  ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )"
            >
              <component :is="item.icon" class="h-5 w-5" :class="collapsed ? '' : 'mr-3'" />
              <span v-if="!collapsed">{{ item.name }}</span>
            </a>
          </nav>
        </div>
      </div>
    </div>

    <!-- Mobile Hamburger Icon -->
    <button v-if="isMobile && !props.isVisible" @click="toggleSidebar" class="fixed top-4 left-4 z-50 p-2 rounded-sm bg-white dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 backdrop-blur-lg">
      <Menu class="h-5 w-5 text-gray-900 dark:text-gray-100" />
    </button>
  </div>
</template>