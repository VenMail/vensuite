<script setup lang="ts">
import { defineEmits, defineProps, onMounted, ref, watchEffect } from 'vue'
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
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-vue-next'
import { Univer } from '@univerjs/core'
import { FUniver } from '@univerjs/facade'
import type { ICellData, IWorkbookData } from '@univerjs/core'
import { useRouter } from 'vue-router'
import diff from 'microdiff'
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


interface FileData {
  id: string
  name: string
  file_type?: string
  file_size?: string
}

interface Props {
  univerRef: InstanceType<typeof UniverSheet> | null
  coreRef: InstanceType<typeof Univer> | null
}

const props = defineProps<Props>()
const emit = defineEmits(['updateData'])
const recentFiles = ref<FileData[]>([])
const storageKey = 'VENX_RecentFiles'
const router = useRouter()

let facadeAPI: FUniver | null = null
let disposable = null

onMounted(() => {
  watchEffect(() => {
    if (props.coreRef && !facadeAPI) {
      facadeAPI = FUniver.newAPI(props.coreRef)
      disposable = facadeAPI.onBeforeCommandExecute((command) => {
        console.log('logging', command)
        // custom preprocessing logic before the command is executed
      })
    }
  })

  loadRecentFiles()
})

function saveRecentFiles(files: FileData[]) {
  localStorage.setItem(storageKey, JSON.stringify(files))
}

function loadRecentFiles() {
  const storedFiles = localStorage.getItem(storageKey)
  if (storedFiles) {
    recentFiles.value = JSON.parse(storedFiles)
  }
}

function updateRecentFiles(file: FileData) {
  const existingFileIndex = recentFiles.value.findIndex(f => f.id === file.id)
  if (existingFileIndex !== -1) {
    recentFiles.value.splice(existingFileIndex, 1)
  }
  recentFiles.value.unshift(file)
  if (recentFiles.value.length > 10) {
    recentFiles.value.pop()
  }
  saveRecentFiles(recentFiles.value)
}

// Function to send changes to the backend
async function sendChangesToBackend(changes: any) {
  try {
    await fetch('https://app.venmail.io/api/v1/office/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(changes),
    })
    console.log('Changes sent to the backend')
  }
  catch (error) {
    console.error('Failed to send changes to the backend', error)
  }
}

function saveData(data: IWorkbookData) {
  // todo: we probably want to use our own custom ID
  // also show modal to set spreadsheet name
  const oldData = localStorage.getItem(data.id)
  if (oldData && props.univerRef) {
    const oldValue = JSON.parse(oldData)
    const differences = diff(data, oldValue)
    sendChangesToBackend(JSON.stringify(differences))
    console.log('diff', differences)
  }

  localStorage.setItem(data.id, JSON.stringify(data))
  console.log('saved.. ', data.id)
  router.replace({ path: `/sheets/${data.id}` })

  updateRecentFiles({ id: data.id, name: data.name || 'New Spreadsheet', file_type: "application/vnd.ms-excel" })
}

function loadData(KEY: string) {
  const savedData = localStorage.getItem(KEY)
  return savedData ? JSON.parse(savedData) : DEFAULT_WORKBOOK_DATA
}

function handleNew() {
  window.location.href = '/sheets'
}

function handleLoad(id: string) {
  const data = loadData(id)
  emit('updateData', data)
}

function handleLoadDialog() {
  // Implement your load dialog logic here
}

function handleSave() {
  const univerSheetInstance = props.univerRef
  if (univerSheetInstance) {
    const result = univerSheetInstance.getData()
    saveData(result)
  }
  else {
    console.error('UniverSheet reference is null')
  }
}

function exportAs(format: string) {
  if (facadeAPI) {
    facadeAPI.getActiveWorkbook()?.getSnapshot()
    switch (format) {

    }
    // todo send data to remote API
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
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNew">
          <FileIcon class="h-4 w-4 mr-2" />
          New
        </MenubarItem>
        <MenubarItem @click="handleLoadDialog">
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
          Print
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger>
            <DownloadIcon class="h-4 w-4 mr-2" />
            Recent Files...
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem v-for="file in recentFiles" :key="file.id" @click="handleLoad(file.id)">
              {{ file.name }}
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
      </MenubarContent>
    </MenubarMenu>

    <!-- Edit Menu -->
    <MenubarMenu>
      <MenubarTrigger>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="undo">
          <UndoIcon class="h-4 w-4 mr-2" />
          Undo
        </MenubarItem>
        <MenubarItem @click="redo">
          <RedoIcon class="h-4 w-4 mr-2" />
          Redo
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="cut">
          <ScissorsIcon class="h-4 w-4 mr-2" />
          Cut
        </MenubarItem>
        <MenubarItem @click="copy">
          <CopyIcon class="h-4 w-4 mr-2" />
          Copy
        </MenubarItem>
        <MenubarItem @click="paste">
          <ClipboardPasteIcon class="h-4 w-4 mr-2" />
          Paste
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="deleteSelected">
          <TrashIcon class="h-4 w-4 mr-2" />
          Delete
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- View Menu -->
    <MenubarMenu>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="zoomIn">
          <ZoomInIcon class="h-4 w-4 mr-2" />
          Zoom In
        </MenubarItem>
        <MenubarItem @click="zoomOut">
          <ZoomOutIcon class="h-4 w-4 mr-2" />
          Zoom Out
        </MenubarItem>
        <MenubarItem @click="resetZoom">
          <RefreshCcwIcon class="h-4 w-4 mr-2" />
          Reset Zoom
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Format Menu -->
    <MenubarMenu>
      <MenubarTrigger>Format</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="formatBold">
          <BoldIcon class="h-4 w-4 mr-2" />
          Bold
        </MenubarItem>
        <MenubarItem @click="formatItalic">
          <ItalicIcon class="h-4 w-4 mr-2" />
          Italic
        </MenubarItem>
        <MenubarItem @click="formatUnderline">
          <UnderlineIcon class="h-4 w-4 mr-2" />
          Underline
        </MenubarItem>
        <MenubarItem @click="formatStrikethrough">
          <StrikethroughIcon class="h-4 w-4 mr-2" />
          Strikethrough
        </MenubarItem>
        <!-- Add more formatting options here -->
      </MenubarContent>
    </MenubarMenu>

    <!-- Data Menu -->
    <MenubarMenu>
      <MenubarTrigger>Data</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="sort">
          <SortAscIcon class="h-4 w-4 mr-2" />
          Sort
        </MenubarItem>
        <MenubarItem @click="filter">
          <FilterIcon class="h-4 w-4 mr-2" />
          Filter
        </MenubarItem>
        <MenubarItem @click="group">
          <GroupIcon class="h-4 w-4 mr-2" />
          Group
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Tools Menu -->
    <MenubarMenu>
      <MenubarTrigger>Tools</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="spellCheck">
          <SpellCheckIcon class="h-4 w-4 mr-2" />
          Spell Check
        </MenubarItem>
        <MenubarItem @click="wordCount">
          <EllipsisIcon class="h-4 w-4 mr-2" />
          Word Count
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- Help Menu -->
    <MenubarMenu>
      <MenubarTrigger>Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="openHelpCenter">
          <HelpCircleIcon class="h-4 w-4 mr-2" />
          Help Center
        </MenubarItem>
        <MenubarItem @click="sendFeedback">
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          Feedback
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="about">
          <InfoIcon class="h-4 w-4 mr-2" />
          About
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
  <div ref="spellcheckDiv" contenteditable="true" style="display:none" />
</template>
