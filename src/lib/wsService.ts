import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export interface User {
  id: string
  name: string
  cursorPosition?: { row: number; col: number }
}

export interface Message {
  type: 'chat' | 'cursor' | 'change'
  user: User
  content: any
  timestamp: number
}

export class WebSocketService {
  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000

  public isConnected: Ref<boolean> = ref(false)
  public messages: Ref<Message[]> = ref([])

  constructor(private url: string, private userId: string, private userName: string) {}

  connect() {
    const fullUrl = `${this.url}?userId=${encodeURIComponent(this.userId)}&userName=${encodeURIComponent(this.userName)}`;
    this.socket = new WebSocket(fullUrl)

    this.socket.onopen = this.onOpen.bind(this)
    this.socket.onmessage = this.onMessage.bind(this)
    this.socket.onclose = this.onClose.bind(this)
    this.socket.onerror = this.onError.bind(this)
  }

  private onOpen() {
    console.log('WebSocket connected')
    this.isConnected.value = true
    this.reconnectAttempts = 0
  }

  private onMessage(event: MessageEvent) {
    const message: Message = JSON.parse(event.data)
    this.messages.value.push(message)
  }

  private onClose() {
    console.log('WebSocket disconnected')
    this.isConnected.value = false
    this.reconnect()
  }

  private onError(error: Event) {
    console.error('WebSocket error:', error)
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => this.connect(), this.reconnectInterval)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  sendMessage(type: 'chat' | 'cursor' | 'change', content: any) {
    if (this.isConnected.value) {
      const message: Message = {
        type,
        user: {
          id: this.userId,
          name: this.userName,
        },
        content,
        timestamp: Date.now(),
      }
      this.socket?.send(JSON.stringify(message))
    } else {
      console.error('Cannot send message: WebSocket is not connected')
    }
  }

  disconnect() {
    this.socket?.close()
  }
}

export function useWebSocket() {
  const wsService: Ref<WebSocketService | null> = ref(null)

  async function initializeWebSocket(sheetId: string, userId: string, userName: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/collab/${sheetId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch WebSocket endpoint')
      }
      const { url } = await response.json()
      wsService.value = new WebSocketService(url, userId, userName)
      wsService.value.connect()
    } catch (error) {
      console.error('Error initializing WebSocket:', error)
    }
  }

  onUnmounted(() => {
    wsService.value?.disconnect()
  })

  return {
    wsService,
    initializeWebSocket,
  }
}