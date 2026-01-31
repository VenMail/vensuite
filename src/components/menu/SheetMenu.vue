<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  BoldIcon,
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  FileIcon,
  FilterIcon,
  FolderIcon,
  GroupIcon,
  HelpCircleIcon,
  InfoIcon,
  ItalicIcon,
  MessageCircleIcon,
  PrinterIcon,
  RedoIcon,
  RefreshCcwIcon,
  SaveIcon,
  ScissorsIcon,
  SortAscIcon,
  SpellCheckIcon,
  StrikethroughIcon,
  TrashIcon,
  UnderlineIcon,
  UndoIcon,
  UsersIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-vue-next'
import type { ICellData, IWorkbookData } from '@univerjs/core'
import { useRouter } from 'vue-router'
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data'
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
import UniverSheet from './components/UniverSheet.vue'
import { useFileStore } from '@/store/files'
import { ExportService, ExportFormat, PDFEngine, type IExportOptions } from '@/plugins/ExportPlugin'


interface Props {
  fileId: string | null | undefined
  univerRef: InstanceType<typeof UniverSheet> | null
}

const fileStore = useFileStore()
const props = defineProps<Props>()
const emit = defineEmits(['updateData', 'toggleChat', 'save'])
const router = useRouter()

const exportService = new ExportService()

// Helper to get the active workbook from the new API
function getActiveWorkbook() {
  return props.univerRef?.workbook || null
}

// Helper to get the univer instance
function getUniverInstance() {
  return props.univerRef?.univer || null
}

onMounted(() => {
  console.log("pid", props.fileId)
})

const recentFiles = computed(() => {
  return fileStore.recentFiles.filter((f) => f.file_type == "xlsx")
})


async function loadData(id: string) {
  const savedData = await fileStore.loadDocument(id, "xlsx")
  console.log('saved', savedData)
  if (savedData && savedData.content) {
    return JSON.parse(savedData.content)
  }
  return DEFAULT_WORKBOOK_DATA
}

function handleNew() {
  router.push('/sheets')
}

function handleLoad(id?: string) {
  if (!id) return;
  const data = loadData(id)
  emit('updateData', data)
}


function toggleChat() {
  emit('toggleChat')
}

function handleLoadDialog() {
  // Implement your load dialog logic here
}

function handleSave() {
  emit("save")
}

async function exportAs(format: string) {
  const workbook = getActiveWorkbook()
  if (!workbook) {
    console.error('Workbook not available')
    return
  }

  try {
    const exportOptions: IExportOptions = {
      format: format as ExportFormat,
      filename: `spreadsheet.${format}`,
      pdfEngine: format === 'pdf' ? PDFEngine.JSPDF : undefined
    }

    await exportService.export(workbook, exportOptions)
  } catch (error) {
    console.error(`Export failed for format ${format}:`, error)
  }
}

function undo() {
  const univer = getUniverInstance()
  if (univer) {
    // Note: The new plugin approach doesn't have direct undo/redo methods
    // This would need to be implemented via command system
    console.log('Undo functionality needs to be implemented for plugin approach')
  }
}

function redo() {
  const univer = getUniverInstance()
  if (univer) {
    // Note: The new plugin approach doesn't have direct undo/redo methods
    // This would need to be implemented via command system
    console.log('Redo functionality needs to be implemented for plugin approach')
  }
}

function cut() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Cut functionality needs to be implemented for plugin approach')
  }
}

async function copy() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Copy functionality needs to be implemented for plugin approach')
  }
}

async function paste() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Paste functionality needs to be implemented for plugin approach')
  }
}

function deleteSelected() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Delete functionality needs to be implemented for plugin approach')
  }
}

let scale = 1 // Initial scale value

function zoomIn() {
  scale += 0.1 // Increase the scale
  document.body.style.transform = `scale(${scale})`
  document.body.style.transformOrigin = '0 0' // Ensure scaling happens from the top-left corner
}

function zoomOut() {
  scale = Math.max(0.1, scale - 0.1) // Decrease the scale, but prevent it from going below 0.1
  document.body.style.transform = `scale(${scale})`
  document.body.style.transformOrigin = '0 0'
}

function resetZoom() {
  scale = 1 // reset
  document.body.style.transform = `scale(${scale})`
  document.body.style.transformOrigin = '0 0'
}

function formatBold() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Bold formatting needs to be implemented for plugin approach')
  }
}

function formatItalic() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Italic formatting needs to be implemented for plugin approach')
  }
}

function formatUnderline() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Underline formatting needs to be implemented for plugin approach')
  }
}

function formatStrikethrough() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: These functions need to be adapted for the plugin approach
    console.log('Strikethrough formatting needs to be implemented for plugin approach')
  }
}

async function sort(ascending = true) {
  // todo: transfer formula/attributes of old cells to the new cells
  // todo: adding rich sort where we sort the entire rows based on the column being sorted
  const workbook = getActiveWorkbook()
  if (workbook) {
    // Note: This function needs to be adapted for the plugin approach
    console.log('Sort functionality needs to be implemented for plugin approach')
  }
}

function filter() {
  // todo: whatodo
  console.log('Filter functionality needs to be implemented for plugin approach')
}

function group() {
  const workbook = getActiveWorkbook()
  if (workbook) {
    // todo: merge cell?
    console.log('Group functionality needs to be implemented for plugin approach')
  }
}

function spellCheck() {
  if (props.univerRef) {
    const data = props.univerRef?.getData()
    if (data) {
      const text = extractTextFromWorkbook(data)
      performSpellCheck(text)
    }
  }
}

function wordCount() {
  if (props.univerRef) {
    const data = props.univerRef?.getData()
    if (data) {
      const { characterCount, wordCount } = countCharactersAndWords(data)
      console.log(`Character Count: ${characterCount}\nWord Count: ${wordCount}`)
    }
  }
}

function countCharactersAndWords(data: IWorkbookData) {
  let characterCount = 0
  let wordCount = 0

  for (const sheetKey in data.sheets) {
    if (data.sheets.hasOwnProperty(sheetKey)) {
      const sheet = data.sheets[sheetKey]
      const cellData = sheet.cellData as (ICellData | null)[][]
      cellData.forEach((row) => {
        row.forEach((cell) => {
          if (cell && cell.v) {
            const text = cell.v.toString()
            characterCount += text.length
            wordCount += text.trim().split(/\s+/).length
          }
        })
      })
    }
  }

  return { characterCount, wordCount }
}

function extractTextFromWorkbook(data: IWorkbookData) {
  let text = ''

  for (const sheetKey in data.sheets) {
    if (data.sheets.hasOwnProperty(sheetKey)) {
      const sheet = data.sheets[sheetKey]
      const cellData = sheet.cellData as (ICellData | null)[][]
      cellData.forEach((row) => {
        row.forEach((cell) => {
          if (cell && cell.v) {
            text += `${cell.v.toString()} `
          }
        })
      })
    }
  }

  return text.trim()
}

function performSpellCheck(text: string) {
  const spellcheckDiv = document.createElement('div')
  spellcheckDiv.contentEditable = 'true'
  spellcheckDiv.style.display = 'none'
  document.body.appendChild(spellcheckDiv)

  spellcheckDiv.innerText = text

  setTimeout(() => {
    const misspelledWords: string[] = []

    const range = document.createRange()
    range.selectNodeContents(spellcheckDiv)
    const textNodes = range.cloneContents().querySelectorAll('span')

    textNodes.forEach((node) => {
      if (node.classList.contains('misspelled')) {
        misspelledWords.push(node.innerText)
      }
    })

    document.body.removeChild(spellcheckDiv)

    if (misspelledWords.length) {
      console.log(`Misspelled words: ${misspelledWords.join(', ')}`)
    }
    else {
      console.log('No misspelled words found.')
    }
  }, 100)
}

function openHelpCenter() {
  // Open help center logic
}

function sendFeedback() {
  // Send feedback logic
}

function about() {
  // About logic
}
</script>

<template>
  <Menubar class="border-none ml-0 pl-0">
    <!-- File Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.file')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNew">
          <FileIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.view')}}
        </MenubarItem>
        <MenubarItem @click="handleLoadDialog">
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
            {{$t('Components.Menu.SheetMenu.text.export_as')}}
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem @click="exportAs('csv')">
              CSV
            </MenubarItem>
            <MenubarItem @click="exportAs('xlsx')">
              XLSX
            </MenubarItem>
            <MenubarItem @click="exportAs('pdf')">
              PDF
            </MenubarItem>
            <MenubarItem @click="exportAs('html')">
              HTML
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSeparator />
        <MenubarItem>
          <PrinterIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.print')}}
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            {{ $t('Commons.heading.recent_files') }}
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem v-for="file in recentFiles" :key="file.id || file.title" @click="handleLoad(file.id)">
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
        <MenubarItem @click="undo">
          <UndoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.undo')}}
        </MenubarItem>
        <MenubarItem @click="redo">
          <RedoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.redo')}}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="cut">
          <ScissorsIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.auto')}}
        </MenubarItem>
        <MenubarItem @click="copy">
          <CopyIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.copy')}}
        </MenubarItem>
        <MenubarItem @click="paste">
          <ClipboardPasteIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.paste')}}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="deleteSelected">
          <TrashIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.delete')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- View Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.view')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="zoomIn">
          <ZoomInIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.zoom_in')}}
        </MenubarItem>
        <MenubarItem @click="zoomOut">
          <ZoomOutIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.zoom_out')}}
        </MenubarItem>
        <MenubarItem @click="resetZoom">
          <RefreshCcwIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.reset_zoom')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Format Menu -->
    <MenubarMenu>
      <MenubarTrigger>Format</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="formatBold">
          <BoldIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.bold')}}
        </MenubarItem>
        <MenubarItem @click="formatItalic">
          <ItalicIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.italic')}}
        </MenubarItem>
        <MenubarItem @click="formatUnderline">
          <UnderlineIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.underline')}}
        </MenubarItem>
        <MenubarItem @click="formatStrikethrough">
          <StrikethroughIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.strikethrough')}}
        </MenubarItem>
        <!-- Add more formatting options here -->
      </MenubarContent>
    </MenubarMenu>

    <!-- Data Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.date')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="sort">
          <SortAscIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.button.sort')}}
        </MenubarItem>
        <MenubarItem @click="filter">
          <FilterIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.filter')}}
        </MenubarItem>
        <MenubarItem @click="group">
          <GroupIcon class="h-4 w-4 mr-2" />
          Group
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Tools Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.tools')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="spellCheck">
          <SpellCheckIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.spell_check')}}
        </MenubarItem>
        <MenubarItem @click="wordCount">
          <EllipsisIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.word_count')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger class="text-sm font-medium text-gray-700 hover:text-gray-900">{{$t('Commons.text.collaboration')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="toggleChat">
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.toggle_chat')}}
        </MenubarItem>
        <MenubarItem>
          <UsersIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.view_collaborators')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <!-- Help Menu -->
    <MenubarMenu>
      <MenubarTrigger>{{$t('Commons.text.help')}}</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="openHelpCenter">
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.help_center')}}
        </MenubarItem>
        <MenubarItem @click="sendFeedback">
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          Feedback
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="about">
          <InfoIcon class="h-4 w-4 mr-2" />
          {{$t('Commons.text.amount')}}
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
  <div ref="spellcheckDiv" contenteditable="true" style="display:none" />
</template>
