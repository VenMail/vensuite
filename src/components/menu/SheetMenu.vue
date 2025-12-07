<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, watchEffect } from 'vue'
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
import { Univer } from '@univerjs/core'
import { FUniver } from '@univerjs/core/facade'
// Ensure Facade implementations are mounted for used plugins
import '@univerjs/ui/facade'
import '@univerjs/docs-ui/facade'
import '@univerjs/sheets-ui/facade'
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
  coreRef?: InstanceType<typeof Univer> | null
}

const fileStore = useFileStore()
const props = defineProps<Props>()
const emit = defineEmits(['updateData', 'toggleChat', 'save'])
const router = useRouter()

let facadeAPI: FUniver | null = null
const exportService = new ExportService()

onMounted(() => {
  watchEffect(() => {
    if (props.coreRef && !facadeAPI) {
      facadeAPI = FUniver.newAPI(props.coreRef)
    }
  })
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
  if (!facadeAPI) {
    console.error('FUniver facade API not available')
    return
  }

  try {
    const exportOptions: IExportOptions = {
      format: format as ExportFormat,
      filename: `sheet-export-${Date.now()}.${format}`,
      includeStyles: true,
      includeFormulas: true,
      includeHeaders: true,
      pdfEngine: format === 'pdf' ? PDFEngine.JSPDF : undefined
    }

    await exportService.export(facadeAPI, exportOptions)
  } catch (error) {
    console.error(`Export failed for format ${format}:`, error)
  }
}

function undo() {
  if (facadeAPI) {
    facadeAPI.undo()
  }
}

function redo() {
  if (facadeAPI) {
    facadeAPI.redo()
  }
}

function cut() {
  if (facadeAPI) {
    // todo: copy html to clipboard then clear
    facadeAPI.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.generateHTML()
    facadeAPI.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.setValues([])
  }
}

async function copy() {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    const html = await range?.generateHTML()

    if (html) {
      navigator.clipboard.writeText(html)
    }
  }
}

async function paste() {
  if (facadeAPI) {
    const text = await navigator.clipboard.readText()
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    range?.setValues(text)
  }
}

function deleteSelected() {
  if (facadeAPI) {
    // todo: copy html to clipboard then clear
    facadeAPI.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.setValues([])
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
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    range?.setFontWeight('bold')
  }
}

function formatItalic() {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    range?.setFontStyle('italic')
  }
}

function formatUnderline() {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    range?.setFontLine('underline')
  }
}

function formatStrikethrough() {
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    range?.setFontLine('line-through')
  }
}

async function sort(ascending = true) {
  // todo: transfer formula/attributes of old cells to the new cells
  // todo: adding rich sort where we sort the entire rows based on the column being sorted
  if (facadeAPI) {
    const workbook = facadeAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const range = worksheet?.getSelection()?.getActiveRange()

    if (!range) {
      console.error('No active range selected')
      return
    }

    // Gather the cell data
    const cellData: (ICellData | null)[][] = []
    range.forEach((row: number, col: number, cell: ICellData) => {
      if (!cellData[row]) {
        cellData[row] = []
      }
      cellData[row][col] = cell
    })

    // Filter out rows that are completely null
    const nonNullRows = cellData.filter(row => row.some(cell => cell !== null))

    // Convert cellData to an array of arrays of values
    const values = nonNullRows.map(row => row.map(cell => cell?.v || null))

    // Determine which columns are non-empty
    const nonEmptyColumns = values[0].map((_, colIndex) =>
      values.some(row => row[colIndex] !== null),
    )

    // Filter out the empty columns
    const filteredValues = values.map(row =>
      row.filter((_, colIndex) => nonEmptyColumns[colIndex]),
    )

    // Sort the values considering null
    filteredValues.sort((a, b) => {
      for (let i = 0; i < a.length; i++) {
        const valA = a[i]
        const valB = b[i]

        if (valA === null && valB !== null)
          return ascending ? 1 : -1
        if (valA !== null && valB === null)
          return ascending ? -1 : 1
        if (valA === null && valB === null)
          continue

        if (valA! < valB!)
          return ascending ? -1 : 1
        if (valA! > valB!)
          return ascending ? 1 : -1
      }
      return 0
    })

    // Map sorted values back to cellData format
    const sortedCellData = filteredValues.map(rowValues =>
      rowValues.map(value => ({ v: value })),
    )
    console.log('sortedCells', sortedCellData)

    // Set the sorted values back into the range
    range.setValues(sortedCellData)
  }
}

function filter() {
  // todo: whatodo
}

function group() {
  if (facadeAPI) {
    // todo: merge cell?
  }
}

function spellCheck() {
  if (facadeAPI) {
    const data = props.univerRef?.getData()
    if (data) {
      const text = extractTextFromWorkbook(data)
      performSpellCheck(text)
    }
  }
}

function wordCount() {
  if (facadeAPI) {
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
          {{$t('Commons.button.date')}}
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            Export As...
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
            Recent Files...
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
          Paste
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
