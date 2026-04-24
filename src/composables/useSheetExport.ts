import { toast } from '@/composables/useToast'
import * as XLSX from 'xlsx'

export function useSheetExport(vtableRef: any) {
  function getInstance() {
    return vtableRef.value?.getInstance?.() ?? null
  }

  function getActiveSheet() {
    return vtableRef.value?.getActiveSheet?.() ?? null
  }

  function getActiveSheetKey(): string | null {
    const sheet = getActiveSheet()
    return sheet?.sheetKey ?? sheet?.getKey?.() ?? null
  }

  function getSheetData(sheet: any): any[][] {
    const data = sheet?.getData?.()
    if (!Array.isArray(data)) return []
    return data.map(row => Array.isArray(row) ? [...row] : [])
  }

  function getSheetColumns(sheet: any): any[] {
    return sheet?.getColumns?.() ?? []
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function tryNativeExport(fileType: 'csv' | 'xlsx', allSheets = false): boolean {
    const instance = getInstance()
    if (!instance) return false
    try {
      if (allSheets && typeof instance.exportAllSheetsToExcel === 'function') {
        instance.exportAllSheetsToExcel()
        return true
      }
      if (typeof instance.exportSheetToFile === 'function') {
        instance.exportSheetToFile(fileType, allSheets)
        return true
      }
    } catch (error) {
      console.warn('Native export failed, falling back:', error)
    }
    return false
  }

  async function exportToXLSX(sheet: any, filename: string) {
    if (tryNativeExport('xlsx')) return
    const data = getSheetData(sheet)
    const columns = getSheetColumns(sheet)

    const headers = columns.map((col: any) => col.title || `Column ${col.field}`)
    const wsData = [headers, ...data]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, filename)
  }

  async function exportToCSV(sheet: any, filename: string) {
    if (tryNativeExport('csv')) return
    const data = getSheetData(sheet)
    const columns = getSheetColumns(sheet)

    const headers = columns.map((col: any) => col.title || `Column ${col.field}`)
    const rows = [headers, ...data]

    const escapeValue = (val: any): string => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csv = rows.map(row => row.map(escapeValue).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  async function exportToHTML(sheet: any, filename: string) {
    const data = getSheetData(sheet)
    const columns = getSheetColumns(sheet)

    const headers = columns.map((col: any) => col.title || `Column ${col.field}`)

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename.replace('.html', '')}</title>
  <style>
    table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9fafb; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `<tr>${row.map((cell: any) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    downloadBlob(blob, filename)
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  async function exportToPDF(sheet: any, filename: string) {
    // For now, use print dialog as PDF generation
    // This opens the native print dialog which allows saving as PDF
    const data = getSheetData(sheet)
    const columns = getSheetColumns(sheet)
    const headers = columns.map((col: any) => col.title || `Column ${col.field}`)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to export PDF')
      return
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename.replace('.pdf', '')}</title>
  <style>
    @media print {
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 6px; font-size: 10pt; }
      th { background-color: #f0f0f0; }
    }
    table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: bold; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `<tr>${row.map((cell: any) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <script>window.onload = () => { window.print(); window.close(); }</script>
</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  async function handleImport(options?: { clearExisting?: boolean }) {
    const instance = getInstance()
    if (!instance) {
      toast.error('Sheet not ready')
      return
    }
    if (typeof instance.importFileToSheet !== 'function') {
      toast.error('Import not supported')
      return
    }
    try {
      const result = await instance.importFileToSheet({ clearExisting: options?.clearExisting ?? false })
      if (result) {
        toast.success('Import completed')
      }
    } catch (err) {
      console.error('Import failed:', err)
      toast.error(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function handleExportAll() {
    if (tryNativeExport('xlsx', true)) {
      toast.success('All sheets exported')
      return
    }
    toast.error('All-sheets export not supported')
  }

  async function handleExport(format: string) {
    try {
      const sheet = getActiveSheet()
      if (!sheet) {
        toast.error('No active sheet to export')
        return
      }

      const timestamp = Date.now()
      const baseName = `export-${timestamp}`

      switch (format) {
        case 'xlsx':
          await exportToXLSX(sheet, `${baseName}.xlsx`)
          toast.success('Exported to XLSX')
          break
        case 'csv':
          await exportToCSV(sheet, `${baseName}.csv`)
          toast.success('Exported to CSV')
          break
        case 'html':
          await exportToHTML(sheet, `${baseName}.html`)
          toast.success('Exported to HTML')
          break
        case 'pdf':
          await exportToPDF(sheet, `${baseName}.pdf`)
          toast.success('PDF export opened in print dialog')
          break
        default:
          toast.error(`Unsupported format: ${format}`)
      }
    } catch (err) {
      console.error('Export failed', err)
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return {
    handleExport,
    handleImport,
    handleExportAll,
  }
}
