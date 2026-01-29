<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Home, FileText, Table, Image, ChevronLeft, ChevronRight, Plus, Trash2, FileBoxIcon, Presentation, ArrowLeft } from 'lucide-vue-next'
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
import { useMobileDetection } from '@/composables/useMobileDetection'

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  },
  isCollapsed: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['toggle', 'collapse'])

const items = [
  { name: 'Home', icon: Home, route: '/' },
  { name: 'Documents', icon: FileText, route: '/docs' },
  { name: 'Forms', icon: FileBoxIcon, route: '/forms' },
  { name: 'Slides', icon: Presentation, route: '/slides' },
  { name: 'Spreadsheets', icon: Table, route: '/sheets' },
  { name: 'Media', icon: Image, route: '/media' },
  { name: 'Bin', icon: Trash2, route: '/bin' }
]

const router = useRouter()
const route = useRoute()
const activeItem = ref('Home')
const { isMobile } = useMobileDetection({ breakpoint: 768 })
const isTablet = computed(() => !isMobile.value && window.innerWidth >= 768 && window.innerWidth < 1024)
const isDialogOpen = ref(false)

function goToVenmail() {
  window.location.href='https://m.venmail.io'
}

watch(() => route.path, (path) => {
  const matchingItems = items.filter(item => path.startsWith(item.route))
  if (matchingItems.length > 0) {
    const bestMatch = matchingItems.sort((a, b) => b.route.length - a.route.length)[0]
    activeItem.value = bestMatch.name
  } else {
  }
}, { immediate: true })

const toggleCollapse = () => {
  emit('collapse', !props.isCollapsed)
}

const closeSidebar = () => {
  emit('toggle')
}

const setActiveItem = (item: string, route: string) => {
  activeItem.value = item
  router.push(route)
  if (isMobile.value) {
    closeSidebar()
  }
}

const sidebarClasses = computed(() =>
  cn(
    'h-full transition-all duration-200',
    props.isVisible ? 'border-r bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800' : '',
    props.isVisible ? 'translate-x-0' : '-translate-x-full',
    props.isVisible ? (props.isCollapsed ? 'w-16' : (isTablet.value ? 'w-56' : 'w-64')) : 'w-0',
    // Remove fixed positioning on mobile to integrate with layout
  )
)

const templates = {
  Documents: [
    { name: "Blank Document", icon: defaultIcons.IconMicrosoftWord },
    { name: "Resume", icon: defaultIcons.IconMicrosoftWord },
    { name: "Letter", icon: defaultIcons.IconMicrosoftWord },
  ],
  Slides: [
    { name: "Default Theme", icon: Presentation },
    { name: "Seriph Theme", icon: Presentation },
    { name: "Academic Theme", icon: Presentation },
    { name: "Purplin Theme", icon: Presentation },
    { name: "Neversink Theme", icon: Presentation },
  ],
  Spreadsheets: [
    { name: "Blank Spreadsheet", icon: defaultIcons.IconMicrosoftExcel },
    { name: "Budget", icon: defaultIcons.IconMicrosoftExcel },
    { name: "Invoice", icon: defaultIcons.IconMicrosoftExcel },
  ],
}

function handleTemplateClick(category: string, templateName: string) {
  isDialogOpen.value = false
  createNewFile(category, templateName)
}

function createNewFile(type: string, template?: string) {
  if (type === "Spreadsheets") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/sheets/new")
    } else {
      router.push("/sheets/t/" + template)
    }
  } else if (type === "Documents") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/docs/new")
    } else {
      router.push("/docs/t/" + template)
    }
  } else if (type === "Slides") {
    if (template?.toLowerCase().includes("blank")) {
      router.push("/slides/new")
    } else if (template) {
      router.push("/slides/t/" + template.toLowerCase().replace(/\s+/g, '-'))
    }
  }
}
</script>

<template>
  <div>
    <!-- Sidebar -->
    <div v-if="props.isVisible" :class="sidebarClasses">
      <div class="flex flex-col h-full">
        <!-- back nav -->
        <div class="px-4 pt-4">
          <!-- Mobile: Icon-only button -->
          <button
            v-if="isMobile"
            class="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            @click="goToVenmail"
            :aria-label="$t('Views.Home.link.back_to_venmail')"
          >
            <img src="/manifest-icon-512.maskable.png" alt="VenMail" class="w-6 h-6 rounded-sm" />
            <div class="absolute -top-1 -left-1 w-4 h-4 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm">
              <ArrowLeft class="w-3 h-3 text-gray-600 dark:text-gray-300" />
            </div>
          </button>

          <!-- Desktop: Text button -->
          <button
            v-else
            class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500"
            @click="goToVenmail"
          >
            <ArrowLeft class="h-4 w-4" />
            {{$t('Views.Home.link.back_to_venmail')}}
          </button>
        </div>

        <!-- Top Section with New Button and Controls -->
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800 gap-2">
          <Dialog v-model:open="isDialogOpen" ref="dialogRef">
            <DialogTrigger asChild>
              <button
                class="flex items-center justify-center rounded-sm bg-primary-600 text-white hover:bg-primary-700 transition-colors py-2"
                :class="props.isCollapsed ? 'w-8' : 'flex-1'"
              >
                <Plus class="h-5 w-5" :class="props.isCollapsed ? '' : 'mr-2'" />
                <span v-if="!props.isCollapsed">{{$t('Commons.button.new')}}</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{{$t('Views.Sidebar.heading.choose_a_template')}}</DialogTitle>
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
          
          <!-- Desktop: Collapse Toggle -->
          <button v-if="!isMobile" @click="toggleCollapse" :class="cn(
            'p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0'
          )">
            <ChevronLeft v-if="!props.isCollapsed" class="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <ChevronRight v-else class="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>

          <!-- Mobile: Close Button - Hidden on mobile per design -->
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
                props.isCollapsed ? 'justify-center py-3 px-2' : 'px-3 py-2',
                activeItem === item.name
                  ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )"
            >
              <component :is="item.icon" class="h-5 w-5" :class="props.isCollapsed ? '' : 'mr-3'" />
              <span v-if="!props.isCollapsed">{{ item.name }}</span>
            </a>
          </nav>
        </div>
      </div>
    </div>

    <!-- Mobile hamburger removed per design: keep + button only -->
  </div>
</template>