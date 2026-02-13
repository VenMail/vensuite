import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import type { IWebsocketService, Message } from '@/lib/wsService'
import { useWebSocket, WebSocketService } from '@/lib/wsService'
import { useAuthStore } from '@/store/auth'

export function useSheetCollaboration(univerCoreRef: any) {
  const route = useRoute()
  const authStore = useAuthStore()
  const { initializeWebSocket } = useWebSocket()

  // User identification
  const randomUserToken = Math.random().toString(36).substr(2, 9)
  const userId = ref(
    authStore.isAuthenticated && authStore.userId
      ? authStore.userId
      : `guest-${randomUserToken}`,
  )
  const userName = ref(
    authStore.isAuthenticated
      ? ([authStore.firstName, authStore.lastName].filter(Boolean).join(' ') || authStore.email?.split('@')[0] || 'You')
      : `Guest ${Math.floor(Math.random() * 1000)}`,
  )

  // WebSocket state
  const wsService = ref<IWebsocketService | null>(null)
  const isConnected = computed(() => wsService.value ? WebSocketService?.isConnected.value : false)
  const isJoined = ref(false)

  // Chat state
  const chatMessages = ref<Message[]>([])
  const isChatOpen = ref(false)
  const unreadCount = ref(0)
  const changesPending = ref(false)
  const newChatMessage = ref('')
  const textareaHeight = ref('40px')
  const chatInput = ref<HTMLTextAreaElement | null>(null)
  const chatMessagesContainer = ref<HTMLElement | null>(null)
  const replyingTo = ref<Message | null>(null)

  // Collaborators
  const collaborators = ref<Record<string, { name: string; selection: any; ts: number }>>({})

  // Notification sound
  const notificationSound = new Audio(new URL('@/assets/bubble.mp3', import.meta.url).href)

  // Privacy and access control
  const privacyType = ref<number>(7)
  const guestAccessiblePrivacyTypes = new Set<number>([1, 2, 3, 4])
  const canJoinRealtime = computed(() => {
    if (!route.params.id) return false
    if (privacyType.value === 7) return false // Private
    if (authStore.isAuthenticated) return true
    return guestAccessiblePrivacyTypes.has(privacyType.value)
  })

  const SOCKET_URI = import.meta.env.SOCKET_BASE_URL || 'wss://w.venmail.io:8443'

  function initializeWebSocketAndJoinSheet() {
    if (!canJoinRealtime.value || !route.params.id) {
      return
    }
    if (!wsService.value) {
      const wsUrl = `${SOCKET_URI}?sheetId=${route.params.id}&userName=${userName.value}&userId=${userId.value}`
      wsService.value = initializeWebSocket(wsUrl)
    }
    joinSheet()
  }

  function joinSheet() {
    if (isJoined.value || !canJoinRealtime.value) return
    if (wsService.value && route.params.id) {
      try {
        isJoined.value = wsService.value.joinSheet(route.params.id as string, handleIncomingMessage)
        // Start presence heartbeat after joining
        startPresenceHeartbeat()
      } catch (error) {
        console.error('Error joining sheet:', error)
      }
    }
  }

  function handleIncomingMessage(message: Message) {
    if (message.sheetId !== route.params.id) return

    if (message.messages) {
      return message.messages?.forEach(handleIncomingMessage)
    }

    switch (message.type) {
      case 'chat':
        handleChatMessage(message)
        break
      case 'change':
        if (message.user?.id === userId.value) {
          break
        }
        changesPending.value = true
        univerCoreRef.value?.executeCommand(message.content.command.id, message.content.command.params)
        setTimeout(() => {
          requestAnimationFrame(() => {
            changesPending.value = false
          })
        }, 10)
        break
      case 'cursor':
        if (message.user?.id && message.user?.name) {
          collaborators.value[message.user.id] = {
            name: message.user.name,
            selection: (message as any).content?.selection,
            ts: Date.now(),
          }
        }
        break
      case 'title':
        // Title changes are handled in the main component
        break
    }
  }

  function handleChatMessage(messageInfo: Message) {
    chatMessages.value.push(messageInfo)
    scrollToBottom()
    // Play notification sound and increment unread count if chat is closed and message is from another user
    if (!isChatOpen.value && messageInfo.user?.id !== userId.value) {
      unreadCount.value++
      try {
        notificationSound.currentTime = 0
        notificationSound.play().catch(() => {})
      } catch {}
    }
  }

  function sendChatMessage() {
    if (route.params.id) {
      const message = newChatMessage.value
      if (message.trim()) {
        wsService.value?.sendMessage(
          route.params.id as string,
          'chat',
          { message },
          userId.value,
          userName.value,
          replyingTo.value?.id,
        )
        adjustTextareaHeight()
        replyingTo.value = null
        newChatMessage.value = ''
      }
    }
  }

  function handleChatEnterKey(event: KeyboardEvent) {
    event.preventDefault()
    sendChatMessage()
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
    try {
      return new Date(timestamp).toLocaleTimeString()
    } catch {
      return ''
    }
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
    if (isChatOpen.value) {
      unreadCount.value = 0
      nextTick(() => {
        if (chatInput.value) {
          chatInput.value.focus()
        }
        scrollToBottom()
      })
    }
  }

  function navigateToCollaborator(uid: string) {
    const collab = collaborators.value[uid]
    if (!collab?.selection || !univerCoreRef.value) return
    try {
      const sel = collab.selection
      const range = sel?.range || sel?.primaryRange || sel
      const data = range?.rangeData || range
      const startRow = data?.startRow ?? data?.startRowIndex ?? data?.rowStart
      const startCol = data?.startColumn ?? data?.startColumnIndex ?? data?.colStart
      if (typeof startRow === 'number' && typeof startCol === 'number') {
        const workbook = univerCoreRef.value?.getActiveWorkbook()
        const sheet = workbook?.getActiveSheet()
        if (sheet) {
          // Navigate to the cell by setting selection
          const targetRange = sheet.getRange(startRow, startCol, 1, 1)
          targetRange?.activate()
        }
      }
    } catch (error) {
      console.warn('Failed to navigate to collaborator cell:', error)
    }
  }

  function broadcastPresence() {
    if (!univerCoreRef.value || !wsService.value || !route.params.id) return
    try {
      const workbook = univerCoreRef.value?.getActiveWorkbook()
      const sheet = workbook?.getActiveSheet()
      const selection = sheet?.getSelection()?.getActiveRange()
      if (selection) {
        const data = {
          row: selection.getRow(),
          column: selection.getColumn(),
          worksheetId: sheet?.getSheetId(),
        }
        wsService.value?.sendMessage(route.params.id as string, 'cursor', data, userId.value, userName.value)
      }
    } catch (error) {
      console.error('Error broadcasting presence:', error)
    }
  }

  // Periodic presence heartbeat (every 5 seconds)
  let presenceInterval: ReturnType<typeof setInterval> | null = null

  function startPresenceHeartbeat() {
    stopPresenceHeartbeat()
    presenceInterval = setInterval(broadcastPresence, 5000)
    // Send initial presence
    broadcastPresence()
  }

  function stopPresenceHeartbeat() {
    if (presenceInterval) {
      clearInterval(presenceInterval)
      presenceInterval = null
    }
  }

  function leaveSheet() {
    if (wsService.value && route.params.id) {
      wsService.value.leaveSheet(route.params.id as string)
    }
    isJoined.value = false
    stopPresenceHeartbeat()
  }

  function broadcastChange(command: any) {
    if (!wsService.value || !route.params.id || !command) return
    try {
      wsService.value.sendMessage(
        route.params.id as string,
        'change',
        { command },
        userId.value,
        userName.value,
      )
    } catch (error) {
      console.error('Error broadcasting sheet change:', error)
    }
  }

  function broadcastTitle(title: string) {
    if (!wsService.value || !route.params.id || !title) return
    try {
      wsService.value.sendMessage(
        route.params.id as string,
        'title',
        { title },
        userId.value,
        userName.value,
      )
    } catch (error) {
      console.error('Error broadcasting sheet title:', error)
    }
  }

  // Watch for connection status changes
  watch(isConnected, (newIsConnected) => {
    if (newIsConnected) {
      if (canJoinRealtime.value) joinSheet()
    } else {
      isJoined.value = false
    }
  })

  watch(canJoinRealtime, canJoin => {
    if (canJoin) {
      initializeWebSocketAndJoinSheet()
    } else if (wsService.value && route.params.id && isJoined.value) {
      leaveSheet()
    }
  })

  // Clean up old collaborators
  watch(
    () => collaborators.value,
    () => {
      const now = Date.now()
      for (const [id, info] of Object.entries(collaborators.value)) {
        if (now - info.ts > 8000) {
          delete collaborators.value[id]
        }
      }
    },
    { deep: true },
  )

  return {
    // State
    userId,
    userName,
    wsService,
    isConnected,
    isJoined,
    chatMessages,
    isChatOpen,
    unreadCount,
    changesPending,
    newChatMessage,
    textareaHeight,
    chatInput,
    chatMessagesContainer,
    replyingTo,
    collaborators,
    privacyType,
    canJoinRealtime,
    
    // Methods
    initializeWebSocketAndJoinSheet,
    joinSheet,
    leaveSheet,
    broadcastChange,
    broadcastTitle,
    handleIncomingMessage,
    sendChatMessage,
    handleChatEnterKey,
    adjustTextareaHeight,
    scrollToBottom,
    formatDate,
    replyToMessage,
    cancelReply,
    getReplyUserName,
    getReplyContent,
    toggleChat,
    navigateToCollaborator,
    broadcastPresence,
    startPresenceHeartbeat,
    stopPresenceHeartbeat,
  }
}
