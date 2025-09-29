import { ref } from 'vue'
import type { Ref } from 'vue'

export interface User {
  id: string
  name: string
  cursorPosition?: { row: number; col: number }
}

export interface Message {
  messages?: Message[]
  id: string
  type: 'chat' | 'cursor' | 'change' | 'title' | 'join' | 'leave'
  sheetId: string
  user: User
  content: any
  timestamp: number
  replyTo?: string
}

export type MessageListener = (message: Message) => void

export interface IWebsocketService {
  connect(): void
  disconnect(): void
  joinSheet(sheetId: string, listener: MessageListener): boolean
  leaveSheet(sheetId: string): void
  sendMessage(sheetId: string, type: Message['type'], content: any, userId: string, userName: string, replyTo?: string): void
}

export class WebSocketService implements IWebsocketService {
  private static socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private reconnectTimeoutId: number | null = null

  public static messages: Ref<Message[]> = ref([])
  private static activeSheets: Map<string, MessageListener> = new Map()
  public static isConnected: Ref<boolean> = ref(false)

  public constructor(private url: string) {}

  connect() {
    if (WebSocketService.socket) {
      return // Already connected or connecting
    }

    WebSocketService.socket = new WebSocket(this.url)
    WebSocketService.socket.onopen = this.onOpen.bind(this)
    WebSocketService.socket.onmessage = this.onMessage.bind(this)
    WebSocketService.socket.onclose = this.onClose.bind(this)
    WebSocketService.socket.onerror = this.onError.bind(this)
  }

  private onOpen() {
    console.log('WebSocket connected')
    WebSocketService.isConnected.value = true
    this.reconnectAttempts = 0
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
    // Rejoin all active sheets
    WebSocketService.activeSheets.forEach((listener, sheetId) => {
      this.joinSheet(sheetId, listener)
    })
  }

  private onMessage(event: MessageEvent) {
    try {
      if (typeof event.data !== 'string') {
        // Ignore binary frames (used by CRDT transport)
        return
      }
      const message: Message = JSON.parse(event.data)
      WebSocketService.messages.value.push(message)
      if (WebSocketService.messages.value.length > 200) {
        WebSocketService.messages.value.splice(0, WebSocketService.messages.value.length - 200)
      }
      // Notify sheet-specific listeners
      const listenerNode = WebSocketService.activeSheets.get(message.sheetId)
      listenerNode?.(message)
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private onClose(event: CloseEvent) {
    console.log('WebSocket disconnected', event.code, event.reason)
    WebSocketService.isConnected.value = false
    if (WebSocketService?.socket) {
      WebSocketService.socket = null
    }
    this.reconnect()
  }

  private onError(error: Event) {
    console.error('WebSocket error:', error)
    WebSocketService.isConnected.value = false
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(30000, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1))
      console.log(`Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      this.reconnectTimeoutId = window.setTimeout(() => this.connect(), delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  sendMessage(sheetId: string, type: Message['type'], content: any, userId: string, userName: string, replyTo?: string) {
    if (WebSocketService?.socket?.readyState === WebSocket.OPEN) {
      const message: Message = {
        id: `${userId}-${Date.now()}`,
        type,
        sheetId,
        user: {
          id: userId,
          name: userName,
        },
        content,
        timestamp: Date.now(),
        replyTo,
      }
      WebSocketService.socket?.send(JSON.stringify(message))
    } else {
      console.error('Cannot send message: WebSocket is not connected')
    }
  }

  public joinSheet(sheetId: string, listener: MessageListener) {
    if (!WebSocketService.activeSheets.has(sheetId)) {
      WebSocketService.activeSheets.set(sheetId, listener)
      if (WebSocketService?.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage(sheetId, 'join', {}, 'system', 'System')
        return true;
      }
    }
    return false;
  }

  public leaveSheet(sheetId: string) {
    if (WebSocketService.activeSheets.has(sheetId)) {
      if (WebSocketService?.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage(sheetId, 'leave', {}, 'system', 'System')
      }
      WebSocketService.activeSheets.delete(sheetId)
    }
  }

  public disconnect() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
    if (WebSocketService?.socket) {
      WebSocketService.socket.onopen = null
      WebSocketService.socket.onmessage = null
      WebSocketService.socket.onclose = null
      WebSocketService.socket.onerror = null
      if (WebSocketService.socket.readyState === WebSocket.OPEN) {
        WebSocketService.socket.close()
      }
      WebSocketService.socket = null
    }
    WebSocketService.isConnected.value = false
    WebSocketService.activeSheets.clear()
  }
}

let globalWsService: WebSocketService | null = null

export function useWebSocket() {
  function initializeWebSocket(url: string) {
    if (!globalWsService) {
      globalWsService = new WebSocketService(url)
      globalWsService.connect()
    }
    return globalWsService
  }

  return {
    initializeWebSocket,
  }
}