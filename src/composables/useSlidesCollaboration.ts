import { ref, computed, shallowRef, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import type { Ref } from 'vue'
import type { IWebsocketService, Message } from '@/lib/wsService'
import { useWebSocket } from '@/lib/wsService'
import { useAuthStore } from '@/store/auth'

export interface SlideCollaborationOptions {
  deckId: Ref<string | null>
  privacyType?: Ref<number>
  onRemoteSlideChange?: (operation: any) => void
  onRemoteTitleChange?: (title: string) => void
  onRemoteNotesChange?: (notes: Record<string, string>) => void
}

export function useSlidesCollaboration(options: SlideCollaborationOptions) {
  const route = useRoute()
  const authStore = useAuthStore()
  const { initializeWebSocket } = useWebSocket()
  const { deckId, onRemoteSlideChange, onRemoteTitleChange } = options
  void route

  // User identification
  const randomUserToken = Math.random().toString(36).slice(2, 11)
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

  // WebSocket state — shallowRef so nested Ref<boolean> isn't unwrapped
  const wsService = shallowRef<IWebsocketService | null>(null)
  const isConnected = computed(() => wsService.value?.isConnected.value ?? false)
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
  const collaborators = ref<Record<string, { name: string; slideIndex?: number; ts: number }>>({})

  // Notification sound
  const notificationSound = typeof Audio !== 'undefined'
    ? new Audio(new URL('@/assets/bubble.mp3', import.meta.url).href)
    : null

  // Privacy and access control
  const localPrivacyType = ref<number>(7)
  const privacyType = options.privacyType ?? localPrivacyType
  const guestAccessiblePrivacyTypes = new Set<number>([1, 2, 3, 4])
  const canJoinRealtime = computed(() => {
    if (!deckId.value) return false
    if (privacyType.value === 7) return false // Private
    if (authStore.isAuthenticated) return true
    return guestAccessiblePrivacyTypes.has(privacyType.value)
  })

  const canEdit = computed(() => {
    if (!authStore.isAuthenticated) return false
    // Edit permission depends on sharing member level
    return true // Simplified - actual check done via sharing API
  })

  const SOCKET_URI = import.meta.env.VITE_SOCKET_BASE_URL || 'wss://w.venmail.io:8443'

  function initializeWebSocketAndJoinDeck() {
    if (!canJoinRealtime.value || !deckId.value) {
      return
    }
    if (!wsService.value) {
      const wsUrl = `${SOCKET_URI}?slideId=${deckId.value}&userName=${userName.value}&userId=${userId.value}`
      wsService.value = initializeWebSocket(wsUrl)
    }
    joinDeck()
  }

  function joinDeck() {
    if (isJoined.value || !canJoinRealtime.value) return
    if (wsService.value && deckId.value) {
      try {
        isJoined.value = wsService.value.joinSheet(deckId.value, handleIncomingMessage)
        if (getCurrentSlideIndex) startPresenceHeartbeat()
      } catch (error) {
        console.error('Error joining slide deck:', error)
      }
    }
  }

  function handleIncomingMessage(message: Message) {
    if (message.slideId !== deckId.value) return

    if (message.messages) {
      return message.messages?.forEach(handleIncomingMessage)
    }

    switch (message.type) {
      case 'chat':
        handleChatMessage(message)
        break
      case 'cursor':
        if (message.user?.id && message.user?.name) {
          collaborators.value[message.user.id] = {
            name: message.user.name,
            slideIndex: (message as any).content?.slideIndex,
            ts: Date.now(),
          }
        }
        break
      case 'title':
        if (message.user?.id !== userId.value && message.content?.title) {
          onRemoteTitleChange?.(message.content.title)
        }
        break
      case 'slide_operation':
        if (message.user?.id !== userId.value && onRemoteSlideChange) {
          onRemoteSlideChange(message.content)
        }
        break
    }
  }

  function handleChatMessage(messageInfo: Message) {
    chatMessages.value.push(messageInfo)
    scrollToBottom()
    if (!isChatOpen.value && messageInfo.user?.id !== userId.value) {
      unreadCount.value++
      try {
        if (notificationSound) {
          notificationSound.currentTime = 0
          notificationSound.play().catch(() => {})
        }
      } catch {}
    }
  }

  function sendChatMessage() {
    if (deckId.value) {
      const message = newChatMessage.value
      if (message.trim()) {
        wsService.value?.sendMessage(
          deckId.value,
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

  function broadcastPresence(currentSlideIndex: number) {
    if (!wsService.value || !deckId.value) return
    try {
      wsService.value.sendMessage(
        deckId.value,
        'cursor',
        { slideIndex: currentSlideIndex },
        userId.value,
        userName.value
      )
    } catch (error) {
      console.error('Error broadcasting slide presence:', error)
    }
  }

  let presenceInterval: ReturnType<typeof setInterval> | null = null
  let getCurrentSlideIndex: (() => number) | null = null

  function startPresenceHeartbeat(currentSlideIndex?: () => number) {
    if (currentSlideIndex) {
      getCurrentSlideIndex = currentSlideIndex
    }
    const slideIndexFn = getCurrentSlideIndex
    if (!slideIndexFn) return
    stopPresenceHeartbeat()
    presenceInterval = setInterval(() => {
      if (getCurrentSlideIndex) {
        broadcastPresence(getCurrentSlideIndex())
      }
    }, 5000)
    broadcastPresence(slideIndexFn())
  }

  function updateSlideIndex(currentSlideIndex: number) {
    if (wsService.value && deckId.value) {
      broadcastPresence(currentSlideIndex)
    }
  }

  function stopPresenceHeartbeat() {
    if (presenceInterval) {
      clearInterval(presenceInterval)
      presenceInterval = null
    }
  }

  function leaveDeck() {
    if (wsService.value && deckId.value) {
      wsService.value.leaveSheet(deckId.value)
    }
    isJoined.value = false
    stopPresenceHeartbeat()
  }

  function broadcastTitle(title: string) {
    if (!wsService.value || !deckId.value || !title) return
    try {
      wsService.value.sendMessage(
        deckId.value,
        'title',
        { title },
        userId.value,
        userName.value,
      )
    } catch (error) {
      console.error('Error broadcasting slide title:', error)
    }
  }

  function broadcastSlideOperation(operation: { type: string; data: any }) {
    if (!wsService.value || !deckId.value) return
    try {
      wsService.value.sendMessage(
        deckId.value,
        'slide_operation',
        operation,
        userId.value,
        userName.value,
      )
    } catch (error) {
      console.error('Error broadcasting slide operation:', error)
    }
  }

  watch(isConnected, (newIsConnected) => {
    if (newIsConnected) {
      if (canJoinRealtime.value) joinDeck()
    } else {
      isJoined.value = false
    }
  })

  watch(canJoinRealtime, canJoin => {
    if (canJoin) {
      initializeWebSocketAndJoinDeck()
    } else if (wsService.value && deckId.value && isJoined.value) {
      leaveDeck()
    }
  })

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
    canEdit,

    // Methods
    initializeWebSocketAndJoinDeck,
    joinDeck,
    leaveDeck,
    broadcastTitle,
    broadcastSlideOperation,
    broadcastPresence,
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
    startPresenceHeartbeat,
    stopPresenceHeartbeat,
    updateSlideIndex,
  }
}
