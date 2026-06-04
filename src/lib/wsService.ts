import { ref } from 'vue'
import type { Ref } from 'vue'
import { useAuthStore } from '@/store/auth'

const WS_DEBUG = Boolean(import.meta.env.DEV)
const debugLog = (...args: unknown[]) => {
  if (WS_DEBUG) console.debug(...args)
}

export interface User {
  id: string
  name: string
  cursorPosition?: { row: number; col: number }
}

export interface Message {
  messages?: Message[]
  id: string
  type: 'chat' | 'cursor' | 'change' | 'title' | 'join' | 'leave' | 'slide_operation'
  sheetId?: string
  slideId?: string
  user: User
  content: any
  timestamp: number
  replyTo?: string
}

export type MessageListener = (message: Message) => void

export interface IWebsocketService {
  readonly url: string
  readonly isConnected: Ref<boolean>
  readonly messages: Ref<Message[]>
  connect(): void
  disconnect(): void
  joinSheet(sheetId: string, listener: MessageListener): boolean
  leaveSheet(sheetId: string): void
  sendMessage(sheetId: string, type: Message['type'], content: any, userId: string, userName: string, replyTo?: string): void
}

export class WebSocketService implements IWebsocketService {
  // Aggregate static (back-compat) — true if ANY instance is connected
  public static isConnected: Ref<boolean> = ref(false)
  public static messages: Ref<Message[]> = ref([])
  private static instances: Set<WebSocketService> = new Set()

  private static recomputeAggregateConnected() {
    let anyConnected = false
    WebSocketService.instances.forEach(inst => { if (inst.isConnected.value) anyConnected = true })
    WebSocketService.isConnected.value = anyConnected
  }

  public readonly isConnected: Ref<boolean> = ref(false)
  public readonly messages: Ref<Message[]> = ref([])

  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private reconnectTimeoutId: number | null = null
  private activeSheets: Map<string, MessageListener> = new Map()

  public constructor(public readonly url: string) {
    WebSocketService.instances.add(this)
  }

  connect() {
    if (this.socket) {
      return // Already connected or connecting
    }

    this.socket = new WebSocket(this.url)
    this.socket.onopen = this.onOpen.bind(this)
    this.socket.onmessage = this.onMessage.bind(this)
    this.socket.onclose = this.onClose.bind(this)
    this.socket.onerror = this.onError.bind(this)
  }

  private onOpen() {
    debugLog('WebSocket connected', this.url)
    this.isConnected.value = true
    WebSocketService.recomputeAggregateConnected()
    this.reconnectAttempts = 0
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
    // Rejoin all active sheets on this socket
    this.activeSheets.forEach((listener, sheetId) => {
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
      this.messages.value.push(message)
      WebSocketService.messages.value.push(message)
      const trim = (arr: Message[]) => {
        if (arr.length > 200) arr.splice(0, arr.length - 200)
      }
      trim(this.messages.value)
      trim(WebSocketService.messages.value)
      // Notify sheet-specific listeners (handle both sheetId and slideId)
      const roomId = message.sheetId || message.slideId
      if (roomId) {
        const listenerNode = this.activeSheets.get(roomId)
        listenerNode?.(message)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private onClose(event: CloseEvent) {
    debugLog('WebSocket disconnected', event.code, event.reason, this.url)
    this.isConnected.value = false
    WebSocketService.recomputeAggregateConnected()
    if (this.socket) {
      this.socket = null
    }

    // Check if the close is due to an auth issue (no valid accounts or token problem)
    const isAuthError = event.code === 1008 || event.code === 4001 || event.code === 4003
    const reason = (event.reason || '').toLowerCase()
    const isNoAccountsError = reason.includes('no valid accounts') || reason.includes('forbidden')
    const isTokenError = reason.includes('unauthorized') || reason.includes('invalid token') || reason.includes('token')

    if (isAuthError || isNoAccountsError || isTokenError) {
      console.warn('WebSocket closed due to auth issue:', event.code, event.reason)

      try {
        const authStore = useAuthStore()
        if (isNoAccountsError) {
          authStore.setNoLinkedAccounts()
        } else if (isTokenError && authStore.isAuthenticated) {
          authStore.handleTokenExpiration()
        }
      } catch (e) {
        console.warn('Failed to notify auth store of WebSocket auth error:', e)
      }

      // Do NOT reconnect for auth errors
      return
    }

    // Non-auth disconnections: attempt reconnection
    this.reconnect()
  }

  private onError(error: Event) {
    console.error('WebSocket error:', error)
    this.isConnected.value = false
    WebSocketService.recomputeAggregateConnected()
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(30000, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1))
      debugLog(`Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      this.reconnectTimeoutId = window.setTimeout(() => this.connect(), delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  sendMessage(sheetId: string, type: Message['type'], content: any, userId: string, userName: string, replyTo?: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
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
      this.socket.send(JSON.stringify(message))
    } else {
      console.error('Cannot send message: WebSocket is not connected')
    }
  }

  public joinSheet(sheetId: string, listener: MessageListener) {
    const existingListener = this.activeSheets.get(sheetId)
    if (!existingListener || existingListener !== listener) {
      this.activeSheets.set(sheetId, listener)
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendMessage(sheetId, 'join', {}, 'system', 'System')
      return true
    }

    return false
  }

  public leaveSheet(sheetId: string) {
    if (this.activeSheets.has(sheetId)) {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendMessage(sheetId, 'leave', {}, 'system', 'System')
      }
      this.activeSheets.delete(sheetId)
    }
  }

  public disconnect() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
    if (this.socket) {
      this.socket.onopen = null
      this.socket.onmessage = null
      this.socket.onclose = null
      this.socket.onerror = null
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close()
      }
      this.socket = null
    }
    this.isConnected.value = false
    this.activeSheets.clear()
    WebSocketService.instances.delete(this)
    WebSocketService.recomputeAggregateConnected()
  }
}

const wsServicesByUrl: Map<string, WebSocketService> = new Map()

export function useWebSocket() {
  function initializeWebSocket(url: string): WebSocketService {
    let svc = wsServicesByUrl.get(url)
    if (!svc) {
      svc = new WebSocketService(url)
      wsServicesByUrl.set(url, svc)
      svc.connect()
    } else if (!svc.isConnected.value) {
      svc.connect()
    }
    return svc
  }

  function disposeWebSocket(url: string) {
    const svc = wsServicesByUrl.get(url)
    if (svc) {
      svc.disconnect()
      wsServicesByUrl.delete(url)
    }
  }

  return {
    initializeWebSocket,
    disposeWebSocket,
  }
}
