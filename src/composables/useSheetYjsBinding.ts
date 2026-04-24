import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { ref, onUnmounted } from 'vue'
import { createYSocketProvider } from '@/lib/yProviderCustom'
import type { VTableSheet } from '@visactor/vtable-sheet'
// WorkSheet is an internal class — use structural type to avoid deep import path errors
type WorkSheet = {
  tableInstance?: { on: (event: string, cb: (...args: any[]) => void) => void }
  sheetKey: string
  getData(): any[][]
  setCellValue(col: number, row: number, value: any): void
}

interface Options {
  vtableInstance: VTableSheet
  routeId: string
  userId: string
  userName: string
}

export function useSheetYjsBinding(options: Options) {
  const { vtableInstance, routeId, userId, userName } = options

  const ydoc = new Y.Doc()
  const ySheets = ydoc.getMap<Y.Map<any>>('sheets')

  const isYjsConnected = ref(false)
  let applyingRemote = false

  const persistence = new IndexeddbPersistence(`sheet_${routeId}`, ydoc)

  const SOCKET_URI = import.meta.env.VITE_SOCKET_BASE_URL || 'wss://w.venmail.io:8443'
  const url = `${SOCKET_URI}?sheetId=${routeId}&userId=${userId}&userName=${encodeURIComponent(userName)}&channel=crdt`
  const provider = createYSocketProvider({ url, doc: ydoc })

  function cellKey(row: number, col: number) {
    return `${row}:${col}`
  }

  function getOrCreateYSheet(sheetKey: string): Y.Map<any> {
    if (!ySheets.has(sheetKey)) {
      ySheets.set(sheetKey, new Y.Map())
    }
    return ySheets.get(sheetKey)!
  }

  // Yjs → VTable: apply remote (non-local) updates
  ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
    if (origin === 'local') return
    applyingRemote = true
    try {
      const worksheets = getWorksheetMap()
      ySheets.forEach((ySheet, sheetKey) => {
        const ws = worksheets?.get(sheetKey)
        if (!ws) return
        ySheet.forEach((value, key) => {
          const [r, c] = key.split(':').map(Number)
          ws.setCellValue(c, r, value ?? '')
        })
      })
    } finally {
      applyingRemote = false
    }
  })

  // VTable → Yjs: cell value change
  function onCellValueChange(event: { col: number; row: number; rawValue: unknown }, sheetKey: string) {
    if (applyingRemote) return
    const ySheet = getOrCreateYSheet(sheetKey)
    ydoc.transact(() => {
      ySheet.set(cellKey(event.row, event.col), event.rawValue)
    }, 'local')
  }

  // VTable → Yjs: structural change (row/col add/delete) — snapshot full sheet
  function snapshotSheetToYjs(ws: WorkSheet, sheetKey: string) {
    if (applyingRemote) return
    const data = ws.getData()
    const ySheet = getOrCreateYSheet(sheetKey)
    ydoc.transact(() => {
      ySheet.clear()
      data.forEach((row: any[], r: number) => {
        row.forEach((val: any, c: number) => {
          if (val !== null && val !== undefined && val !== '') {
            ySheet.set(cellKey(r, c), val)
          }
        })
      })
    }, 'local')
  }

  function attachTableListeners(ws: WorkSheet, sheetKey: string) {
    const ti = ws.tableInstance
    if (!ti) return
    ti.on('change_cell_value', (e: any) => onCellValueChange(e, sheetKey))
    ti.on('add_record', () => snapshotSheetToYjs(ws, sheetKey))
    ti.on('delete_record', () => snapshotSheetToYjs(ws, sheetKey))
    ti.on('add_column', () => snapshotSheetToYjs(ws, sheetKey))
    ti.on('delete_column', () => snapshotSheetToYjs(ws, sheetKey))
  }

  function getWorksheetMap(): Map<string, WorkSheet> | undefined {
    return (vtableInstance as any).worksheets as Map<string, WorkSheet> | undefined
  }

  // Attach listeners to all current sheets
  getWorksheetMap()?.forEach((ws, key) => attachTableListeners(ws, key))

  // Attach listeners to sheets added later
  vtableInstance.on('sheet_added' as any, (e: any) => {
    const ws = getWorksheetMap()?.get(e.sheetKey)
    if (ws) attachTableListeners(ws, e.sheetKey)
  })

  // Called by VTableSheet.vue's @change for non-cell structural events
  function handleVTableChange(event: { type: string; sheetKey?: string }) {
    if (!event.sheetKey || applyingRemote) return
    if (['add_record', 'delete_record', 'add_column', 'delete_column'].includes(event.type)) {
      const ws = getWorksheetMap()?.get(event.sheetKey)
      if (ws) snapshotSheetToYjs(ws, event.sheetKey)
    }
  }

  function destroy() {
    persistence.destroy()
    provider.destroy()
    ydoc.destroy()
  }

  onUnmounted(destroy)

  return {
    ydoc,
    isYjsConnected,
    handleVTableChange,
    destroy,
  }
}
