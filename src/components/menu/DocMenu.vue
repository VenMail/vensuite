<script setup lang="ts">
import { defineEmits, defineProps, onMounted, ref, watchEffect } from 'vue'
import {
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  FileIcon,
  FolderIcon,
  HelpCircleIcon,
  InfoIcon,
  MessageCircleIcon,
  PrinterIcon,
  RedoIcon,
  RefreshCcwIcon,
  SaveIcon,
  ScissorsIcon,
  SpellCheckIcon,
  TrashIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-vue-next'
import { FUniver } from '@univerjs/facade'
import type { IDocumentData } from '@univerjs/core'
import { useRouter } from 'vue-router'
import diff from 'microdiff'
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
import { DEFAULT_DOCUMENT_DATA } from '@/assets/default-document-data'

interface File {
  id: string
  name: string
}

interface Props {
  univerRef: InstanceType<typeof UniverDoc> | null
  coreRef: InstanceType<typeof Univer> | null
}

const props = defineProps<Props>()
const emit = defineEmits(['updateData'])
const recentFiles = ref<File[]>([])
const storageKey = 'VEND_RecentFiles'
const router = useRouter()

let facadeAPI: FUniver | null = null
let disposable

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

function saveRecentFiles(files: File[]) {
  localStorage.setItem(storageKey, JSON.stringify(files))
}

function loadRecentFiles() {
  const storedFiles = localStorage.getItem(storageKey)
  if (storedFiles) {
    recentFiles.value = JSON.parse(storedFiles)
  }
}

function updateRecentFiles(file: File) {
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

function saveData(data: IDocumentData) {
  // todo: we probably want to use our own custom ID
  // also show modal to set document name
  const oldData = localStorage.getItem(data.id)
  if (oldData && props.univerRef) {
    const oldValue = JSON.parse(oldData)
    if (oldValue.id == 'default_doc') {
      console.log('still old?')
    }
    const differences = diff(data, oldValue)
    sendChangesToBackend(JSON.stringify(differences))
    console.log(`diff - ${oldValue.id}`, differences)
  }

  localStorage.setItem(data.id, JSON.stringify(data))
  console.log(data)
  console.log('saved.. ', data.id)
  router.replace({ path: `/docs/${data.id}` })

  updateRecentFiles({ id: data.id, name: data.title || 'New Document' })
}

function loadData(KEY: string) {
  console.log('Whocalled')
  const savedData = localStorage.getItem(KEY)
  return savedData ? JSON.parse(savedData) : DEFAULT_DOCUMENT_DATA
}

function handleNew() {
  window.location.href = '/docs'
}

function handleLoad(id: string) {
  const data = loadData(id)
  emit('updateData', data)
}

function handleLoadDialog() {
  // Implement your load dialog logic here
}

function handleSave() {
  const univerDocInstance = props.univerRef
  if (univerDocInstance) {
    const result = univerDocInstance.getData()
    console.log(result)
    saveData(result)
  }
  else {
    console.error('UniverDoc reference is null')
  }
}

function exportAs(format: string) {
  if (facadeAPI) {
    facadeAPI.getActiveDocument()?.getSnapshot()
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
    facadeAPI.getActiveDocument()?.getSnapshot().body?.dataStream
  }
}

async function copy() {
  if (facadeAPI) {
    const html = facadeAPI.getActiveDocument()?.getSnapshot().body?.dataStream

    if (html) {
      navigator.clipboard.writeText(html)
    }
  }
}

async function paste() {
  if (facadeAPI) {
    const text = await navigator.clipboard.readText()
    const document = facadeAPI.getActiveDocument()?.appendText(text)
  }
}

function deleteSelected() {
  if (facadeAPI) {
    // todo: copy html to clipboard then clear
    facadeAPI.getActiveDocument()?.getSnapshot()
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

function spellCheck() {
  if (facadeAPI) {
    const data = props.univerRef?.getData()
    if (data) {
      const text = extractTextFromDocument(data)
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

function countCharactersAndWords(data: IDocumentData) {
  let characterCount = 0
  let wordCount = 0
  const text = extractTextFromDocument(data)
  characterCount += text.length
  wordCount += text.trim().split(/\s+/).length

  return { characterCount, wordCount }
}

function extractTextFromDocument(data: IDocumentData) {
  const text = data.body?.dataStream || ''

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
