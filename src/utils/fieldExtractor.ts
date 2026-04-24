import type { IVTableSheetOptions } from '@visactor/vtable-sheet'

/**
 * Extract field names from first-row headers of a VTable sheet
 */
export function extractSheetFields(workbookData: IVTableSheetOptions | null | undefined): string[] {
  const fallback = ['Column A', 'Column B', 'Column C']
  if (!workbookData?.sheets?.length) return fallback

  try {
    const firstSheet = workbookData.sheets[0]
    const data = firstSheet?.data
    if (!data?.length || !data[0]?.length) return fallback

    const headerRow = data[0]
    const fields: string[] = []

    for (let col = 0; col < headerRow.length; col++) {
      const val = headerRow[col]
      if (val !== null && val !== undefined && val !== '') {
        fields.push(String(val).trim())
      }
    }

    if (fields.length === 0) {
      return headerRow.map((_, i) => `Column ${String.fromCharCode(65 + i)}`)
    }

    return fields
  } catch {
    return fallback
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
