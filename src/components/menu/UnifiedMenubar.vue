<script setup lang="ts">
import { computed } from 'vue'
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
  PlugIcon,
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
const emit = defineEmits([
  'save',
  'toggleChat',
  'export',
  'open-dialog',
  'open-integrations',
  'undo',
  'redo',
  'toggle-page-layout',
  'toggle-page-numbers',
  'toggle-formatting-marks',
  // sheet-specific actions
  'format-bold',
  'format-italic',
  'format-underline',
  'format-strike',
  'view-zoom-in',
  'view-zoom-out',
  'view-zoom-reset',
  'data-sort',
  'data-filter',
  'data-group',
  'print',
  'navigate-to-collaborator',
])

const router = useRouter()
const fileStore = useFileStore()

const recentFiles = computed(() => {
  if (props.mode === 'sheet') return fileStore.recentFiles.filter((f) => f.file_type === 'xlsx')
  return fileStore.recentFiles.filter((f) => f.file_type === 'docx')
})

async function handleNew() {
  try {
    if (props.mode === 'sheet') {
      const newSheet = await fileStore.createNewDocument('xlsx', 'New Spreadsheet')
      if (newSheet?.id) {
        await router.push(`/sheets/${newSheet.id}`)
      }
    } else {
      const newDoc = await fileStore.createNewDocument('docx', 'New Document')
      if (newDoc?.id) {
        await router.push(`/docs/${newDoc.id}`)
      }
    }
  } catch (error) {
    console.error('Failed to create new file from menubar:', error)
  }
}

function handleOpenDialog() {
  emit('open-dialog')
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

function openIntegrations() {
  emit('open-integrations')
}

function handleCollaboratorClick(uid: string) {
  emit('navigate-to-collaborator', uid)
}

// Deterministic color picker for user IDs
function colorForUser(uid: string) {
  const palette = ['#2563EB', '#9333EA', '#16A34A', '#DC2626', '#F59E0B', '#0EA5E9', '#7C3AED', '#059669', '#D97706', '#DB2777']
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i)
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}

function toA1(rowIndex: number, colIndex: number) {
  const row = rowIndex + 1
  let col = ''
  let n = colIndex
  while (n >= 0) {
    col = String.fromCharCode((n % 26) + 65) + col
    n = Math.floor(n / 26) - 1
  }
  return `${col}${row}`
}

function formatSelectionLabel(selection: any): string {
  try {
    const range = (selection as any)?.range || (selection as any)?.primaryRange || selection
    const data = (range as any)?.rangeData || range
    const startRow = (data as any)?.startRow ?? (data as any)?.startRowIndex ?? (data as any)?.rowStart
    const startCol = (data as any)?.startColumn ?? (data as any)?.startColumnIndex ?? (data as any)?.colStart
    if (typeof startRow === 'number' && typeof startCol === 'number') {
      return `Cell ${toA1(startRow, startCol)}`
    }
  } catch {}
  return 'Active'
}
</script>

<template>
  <Menubar class="border-none ml-0 pl-0 flex items-center gap-2 w-full rounded-none">
    <!-- File Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.file')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNew">
          <FileIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.view')}}
        </MenubarItem>
        <MenubarItem @click="handleOpenDialog">
          <FolderIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.open')}}
        </MenubarItem>
        <MenubarItem @click="handleSave">
          <SaveIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.save')}}
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            {{$t('Components.Menu.UnifiedMenubar.text.export_as')}}
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem @click="handleExport('pdf')">PDF</MenubarItem>
            <MenubarItem v-if="mode==='sheet'" @click="handleExport('xlsx')">XLSX</MenubarItem>
            <MenubarItem v-if="mode==='sheet'" @click="handleExport('csv')">CSV</MenubarItem>
            <MenubarItem @click="handleExport('html')">HTML</MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSeparator />
        <MenubarItem @click="emit('print')">
          <PrinterIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.print')}}
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            {{ $t('Commons.heading.recent_files') }}
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
      <MenubarTrigger>{{$t('Commons.heading.edit')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleUndo">
          <UndoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.undo')}}
        </MenubarItem>
        <MenubarItem @click="handleRedo">
          <RedoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.redo')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Sheet-only menus -->
    <template v-if="mode==='sheet'">
      <MenubarMenu>
        <MenubarTrigger>{{$t('Commons.text.view')}}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="emit('view-zoom-in')">
            <ZoomInIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.zoom_in')}}
          </MenubarItem>
          <MenubarItem @click="emit('view-zoom-out')">
            <ZoomOutIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.zoom_out')}}
          </MenubarItem>
          <MenubarItem @click="emit('view-zoom-reset')">
            <RefreshCcwIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.reset_zoom')}}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Format</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="emit('format-bold')">
            <BoldIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.bold')}}
          </MenubarItem>
          <MenubarItem @click="emit('format-italic')">
            <ItalicIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.italic')}}
          </MenubarItem>
          <MenubarItem @click="emit('format-underline')">
            <UnderlineIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.underline')}}
          </MenubarItem>
          <MenubarItem @click="emit('format-strike')">
            <StrikethroughIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.strikethrough')}}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>{{$t('Commons.text.date')}}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="emit('data-sort')">
            <SortAscIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.button.sort')}}
          </MenubarItem>
          <MenubarItem @click="emit('data-filter')">
            <FilterIcon class="h-4 w-4 mr-2" />
            {{$t('Commons.text.filter')}}
          </MenubarItem>
          <MenubarItem @click="emit('data-group')">
            <GroupIcon class="h-4 w-4 mr-2" />
            Group
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>{{$t('Commons.button.integrations')}}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="openIntegrations">
            <PlugIcon class="h-4 w-4 mr-2" />
            {{$t('Menu.UnifiedMenubar.text.integrate_this_sheet')}}
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </template>

    <!-- Doc-only Page menu -->
    <template v-else>
      <MenubarMenu>
        <MenubarTrigger>Page</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="emit('toggle-page-layout')">
            {{$t('Commons.text.page_layout')}}
          </MenubarItem>
          <MenubarItem @click="emit('toggle-page-numbers')">
            {{$t('Commons.text.page_numbers')}}
          </MenubarItem>
          <MenubarItem @click="emit('toggle-formatting-marks')">
            Formatting Marks
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </template>

    <!-- Collaboration/Help -->
    <MenubarMenu>
      <MenubarTrigger class="text-sm font-medium text-gray-700 hover:text-gray-900">{{$t('Commons.text.collaboration')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="toggleChat">
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.toggle_chat')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.help')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.help_center')}}
        </MenubarItem>
        <MenubarItem>
          <InfoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.amount')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <!-- Right aligned collaborator badges -->
    <div class="ml-auto flex items-center gap-2 pr-2" v-if="props.collaborators && Object.keys(props.collaborators).length">
      <button
        v-for="(c, uid) in props.collaborators"
        :key="uid"
        type="button"
        class="flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-full px-2 py-1 shadow text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="handleCollaboratorClick(uid as string)"
        :title="`Click to go to ${c.name}'s position`"
      >
        <div class="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center" :style="{ backgroundColor: colorForUser(uid as string) }">
          {{ (c.name || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="flex flex-col items-start">
          <span class="max-w-[120px] truncate" :title="c.name">{{ c.name }}</span>
          <span v-if="c.selection" class="text-[10px] text-gray-500 dark:text-gray-400">
            {{ formatSelectionLabel(c.selection) }}
          </span>
        </div>
      </button>
    </div>
  </Menubar>
</template>
