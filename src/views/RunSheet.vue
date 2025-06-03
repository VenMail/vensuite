<script setup lang="ts">
import UniverSheet from '@/components/UniverSheet.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import type { Ref } from 'vue'
import { nextTick, onMounted, ref, computed, onUnmounted, watch, shallowRef } from 'vue'

import '@/assets/index.css'
import { PencilIcon, MessageSquareIcon, XIcon } from 'lucide-vue-next'
import { debounce, type IWorkbookData } from '@univerjs/core'
import { useRoute, useRouter } from 'vue-router'
import SheetMenu from '@/components/menu/SheetMenu.vue'
import { useFileStore } from '@/store/files'
import { sluggify } from '@/utils/lib'
import { FUniver } from '@univerjs/facade'
import { IWebsocketService, Message, useWebSocket, WebSocketService } from '@/lib/wsService'
import { FileData } from '@/types'
import { toast } from '@/composables/useToast'
import { useFavicon } from '@vueuse/core'
import { DEFAULT_WORKBOOK_DATA, BUDGET_TEMPLATE_DATA, INVOICE_TEMPLATE_DATA } from '@/assets/default-workbook-data'

const route = useRoute()
const router = useRouter()

const { initializeWebSocket } = useWebSocket()

// Filestore setup
const fileStore = useFileStore()

// Reactive references
const data = shallowRef<Partial<IWorkbookData> | null>(null)
const univerRef: Ref<InstanceType<typeof UniverSheet> | null> = ref(null)
const univerCoreRef = ref<FUniver | null>(null)
const title = ref('New Spreadsheet')
const isTitleEdit = ref(false)
const userId = ref(`user-${Math.random().toString(36).substr(2, 9)}`)
const userName = ref(`User ${Math.floor(Math.random() * 1000)}`)
const editableTitle = ref(title.value)
const isSettingCursor = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)

const wsService = ref<IWebsocketService | null>(null)
const isConnected = computed(() => WebSocketService?.isConnected.value)
const isJoined = ref(false)

const chatMessages = ref<Message[]>([])
const isChatOpen = ref(false)
const changesPending = ref(false)
const newChatMessage = ref('')
const textareaHeight = ref('40px')
const chatInput = ref<HTMLTextAreaElement | null>(null)
const chatMessagesContainer = ref<HTMLElement | null>(null)
const replyingTo = ref<Message | null>(null)
const titleRef = ref<HTMLElement | null>(null)

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null)

// Handler for univerRefChange event
function onUniverRefChange(childUniverRef: FUniver | null) {
  univerCoreRef.value = childUniverRef
}

// Load data function
async function loadData(id: string) {
  isLoading.value = true
  try {
    console.log("Loading spreadsheet data for ID:", id)
    const loadedData = await fileStore.loadDocument(id, 'xlsx')
    if (!loadedData) {
      console.error('Failed to load document:', id)
      toast.error('Failed to load spreadsheet')
      router.push('/') // Redirect to home if document not found
      return null
    }
    
    // Set title from the loaded FileData object first
    if (loadedData?.title) {
      updateTitleRemote(loadedData.title)
      console.log("Set title from loaded document:", loadedData.title)
    }
    
    // Parse and validate the contents to restore all formatting
    if (loadedData.content) {
      try {
        const contentString = loadedData.content
        if (!contentString) {
          console.log("Content string is empty, will use default structure")
          return null
        }
        
        const parsedData = JSON.parse(contentString)
        
        // Validate that this is a proper workbook data structure
        if (parsedData && typeof parsedData === 'object') {
          // Ensure it has the minimum required structure for UniverSheet
          if (!parsedData.id) {
            parsedData.id = id // Use the route ID
          }
          if (!parsedData.name && loadedData.title) {
            parsedData.name = loadedData.title
          }
          
          console.log("Successfully parsed spreadsheet data:", {
            hasId: !!parsedData.id,
            hasSheets: !!parsedData.sheets,
            hasName: !!parsedData.name,
            dataSize: contentString.length,
            title: loadedData.title
          })
          
          return parsedData
        } else {
          console.warn("Parsed data is not a valid object, using default structure")
          return null
        }
      } catch (parseError) {
        console.error("Error parsing spreadsheet contents:", parseError)
        toast.error('Document data appears to be corrupted. Loading with default structure.')
        return null
      }
    }
    
    // If we have a document but no contents, it might be a new document
    // Still set the title if available
    console.log("No contents found for existing document, will use default structure but keep title")
    return null
  } catch (error) {
    console.error('Error loading spreadsheet data:', error)
    toast.error('Failed to load spreadsheet')
    return null
  } finally {
    isLoading.value = false
  }
}

// Update data handler
async function updateData(newData: IWorkbookData) {
  try {
    // Ensure the data maintains the correct ID from the route
    if (route.params.id) {
      newData.id = route.params.id as string
    }
    
    // Update the local data reference
    data.value = newData
    
    // Auto-save for local changes (only if not already saving)
    if (route.params.id && newData.id && !isSaving.value) {
      const doc = {
        id: route.params.id as string,
        title: title.value,
        file_name: `${title.value}.xlsx`,
        file_type: 'xlsx',
        content: JSON.stringify(newData),
        last_viewed: new Date()
      } as FileData
      
      // Note: This auto-save might be too aggressive for real-time editing
      // Consider debouncing this or removing it if it causes performance issues
      await fileStore.saveDocument(doc)
      console.log("Auto-saved document data")
    }
  } catch (error) {
    console.error("Error updating document data:", error)
    // Don't show toast for auto-save failures to avoid spam
  }
}

function editTitle() {
  isTitleEdit.value = true
  editableTitle.value = title.value
  nextTick(() => {
    const titleEl = titleRef.value
    if (titleEl) {
      titleEl.focus()
    }
  })
}

async function handleTitleChange() {
  const newTitle = title.value.trim()
  if (newTitle && newTitle !== document.title) {
    document.title = newTitle
    if (route.params.id && !isSaving.value) {
      try {
        const doc = {
          id: route.params.id as string,
          title: newTitle,
          file_name: `${sluggify(newTitle)}.xlsx`,
          file_type: 'xlsx',
          content: JSON.stringify(data.value),
          last_viewed: new Date()
        } as FileData
        
        const result = await fileStore.saveDocument(doc)
        console.log("Title saved:", newTitle)
        
        // Send WebSocket message for real-time collaboration
        wsService.value?.sendMessage(route.params.id as string, 'title', { title: newTitle }, userId.value, userName.value)
        
        // Handle redirect for documents that got new server IDs
        if (result.shouldRedirect && result.redirectId && result.redirectId !== route.params.id) {
          console.log("Document got new server ID after title change, redirecting to:", result.redirectId)
          await router.replace(`/sheets/${result.redirectId}`)
        }
      } catch (error) {
        console.error("Error saving title:", error)
      }
    }
  }
}

function updateTitleRemote(newTitle: string) {
  document.title = newTitle
  title.value = newTitle
}

const SOCKET_URI = import.meta.env.SOCKET_BASE_URL || "ws://app.venmail.io:8443";

function initializeWebSocketAndJoinSheet() {
  if (route.params.id && !wsService.value) {
    wsService.value = initializeWebSocket(`${SOCKET_URI}?sheetId=${route.params.id}&userName=${userName.value}&userId=${userId.value}`)
    joinSheet()
  }
}

function joinSheet() {
  if (isJoined.value) return
  if (wsService.value && route.params.id) {
    try {
      isJoined.value = wsService.value.joinSheet(route.params.id as string, handleIncomingMessage)
      console.log('Joined sheet:', route.params.id)
    } catch (error) {
      console.error('Error joining sheet:', error)
    }
  }
}

// Helper function to create workbook data from template
function createWorkbookFromTemplate(templateData: any): IWorkbookData {
  return {
    ...templateData,
    sheets: templateData.sheets as any
  } as IWorkbookData
}

onMounted(async () => {
  isLoading.value = true
  
  try {
    // Handle template-based new documents first
    if (route.params.template) {
      const templateName = route.params.template as string
      
      let templateData: IWorkbookData = DEFAULT_WORKBOOK_DATA
      let docTitle = 'New Spreadsheet'
      
      if (templateName.toLowerCase().includes('budget')) {
        templateData = createWorkbookFromTemplate(BUDGET_TEMPLATE_DATA)
        docTitle = 'Budget'
      } else if (templateName.toLowerCase().includes('invoice')) {
        templateData = createWorkbookFromTemplate(INVOICE_TEMPLATE_DATA)
        docTitle = 'Invoice'
      }
      
      console.log('Creating new document from template:', templateName)
      
      // Create the document using the store's new method
      const newDoc = await fileStore.createNewDocument('xlsx', docTitle)
      
      const newDocData = {
        ...templateData,
        id: newDoc.id,
        name: docTitle
      }
      
      data.value = newDocData
      document.title = docTitle
      title.value = document.title
      
      // Navigate to the proper sheet URL with the new ID
      await router.replace(`/sheets/${newDoc.id}`)
      
      // Initialize WebSocket after navigation
      initializeWebSocketAndJoinSheet()
    }
    // Handle existing document with ID
    else if (route.params.id) {
      // Check if document already exists in store and set title immediately
      const existingDoc = fileStore.allFiles.find(doc => doc.id === route.params.id);
      if (existingDoc && existingDoc.title) {
        title.value = existingDoc.title;
        document.title = existingDoc.title;
        console.log("Set title from existing store data:", existingDoc.title);
      }

      initializeWebSocketAndJoinSheet()

      // Load data after route is initialized
      const loadedData = await loadData(route.params.id as string)
      if (loadedData) {
        // Ensure the loaded data has proper structure
        data.value = loadedData
        // Title should already be set by loadData function, but ensure it's correct
        const finalTitle = title.value || loadedData.name || loadedData.title || 'New Spreadsheet'
        document.title = finalTitle
        title.value = finalTitle
        console.log("Loaded existing document:", {
          id: loadedData.id,
          name: loadedData.name,
          title: finalTitle,
          hasSheets: !!loadedData.sheets
        })
      } else {
        // For new documents, create a basic structure with the route ID
        // But preserve any title that might have been set during the load attempt
        console.log('Creating new document with ID:', route.params.id)
        const currentTitle = title.value || 'New Spreadsheet'
        const newDocData = {
          ...DEFAULT_WORKBOOK_DATA,
          id: route.params.id as string,
          name: currentTitle
        }
        data.value = newDocData
        document.title = currentTitle
        title.value = currentTitle
      }
    }
    // Handle completely new document without ID (route: /sheets)
    else {
      console.log('Creating completely new document')
      
      // Create the document using the store's new method
      const newDoc = await fileStore.createNewDocument('xlsx', 'New Spreadsheet')
      
      const newDocData = {
        ...DEFAULT_WORKBOOK_DATA,
        id: newDoc.id,
        name: 'New Spreadsheet'
      }
      
      data.value = newDocData
      document.title = 'New Spreadsheet'
      title.value = document.title
      
      // Navigate to the proper sheet URL with the new ID
      await router.replace(`/sheets/${newDoc.id}`)
      
      // Initialize WebSocket after navigation
      initializeWebSocketAndJoinSheet()
    }

    // Set up favicon with Excel icon
    nextTick(() => {
      const iconHTML = iconRef.value?.outerHTML
      if (iconHTML) {
        const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML.replace(/currentColor/g, '#38a169'))}`
        useFavicon(iconDataURL)
      }
    })
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (wsService.value && route.params.id) {
    wsService.value.leaveSheet(route.params.id as string)
  }
})

// Watch for changes in the connection status
watch(isConnected, (newIsConnected) => {
  if (newIsConnected) {
    console.log('WebSocket connection established. Joining sheet...')
    joinSheet()
  } else {
    console.log('WebSocket connection lost.')
    isJoined.value = false
  }
})

function handleIncomingMessage(message: Message) {
  if (message.sheetId !== route.params.id) return // Ignore messages for other sheets

  if (message.messages) {
    //init chat messages
    return message.messages?.forEach(handleIncomingMessage)
  }

  switch (message.type) {
    case 'chat':
      handleChatMessage(message)
      break
    case 'change':
      changesPending.value = true
      univerCoreRef.value?.executeCommand(message.content.command.id, message.content.command.params)
      setTimeout(() => {
        requestAnimationFrame(()=>{
          changesPending.value = false
        })
      }, 10);
      changesPending.value = true
      break
    case 'cursor':
//      handleCursorChange(message.content)
      break
    case 'title':
      updateTitleRemote(message.content.title)
      break
    // Handle other message types as needed
  }
}

watch(() => WebSocketService.messages, (newMessages) => {
  console.log('nm', newMessages)
  newMessages?.value?.forEach(message => {
    if (message.sheetId !== route.params.id) return // Ignore messages for other sheets

    if (message.messages) {
      //init chat messages
      message.messages.forEach(handleIncomingMessage)
      return
    }

    switch (message.type) {
      case 'chat':
        handleChatMessage(message)
        break
      case 'change':
        if (!changesPending.value) {
          changesPending.value = true
          univerCoreRef.value?.executeCommand(message.content.command.id, message.content.command.params)
          nextTick(() => {
            changesPending.value = false
          })
        }
        break
      case 'cursor':
        // handleCursorChange(message.content)
        break
      case 'title':
        updateTitleRemote(message.content.title)
        break
    }
  })
}, { deep: true })

function sendChatMessage() {
  if (route.params.id) {
    const message = newChatMessage.value;
    if (message.trim()) {
      wsService.value?.sendMessage(route.params.id as string, 'chat', { message }, userId.value, userName.value)
      adjustTextareaHeight()
      replyingTo.value = null
      newChatMessage.value = ''
    }
  }
}

const debouncedHandleTitleChange = debounce(handleTitleChange, 300)

function updateTitle(event: Event) {
  if (isSettingCursor.value) return

  const target = event.target as HTMLElement
  const newText = target.innerText.trim()

  // Skip if no actual change
  if (editableTitle.value === newText) return

  editableTitle.value = newText
  title.value = newText

  // Save cursor position
  const selection = window.getSelection()
  const range = selection?.getRangeAt(0)
  const offset = range?.startOffset

  // Queue microtask to restore cursor after Vue update
  nextTick(() => {
    isSettingCursor.value = true
    restoreCursorPosition(target, offset ?? newText.length)
    isSettingCursor.value = false
  })

  debouncedHandleTitleChange()
}

function restoreCursorPosition(element: HTMLElement, offset: number) {
  const range = document.createRange()
  const selection = window.getSelection()

  if (element.childNodes[0]) {
    range.setStart(
      element.childNodes[0],
      Math.min(offset, element.textContent?.length ?? 0)
    )
  } else {
    range.selectNodeContents(element)
    range.collapse(false)
  }

  range.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function togglePencil(v: boolean) {
  isTitleEdit.value = v
  if (v) {
    editTitle()
  }
}

// function handleCursorChange(cursorInfo: any) {
//   // console.log('Cursor changed:', cursorInfo)
//   // Implement cursor display logic here
// }

async function saveData() {
  if (!univerRef.value || !route.params.id) {
    console.warn("Cannot save: univerRef or route.params.id is missing")
    toast.error("Cannot save: Missing document reference or ID")
    return
  }

  // Prevent multiple concurrent saves
  if (isSaving.value) {
    console.log("Save already in progress, skipping")
    return
  }

  isSaving.value = true

  try {
    const name = title.value || "New Spreadsheet"
    univerRef.value.setName(name)

    // Use the UniverSheet's getData method to get the complete snapshot
    const completeData = univerRef.value.getData()
    if (!completeData) {
      throw new Error("Failed to capture spreadsheet data")
    }

    // Ensure the data has the correct ID from the route
    completeData.id = route.params.id as string
    completeData.name = name

    const doc = {
      id: route.params.id as string,
      title: name,
      content: JSON.stringify(completeData), // This preserves all formatting and styles
      file_type: "xlsx",
      file_name: `${name.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
      last_viewed: new Date()
    } as FileData
    
    console.log("Saving document with complete data:", {
      id: doc.id,
      title: doc.title,
      dataSize: doc.content?.length || 0,
      hasSheets: !!completeData.sheets
    })
    
    const result = await fileStore.saveDocument(doc)
    console.log('saveResult', result)
    
    // Handle redirect for documents that got new server IDs
    if (result.shouldRedirect && result.redirectId && result.redirectId !== route.params.id) {
      console.log("Document got new server ID, redirecting to:", result.redirectId)
      await router.replace(`/sheets/${result.redirectId}`)
      toast.success("Document saved and synced successfully")
    } else {
      toast.success("Document saved successfully")
    }
    
    console.log("Document saved successfully")
  } catch (error) {
    console.error("Error saving document:", error)
    toast.error("Failed to save document. Please try again.")
  } finally {
    isSaving.value = false
  }
}

function handleChatMessage(messageInfo: Message) {
  chatMessages.value.push(messageInfo)
  scrollToBottom()
}

function adjustTextareaHeight() {
  if (chatInput.value) {
    chatInput.value.style.height = '40px'
    chatInput.value.style.height = `${Math.min(chatInput.value.scrollHeight, 150)}px`
    textareaHeight.value = chatInput.value.style.height
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight
    }
  })
}

function formatDate(timestamp: number) {
  new Date(timestamp).toTimeString()
}

function replyToMessage(message: Message) {
  replyingTo.value = message
  chatInput.value?.focus()
}

function cancelReply() {
  replyingTo.value = null
}

function getReplyUserName(replyId: string) {
  const replyMessage = chatMessages.value.find(msg => msg.id === replyId)
  return replyMessage ? replyMessage.user.name : 'Unknown User'
}

function getReplyContent(replyId: string) {
  const replyMessage = chatMessages.value.find(msg => msg.id === replyId)
  return replyMessage ? replyMessage.content.message : ''
}

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
}

// Avatar letter placeholder
const avatarLetter = computed(() => userName.value.charAt(0).toUpperCase())
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
    <!-- Loading bar -->
    <div v-if="isLoading" class="loading-bar">
      <div class="loading-progress"></div>
    </div>

    <div class="flex items-center gap-4 pl-4 py-3 bg-gray-50 border-b border-gray-200">
      <router-link to="/" class="flex-shrink-0">
        <defaultIcons.IconMicrosoftExcel
          ref="iconRef"
          class="w-8 h-8 text-green-600"
          xmlns="http://www.w3.org/2000/svg"
        />
      </router-link>
      <div class="flex flex-col">
        <div
          class="flex items-center gap-2"
          @mouseover="togglePencil(true)"
          @mouseleave="togglePencil(false)"
        >
          <div
            :contenteditable="isTitleEdit"
            ref="titleRef"
            class="text-xl font-semibold text-gray-800 border-b-2 border-transparent hover:border-gray-300 transition-colors duration-200"
            :class="{ 'cursor-text': isTitleEdit, 'border-gray-300': isTitleEdit }"
            @input="updateTitle"
            @blur="handleTitleChange"
            @keydown.enter.prevent="handleTitleChange"
            @click="editTitle"
          >
            {{ title }}
          </div>
          <PencilIcon v-if="isTitleEdit" class="h-4 w-4 text-gray-500" />
        </div>
        <SheetMenu
          :univer-ref="univerRef"
          :file-id="route.params.id as string"
          @toggle-chat="toggleChat"
          @save="saveData"
          @update-data="updateData"
        />
      </div>
      <div class="ml-auto mr-4 flex items-center gap-2">
        <!-- Saving indicator -->
        <div v-if="isSaving" class="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Saving</span>
        </div>
        
        <!-- Connection status indicator -->
        <div v-else-if="!isConnected" class="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Offline</span>
        </div>
        
        <button @click="toggleChat" class="p-2 rounded-full hover:bg-gray-200">
          <MessageSquareIcon class="h-6 w-6 text-gray-600" />
        </button>

        <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {{ avatarLetter }}
        </div>
      </div>
    </div>
    <UniverSheet
      id="sheet"
      ref="univerRef"
      :data="data as IWorkbookData"
      :changes-pending="changesPending"
      :sheet-id="route.params.id as string"
      :user-id="userId"
      :user-name="userName"
      :ws="wsService as IWebsocketService"
      @univer-ref-change="onUniverRefChange"
    />
    <div v-if="isChatOpen" class="fixed right-0 bottom-0 w-80 h-96 z-50 bg-white border-l border-t border-gray-200 shadow-lg flex flex-col">
      <div class="flex justify-between items-center p-3 border-b border-gray-200">
        <h3 class="font-semibold">Chat</h3>
        <button @click="toggleChat" class="p-1 rounded-full hover:bg-gray-200">
          <XIcon class="h-4 w-4 text-gray-600" />
        </button>
      </div>
      <div class="flex-grow overflow-y-auto p-3" ref="chatMessagesContainer">
        <div v-for="message in chatMessages" :key="message.id" class="mb-4">
          <div v-if="message.replyTo" class="ml-4 mb-1 p-2 bg-gray-100 rounded text-sm">
            <span class="font-semibold">{{ getReplyUserName(message.replyTo) }}:</span>
            {{ getReplyContent(message.replyTo) }}
          </div>
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-semibold mr-2">
              {{ message.user.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-baseline">
                <span class="font-semibold mr-2">{{ message.user.name }}</span>
                <span class="text-xs text-gray-500">{{ formatDate(message.timestamp) }}</span>
              </div>
              <div class="mt-1">{{ message.content.message }}</div>
              <button @click="replyToMessage(message)" class="text-sm text-blue-500 mt-1">Reply</button>
            </div>
          </div>
        </div>
      </div>
      <div class="p-3 border-t border-gray-200">
        <form @submit.prevent="sendChatMessage" class="flex flex-col">
          <div v-if="replyingTo" class="mb-2 p-2 bg-gray-100 rounded flex justify-between items-start">
            <div class="text-sm">
              <span class="font-semibold">Replying to {{ replyingTo.user.name }}:</span>
              {{ replyingTo.content.message }}
            </div>
            <button @click="cancelReply" class="text-gray-500 hover:text-gray-700">
              <XIcon class="h-4 w-4" />
            </button>
          </div>
          <div class="flex">
            <textarea
              v-model="newChatMessage"
              placeholder="Type a message..."
              class="flex-grow border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              :style="{ height: textareaHeight }"
              @input="adjustTextareaHeight"
              ref="chatInput"
            ></textarea>
            <button
              type="submit"
              class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

#sheet {
  flex: 1;
}

[contenteditable='true'] {
  outline: none;
}

.chat-input {
  min-height: 40px;
  max-height: 150px;
}

.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden;
}

.loading-progress {
  @apply h-full bg-primary-600;
  width: 30%;
  animation: loading 2s infinite ease-in-out;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }

  50% {
    transform: translateX(100%);
  }

  100% {
    transform: translateX(300%);
  }
}
</style>