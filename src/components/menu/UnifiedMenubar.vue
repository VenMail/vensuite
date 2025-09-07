<script setup lang="ts">
import { computed, defineEmits, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileIcon,
  FolderIcon,
  SaveIcon,
  DownloadIcon,
  PrinterIcon,
  UndoIcon,
  RedoIcon,
  MessageCircleIcon,
  HelpCircleIcon,
  InfoIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  SortAscIcon,
  FilterIcon,
  GroupIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RefreshCcwIcon,
} from 'lucide-vue-next'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { useFileStore } from '@/store/files'

interface Collaborator { name: string; selection?: any; ts?: number }
interface Props {
  fileId?: string | null
  mode: 'sheet' | 'doc'
  collaborators?: Record<string, Collaborator>
}

const props = defineProps<Props>()
const emit = defineEmits(['save', 'toggleChat', 'export', 'undo', 'redo'])

const router = useRouter()
const fileStore = useFileStore()

const recentFiles = computed(() => {
  if (props.mode === 'sheet') return fileStore.recentFiles.filter((f) => f.file_type === 'xlsx')
  return fileStore.recentFiles.filter((f) => f.file_type === 'docx')
})

function handleNew() {
  if (props.mode === 'sheet') router.push('/sheets')
  else router.push('/docs')
}

function handleOpenDialog() {
  // Placeholder for an open dialog
}

function handleOpenRecent(id?: string) {
  if (!id) return
  if (props.mode === 'sheet') router.push(`/sheets/${id}`)
  else router.push(`/docs/${id}`)
}

function handleSave() {
  emit('save')
}

function handleExport(format: string) {
  emit('export', format)
}

function handleUndo() {
  emit('undo')
}

function handleRedo() {
  emit('redo')
}

function toggleChat() {
  emit('toggleChat')
}

// Deterministic color picker for user IDs
function colorForUser(uid: string) {
  const palette = ['#2563EB', '#9333EA', '#16A34A', '#DC2626', '#F59E0B', '#0EA5E9', '#7C3AED', '#059669', '#D97706', '#DB2777']
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i)
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}
</script>

<template>
  <Menubar class="border-none ml-0 pl-0 flex items-center gap-2 w-full">
    <!-- File Menu -->
    <MenubarMenu>
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNew">
          <FileIcon class="h-4 w-4 mr-2" />
          New
        </MenubarItem>
        <MenubarItem @click="handleOpenDialog">
          <FolderIcon class="h-4 w-4 mr-2" />
          Open
        </MenubarItem>
        <MenubarItem @click="handleSave">
          <SaveIcon class="h-4 w-4 mr-2" />
          Save
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            Export As...
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem @click="handleExport('pdf')">PDF</MenubarItem>
            <MenubarItem v-if="mode==='sheet'" @click="handleExport('xlsx')">XLSX</MenubarItem>
            <MenubarItem v-if="mode==='sheet'" @click="handleExport('csv')">CSV</MenubarItem>
            <MenubarItem @click="handleExport('html')">HTML</MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSeparator />
        <MenubarItem>
          <PrinterIcon class="h-4 w-4 mr-2" />
          Print
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            Recent Files...
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem v-for="file in recentFiles" :key="file.id || file.title" @click="handleOpenRecent(file.id)">
              {{ file.title }}
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
      </MenubarContent>
    </MenubarMenu>

    <!-- Edit Menu -->
    <MenubarMenu>
      <MenubarTrigger>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleUndo">
          <UndoIcon class="h-4 w-4 mr-2" />
          Undo
        </MenubarItem>
        <MenubarItem @click="handleRedo">
          <RedoIcon class="h-4 w-4 mr-2" />
          Redo
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Sheet-only menus -->
    <template v-if="mode==='sheet'">
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <ZoomInIcon class="h-4 w-4 mr-2" />
            Zoom In
          </MenubarItem>
          <MenubarItem>
            <ZoomOutIcon class="h-4 w-4 mr-2" />
            Zoom Out
          </MenubarItem>
          <MenubarItem>
            <RefreshCcwIcon class="h-4 w-4 mr-2" />
            Reset Zoom
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Format</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <BoldIcon class="h-4 w-4 mr-2" />
            Bold
          </MenubarItem>
          <MenubarItem>
            <ItalicIcon class="h-4 w-4 mr-2" />
            Italic
          </MenubarItem>
          <MenubarItem>
            <UnderlineIcon class="h-4 w-4 mr-2" />
            Underline
          </MenubarItem>
          <MenubarItem>
            <StrikethroughIcon class="h-4 w-4 mr-2" />
            Strikethrough
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Data</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <SortAscIcon class="h-4 w-4 mr-2" />
            Sort
          </MenubarItem>
          <MenubarItem>
            <FilterIcon class="h-4 w-4 mr-2" />
            Filter
          </MenubarItem>
          <MenubarItem>
            <GroupIcon class="h-4 w-4 mr-2" />
            Group
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </template>

    <!-- Collaboration/Help -->
    <MenubarMenu>
      <MenubarTrigger class="text-sm font-medium text-gray-700 hover:text-gray-900">Collaboration</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="toggleChat">
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          Toggle Chat
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <MenubarMenu>
      <MenubarTrigger>Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          Help Center
        </MenubarItem>
        <MenubarItem>
          <InfoIcon class="h-4 w-4 mr-2" />
          About
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <!-- Right aligned collaborator badges -->
    <div class="ml-auto flex items-center gap-2 pr-2" v-if="props.collaborators && Object.keys(props.collaborators).length">
      <div v-for="(c, uid) in props.collaborators" :key="uid" class="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-full px-2 py-1 shadow text-xs">
        <div class="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center" :style="{ backgroundColor: colorForUser(uid) }">
          {{ (c.name || '?').charAt(0).toUpperCase() }}
        </div>
        <span class="max-w-[120px] truncate" :title="c.name">{{ c.name }}</span>
      </div>
    </div>
  </Menubar>
</template>
