// Minimal Yjs transport over a dedicated WebSocket using the existing uWebSockets server
// Protocol (first byte):
// 0x01 = state-vector request (payload: stateVector)
// 0x02 = state update response (payload: update)
// 0x03 = incremental update broadcast (payload: update)

import * as Y from 'yjs'

export interface YSocketProviderOptions {
  url: string // full ws(s):// URL including query (?sheetId=&userId=&userName=)
  doc: Y.Doc
}

export function createYSocketProvider(options: YSocketProviderOptions) {
  const { url, doc } = options
  let ws: WebSocket | null = null
  let connected = false

  const send = (type: number, payload: Uint8Array) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const out = new Uint8Array(1 + payload.length)
    out[0] = type
    out.set(payload, 1)
    ws.send(out)
  }

  const onOpen = () => {
    connected = true
    // Send our state vector request so peers can respond with missing updates
    const sv = Y.encodeStateVector(doc)
    send(0x01, sv)
  }

  const onMessage = (ev: MessageEvent) => {
    if (typeof ev.data === 'string') {
      // ignore JSON messages
      return
    }
    let data: ArrayBuffer
    if (ev.data instanceof ArrayBuffer) {
      data = ev.data
    } else if ((ev.data as any).buffer instanceof ArrayBuffer) {
      data = (ev.data as any).buffer
    } else {
      return
    }
    const bytes = new Uint8Array(data)
    if (bytes.length === 0) return
    const type = bytes[0]
    const payload = bytes.subarray(1)

    try {
      switch (type) {
        case 0x01: {
          // Peer requests state; compute update relative to their vector
          const peerSV = payload
          const diff = Y.encodeStateAsUpdate(doc, peerSV)
          send(0x02, diff)
          break
        }
        case 0x02:
        case 0x03: {
          // Apply update
          Y.applyUpdate(doc, payload)
          break
        }
        default:
          // Unknown type: ignore
          break
      }
    } catch (e) {
      console.error('YSocketProvider message error', e)
    }
  }

  const onClose = () => {
    connected = false
  }

  const onError = (e: Event) => {
    console.error('YSocketProvider ws error', e)
  }

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    ws.onopen = onOpen
    ws.onmessage = onMessage
    ws.onclose = onClose
    ws.onerror = onError

    // Forward local updates to peers
    doc.on('update', (update: Uint8Array) => {
      // origin can be used to avoid echo loops if necessary
      send(0x03, update)
    })
  }

  const destroy = () => {
    if (ws) {
      try {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        if (ws.readyState === WebSocket.OPEN) ws.close()
      } catch {}
      ws = null
    }
  }

  connect()

  return { destroy, get connected() { return connected } }
}
