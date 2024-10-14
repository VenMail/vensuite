<script setup lang="ts">
import UniverSheet from '@/components/UniverSheet.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import type { Ref } from 'vue'
import { nextTick, onMounted, ref, computed, onUnmounted, watch, shallowRef } from 'vue'

import '@/assets/index.css'
import { PencilIcon, MessageSquareIcon, XIcon } from 'lucide-vue-next'
import { useFavicon } from '@vueuse/core'
import { debounce, type IWorkbookData } from '@univerjs/core'
import { useRoute, useRouter } from 'vue-router'
import SheetMenu from '@/components/menu/SheetMenu.vue'
import { useFileStore } from '@/store/files'
import { sluggify } from '@/utils/lib'
import { FUniver } from '@univerjs/facade'
import { IWebsocketService, Message, useWebSocket, WebSocketService } from '@/lib/wsService'

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

// Handler for univerRefChange event
function onUniverRefChange(childUniverRef: FUniver | null) {
  univerCoreRef.value = childUniverRef
}

// Load data function
async function loadData(id: string) {
  try {
    const loadedData = await fileStore.loadDocument(id, 'xlsx')
    if (!loadedData) {
      console.error('Failed to load document:', id)
      router.push('/') // Redirect to home if document not found
      return null
    }
    if (loadedData?.title) {
      updateTitleRemote(loadedData.title)
    }
    return loadedData.contents ? JSON.parse(loadedData.contents) : null
  } catch (error) {
    console.error('Error loading data:', error)
    return null
  }
}

// Update data handler
async function updateData(newData: IWorkbookData) {
  data.value = newData
  if (route.params.id) {
    await fileStore.saveDocument({
      id: route.params.id as string,
      title: title.value,
      file_name: `${title.value}.xlsx`,
      file_type: 'xlsx',
      contents: JSON.stringify(newData),
      last_viewed: new Date()
    })
  }
}

function editTitle() {
  isTitleEdit.value = true
  nextTick(() => {
    const titleEl = titleRef.value
    if (titleEl) {
      titleEl.focus()
    }
  })
}

function handleTitleChange() {
  const newTitle = title.value.trim()
  if (newTitle && newTitle !== document.title) {
    document.title = newTitle
    if (route.params.id) {
      fileStore.saveDocument({
        id: route.params.id as string,
        title: newTitle,
        file_name: `${sluggify(newTitle)}.xlsx`,
        file_type: 'xlsx',
        contents: JSON.stringify(data.value),
        last_viewed: new Date()
      })
      console.log("Sending ", newTitle);
      wsService.value?.sendMessage(route.params.id as string, 'title', { title: newTitle }, userId.value, userName.value)
    }
  }
}

function updateTitleRemote(newTitle: string) {
  document.title = newTitle
  title.value = newTitle
}

onMounted(async () => {
  if (route.params.id) {
    wsService.value = initializeWebSocket('ws://127.0.0.1:9088?sheetId=' + route.params.id
      + '&userName=' + userName.value
      + '&userId=' + userId.value
    )

    isJoined.value = wsService.value?.joinSheet(route.params.id as string, handleIncomingMessage)

    // Load data after route is initialized
    data.value = await loadData(route.params.id as string)
    
    const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, '#38a169').replace(/1em/g, '')
    const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || '')}`
    useFavicon(iconDataURL)
  }
})

function initializeWebSocketAndJoinSheet() {
  if (route.params.id && !wsService.value) {
    wsService.value = initializeWebSocket(`ws://127.0.0.1:9088?sheetId=${route.params.id}&userName=${userName.value}&userId=${userId.value}`)
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

onMounted(async () => {
  if (route.params.id) {
    initializeWebSocketAndJoinSheet()

    // Load data after route is initialized
    const loadedData = await loadData(route.params.id as string)
    if (loadedData) {
      data.value = loadedData
      document.title = loadedData.name || 'New Spreadsheet'
      title.value = document.title
    } else {
      console.error('Failed to load sheet data')
      // Handle the error (e.g., show an error message to the user)
    }

    const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, '#38a169').replace(/1em/g, '')
    const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || '')}`
    useFavicon(iconDataURL)
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
  const target = event.target as HTMLElement
  title.value = target.innerText
  debouncedHandleTitleChange()
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

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null)
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
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
          @update-data="updateData"
        />
      </div>
      <div class="ml-auto mr-4 flex items-center gap-2">
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
    <div v-if="!isConnected" class="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded">
      Disconnected. Attempting to reconnect...
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
</style>