<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import axios from 'axios'
import { SearchIcon, Grid, List, Plus, Settings, ChevronDown } from 'lucide-vue-next'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import AppMenu from './AppMenu.vue'
import Input from './components/ui/input/Input.vue'
import Button from './components/ui/button/Button.vue'
import Separator from './components/ui/separator/Separator.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import router from './main'
import FileIcon from './components/FileIcon.vue'

const isAuthenticated = ref(false)
const searchValue = ref('')
const viewMode = ref('grid')
const authURL = 'http://localhost:8001/auth/oauth'

interface FileData {
  id: string
  name: string
  file_type?: string
  file_size?: string
  date?: string
}

const files = ref<FileData[]>([])
const selectedFile = ref<string | null>(null)
const storageKey = 'VENX_RecentFiles'

const templates = {
  'Documents': [
    { name: 'Blank Document', icon: defaultIcons.IconMicrosoftWord },
    { name: 'Resume', icon: defaultIcons.IconMicrosoftWord },
    { name: 'Letter', icon: defaultIcons.IconMicrosoftWord },
  ],
  'Spreadsheets': [
    { name: 'Blank Spreadsheet', icon: defaultIcons.IconMicrosoftExcel },
    { name: 'Budget', icon: defaultIcons.IconMicrosoftExcel },
    { name: 'Invoice', icon: defaultIcons.IconMicrosoftExcel },
  ],
}

function loginWithVenmail() {
  const redirectUri = encodeURIComponent(
    `${window.location.protocol}//${window.location.host}/oauth/callback`,
  )
  window.location.href = `${authURL}?redirect_uri=${redirectUri}`
}

async function fetchFiles() {
  try {
    const response = await axios.get('/api/files')
    if (response.data.files && response.data.files.length > 0) {
      files.value = response.data.files
      localStorage.setItem(storageKey, JSON.stringify(files.value))
    } else {
      loadRecentFiles()
    }
  } catch (error) {
    console.error('Error fetching files:', error)
  }
}

function loadRecentFiles() {
  const storedFiles = localStorage.getItem(storageKey)
  if (storedFiles) {
    files.value = JSON.parse(storedFiles)
  }
}

onMounted(() => {
  const token = localStorage.getItem('venAuthToken')
  if (token) {
    isAuthenticated.value = true
    fetchFiles()
  } else {
    isAuthenticated.value = false
  }
  document.title = 'Home'
})

function openFile(id: string, fileType?: string) {
  switch (fileType) {
    default:
      router.push(`sheets/${id}`)
  }
}

function createNewFile(type: string, template?: string) {
  if (type === 'spreadsheet') {
    router.push(template ? '/sheets/t/'+template : "sheets")
  } else if (type === 'document') {
    router.push(template ? '/docs/t/'+template : "/docs")
  }
}

const recentFiles = computed(() => files.value.slice(0, 5))

const renderFileItem = (file: FileData) => {
  if (viewMode.value === 'grid') {
    return h('div', {
      key: file.id,
      class: `p-4 rounded-lg bg-white bg-opacity-60 backdrop-blur-sm border border-gray-200 cursor-pointer transition-all duration-200 ${
        selectedFile.value === file.id ? 'ring-2 ring-blue-500' : ''
      }`,
      onClick: () => selectedFile.value = file.id
    }, [
      h('div', { class: 'flex items-center justify-between mb-2' }, [
        h(FileIcon, { fileType: file.file_type }),
        h(Button, { variant: 'ghost', size: 'icon' }, () => [
          h(DropdownMenu, {}, {
            default: () => [
              h(DropdownMenuTrigger, {}, () => h(Settings, { class: 'h-4 w-4' })),
              h(DropdownMenuContent, {}, () => [
                h(DropdownMenuItem, { onClick: () => openFile(file.id, file.file_type) }, () => 'Open'),
                h(DropdownMenuItem, {}, () => 'Rename'),
                h(DropdownMenuItem, {}, () => 'Delete')
              ])
            ]
          })
        ])
      ]),
      h('h3', { class: 'font-medium text-sm truncate' }, file.name),
      h('p', { class: 'text-xs text-gray-500' }, file.date)
    ])
  } else {
    return h('div', {
      key: file.id,
      class: `flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
        selectedFile.value === file.id ? 'bg-blue-50' : ''
      }`,
      onClick: () => selectedFile.value = file.id
    }, [
      h(FileIcon, { fileType: file.file_type }),
      h('div', { class: 'ml-3 flex-grow' }, [
        h('h3', { class: 'font-medium text-sm' }, file.name),
        h('p', { class: 'text-xs text-gray-500' }, file.date)
      ]),
      h('div', { class: 'text-sm text-gray-500' }, file.file_size),
      h(Button, { variant: 'ghost', size: 'icon' }, () => [
        h(DropdownMenu, {}, {
          default: () => [
            h(DropdownMenuTrigger, {}, () => h(Settings, { class: 'h-4 w-4' })),
            h(DropdownMenuContent, {}, () => [
              h(DropdownMenuItem, { onClick: () => openFile(file.id, file.file_type) }, () => 'Open'),
              h(DropdownMenuItem, {}, () => 'Rename'),
              h(DropdownMenuItem, {}, () => 'Delete')
            ])
          ]
        })
      ])
    ])
  }
}
</script>

<template>
  <div v-if="isAuthenticated" class="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900">
    <!-- FileMenu -->
    <AppMenu />

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <div class="bg-white bg-opacity-50 backdrop-blur-lg border-b border-gray-200 p-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <Button variant="outline" size="icon">
            <ChevronDown class="h-4 w-4" />
          </Button>
          <div class="relative">
            <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              v-model="searchValue"
              placeholder="Search files..."
              class="pl-8 w-64"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus class="mr-2 h-4 w-4" />
                New from Template
              </Button>
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
                    <Button
                      v-for="template in items"
                      :key="template.name"
                      variant="outline"
                      class="h-24 flex flex-col items-center justify-center"
                      @click="createNewFile(category.toLowerCase())"
                    >
                      <component :is="template.icon" class="w-8 h-8" />
                      <span class="mt-2 text-sm">{{ template.name }}</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <component :is="viewMode === 'grid' ? Grid : List" class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="viewMode = 'grid'">
                <Grid class="mr-2 h-4 w-4" />
                Grid View
              </DropdownMenuItem>
              <DropdownMenuItem @click="viewMode = 'list'">
                <List class="mr-2 h-4 w-4" />
                List View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon">
            <Settings class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- File browser -->
      <div class="flex-1 p-6 overflow-hidden">
        <Tabs default-value="all" class="w-full">
          <TabsList>
            <TabsTrigger value="all">All Files</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
          <TabsContent value="all" class="mt-4">
            <ScrollArea class="h-[calc(100vh-200px)]">
              <div v-if="files.length > 0" :class="{ 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4': viewMode === 'grid', 'space-y-2': viewMode === 'list' }">
                <template v-for="file in files" :key="file.id">
                  <component :is="renderFileItem(file)" />
                </template>
              </div>
              <div v-else class="flex flex-col items-center justify-center h-full">
                <h3 class="text-2xl font-bold tracking-tight mb-2">You have not uploaded any files yet</h3>
                <p class="text-sm text-muted-foreground mb-4">You can manage your documents and spreadsheets from Venmail.</p>
                <Button>Upload File</Button>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="recent" class="mt-4">
            <ScrollArea class="h-[calc(100vh-200px)]">
              <div :class="{ 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4': viewMode === 'grid', 'space-y-2': viewMode === 'list' }">
                <template v-for="file in recentFiles" :key="file.id">
                  <component :is="renderFileItem(file)" />
                </template>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </div>
  <div v-else class="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
    <div class="bg-white bg-opacity-50 backdrop-blur-lg p-8 rounded-lg shadow-xl">
      <h2 class="text-2xl font-bold mb-4 text-center">Welcome to Venmail File Manager</h2>
      <Button class="w-full" @click="loginWithVenmail">
        Login with Venmail
      </Button>
      <p class="text-sm text-muted-foreground mt-4 text-center">
        Login to manage your documents and spreadsheets on Venmail.
      </p>
    </div>
  </div>
</template>