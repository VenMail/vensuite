import type { IWorkbookData } from '@univerjs/core'

/**
 * Extract field names from sheet data based on first row headers
 */
export function extractSheetFields(workbookData: IWorkbookData | null | undefined): string[] {
  if (!workbookData?.sheets || Object.entries(workbookData.sheets).length === 0) {
    return ['Column A', 'Column B', 'Column C']
  }

  try {
    // Get the first sheet
    const firstSheet = workbookData.sheets[0]
    if (!firstSheet?.cellData) {
      return ['Column A', 'Column B', 'Column C']
    }

    // Find the first row with data (typically headers)
    const rows = Object.keys(firstSheet.cellData)
      .map(rowNum => parseInt(rowNum))
      .filter(rowNum => !isNaN(rowNum))
      .sort((a, b) => a - b)

    if (rows.length === 0) {
      return ['Column A', 'Column B', 'Column C']
    }

    const firstRow = rows[0]
    const rowData = firstSheet.cellData[firstRow]
    if (!rowData) {
      return ['Column A', 'Column B', 'Column C']
    }

    // Extract cell values from the first row
    const fields: string[] = []
    const cols = Object.keys(rowData)
      .map(colNum => parseInt(colNum))
      .filter(colNum => !isNaN(colNum))
      .sort((a, b) => a - b)

    for (const col of cols) {
      const cell = rowData[col]
      if (cell?.v) {
        const value = String(cell.v).trim()
        if (value) {
          fields.push(value)
        }
      }
    }

    // If no fields found, use column letters
    if (fields.length === 0) {
      return cols.map(col => `Column ${String.fromCharCode(65 + col)}`)
    }

    return fields.length > 0 ? fields : ['Column A', 'Column B', 'Column C']
  } catch (error) {
    console.warn('Error extracting sheet fields:', error)
    return ['Column A', 'Column B', 'Column C']
  }
}

/**
 * Extract field names from form blocks
 */
export function extractFormFields(blocks: any[]): string[] {
  if (!blocks || blocks.length === 0) {
    return ['Email', 'Name', 'Message']
  }

  try {
    const fields: string[] = []
    
    for (const block of blocks) {
      if (!block) continue
      
      // Extract question/title as field name
      let fieldName = ''
      
      if (block.question && typeof block.question === 'string') {
        fieldName = block.question.trim()
      } else if (block.title && typeof block.title === 'string') {
        fieldName = block.title.trim()
      } else if (block.name && typeof block.name === 'string') {
        fieldName = block.name.trim()
      }
      
      // Skip empty field names
      if (!fieldName) continue
      
      // Skip page breaks and other non-input blocks
      if (block.type === 'pagebreak' || block.category === 'layout') {
        continue
      }
      
      // Clean up field name (remove required indicators, etc.)
      fieldName = fieldName.replace(/\*$/, '').trim()
      
      // Ensure field name is unique
      let uniqueFieldName = fieldName
      let counter = 1
      while (fields.includes(uniqueFieldName)) {
        uniqueFieldName = `${fieldName} ${counter}`
        counter++
      }
      
      fields.push(uniqueFieldName)
    }
    
    return fields.length > 0 ? fields : ['Email', 'Name', 'Message']
  } catch (error) {
    console.warn('Error extracting form fields:', error)
    return ['Email', 'Name', 'Message']
  }
}

/**
 * Get sample data for a field based on its name
 */
export function getSampleDataForField(fieldName: string): string {
  const name = fieldName.toLowerCase()
  
  if (name.includes('email')) return 'john@example.com'
  if (name.includes('name')) return 'John Doe'
  if (name.includes('first') && name.includes('name')) return 'John'
  if (name.includes('last') && name.includes('name')) return 'Doe'
  if (name.includes('phone')) return '+1-555-0123'
  if (name.includes('date')) return new Date().toISOString().split('T')[0]
  if (name.includes('time')) return new Date().toTimeString().split(' ')[0].substring(0, 5)
  if (name.includes('address')) return '123 Main St, City, State'
  if (name.includes('company')) return 'Acme Corporation'
  if (name.includes('website') || name.includes('url')) return 'https://example.com'
  if (name.includes('message') || name.includes('comment') || name.includes('feedback')) return 'Sample message text'
  if (name.includes('rating')) return '5'
  if (name.includes('price') || name.includes('amount')) return '99.99'
  if (name.includes('quantity')) return '1'
  if (name.includes('yes') || name.includes('no')) return 'Yes'
  if (name.includes('true') || name.includes('false')) return 'true'
  
  return `Sample ${fieldName}`
}
