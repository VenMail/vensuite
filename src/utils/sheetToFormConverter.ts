import type { IWorkbookData } from '@univerjs/core'
import type { FormQuestionType, FormFieldCategory, Option, TextValidation } from '@/types'

/**
 * Analyzes sheet data and converts it to form questions
 */
export interface SheetToFormOptions {
  titleRow?: number
  dataStartRow?: number
  maxRowsToAnalyze?: number
  includeSampleData?: boolean
}

export interface FormQuestionWithMetadata {
  id: string
  page_id?: string
  category: FormFieldCategory
  type: FormQuestionType
  question: string
  description?: string
  placeholder?: string
  required: boolean
  help_text?: string
  metadata?: Record<string, unknown>
  // Type-specific properties
  validation?: TextValidation
  options?: Option[]
  min?: number
  max?: number
  step?: number
  allowed_types?: string[]
  max_size_mb?: number
  multiple?: boolean
  capture_mode?: "camera" | "upload" | "both"
  icon_type?: "star" | "heart" | "thumb"
  allow_half?: boolean
  orientation?: "horizontal" | "vertical"
  show_labels?: boolean
  left_label?: string
  right_label?: string
  randomize_options?: boolean
  allow_search?: boolean
  max_selections?: number
  min_selections?: number
  supports_new?: boolean
  // Conversion metadata
  columnName?: string
  sampleData?: string[]
  confidence?: number
}

/**
 * Convert sheet data to form questions
 */
export function convertSheetToForm(
  workbookData: IWorkbookData | null,
  options: SheetToFormOptions = {}
): FormQuestionWithMetadata[] {
  if (!workbookData?.sheets || Object.entries(workbookData.sheets).length === 0) {
    return []
  }

  const {
    titleRow = 0,
    dataStartRow = 1,
    maxRowsToAnalyze = 10,
    includeSampleData = true
  } = options

  try {
    // Get the first sheet
    const firstSheet = workbookData.sheets[0]
    if (!firstSheet?.cellData) {
      return []
    }

    // Extract column headers from title row
    const headers = extractRowData(firstSheet.cellData, titleRow)
    if (headers.length === 0) {
      return []
    }

    // Extract sample data from subsequent rows
    const sampleDataByColumn: string[][] = []
    for (let col = 0; col < headers.length; col++) {
      const columnData: string[] = []
      
      for (let row = dataStartRow; row < Math.min(dataStartRow + maxRowsToAnalyze, 100); row++) {
        const rowData = extractRowData(firstSheet.cellData, row)
        if (rowData[col] && rowData[col].trim()) {
          columnData.push(rowData[col].trim())
        }
      }
      
      sampleDataByColumn.push(columnData)
    }

    // Generate form questions based on headers and sample data
    const questions: FormQuestionWithMetadata[] = []
    
    headers.forEach((header, index) => {
      if (!header || !header.trim()) return
      
      const sampleData = sampleDataByColumn[index] || []
      const question = generateQuestionFromColumn(header, sampleData, index)
      
      if (question) {
        questions.push({
          ...question,
          columnName: header,
          sampleData: includeSampleData ? sampleData : undefined,
          confidence: calculateConfidence(header, sampleData, question.type)
        })
      }
    })

    return questions
  } catch (error) {
    console.error('Error converting sheet to form:', error)
    return []
  }
}

/**
 * Extract data from a specific row
 */
function extractRowData(cellData: Record<number, Record<number, any>>, rowIndex: number): string[] {
  const rowData = cellData[rowIndex]
  if (!rowData) return []

  const cols = Object.keys(rowData)
    .map(colNum => parseInt(colNum))
    .filter(colNum => !isNaN(colNum))
    .sort((a, b) => a - b)

  return cols.map(col => {
    const cell = rowData[col]
    return cell?.v ? String(cell.v).trim() : ''
  })
}

/**
 * Generate a form question based on column header and sample data
 */
function generateQuestionFromColumn(
  header: string,
  sampleData: string[],
  columnIndex: number
): FormQuestionWithMetadata | null {
  const questionId = `q_${columnIndex + 1}`

  // Detect field type based on header and data patterns
  const fieldType = detectFieldType(header, sampleData)
  
  if (!fieldType) {
    return null
  }

  const baseQuestion = {
    id: questionId,
    category: getFieldCategory(fieldType),
    type: fieldType,
    question: cleanHeader(header),
    required: isLikelyRequired(header, sampleData),
    description: '',
    placeholder: generatePlaceholder(header, fieldType),
    help_text: '',
    metadata: {}
  }

  // Add type-specific properties
  switch (fieldType) {
    case 'email':
      return {
        ...baseQuestion,
        category: 'text' as const,
        type: 'email' as const,
        validation: {
          inputType: 'email' as const,
          regex: /^\S+@\S+\.\S+$/,
          minLength: 5,
          maxLength: 255
        }
      }

    case 'radio':
    case 'checkbox':
    case 'select':
      const options = generateOptionsFromSampleData(sampleData)
      return {
        ...baseQuestion,
        category: fieldType === 'checkbox' ? 'choices' as const : 'choice' as const,
        type: fieldType,
        options: options.length > 0 ? options : generateDefaultOptions(header)
      }

    case 'yesno':
      return {
        ...baseQuestion,
        category: 'switch' as const,
        type: 'yesno' as const,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' }
        ]
      }

    case 'date':
      return {
        ...baseQuestion,
        category: 'text' as const,
        type: 'date' as const
      }

    case 'phone':
      return {
        ...baseQuestion,
        category: 'text' as const,
        type: 'phone' as const,
        validation: {
          inputType: 'phone' as const,
          regex: /^\+?[0-9\s]*$/,
          minLength: 10,
          maxLength: 15
        }
      }

    case 'number':
      const numericRange = detectNumericRange(sampleData)
      return {
        ...baseQuestion,
        category: 'text' as const,
        type: 'number' as const,
        ...(numericRange && { min: numericRange.min, max: numericRange.max })
      }

    case 'file':
      return {
        ...baseQuestion,
        category: 'file' as const,
        type: 'file' as const,
        allowed_types: ['image/*', 'application/pdf', '.doc', '.docx'],
        max_size_mb: 10
      }

    case 'rating':
      return {
        ...baseQuestion,
        category: 'rating' as const,
        type: 'rating' as const,
        icon_type: 'star' as const,
        min: 1,
        max: 5
      }

    default:
      return {
        ...baseQuestion,
        category: 'text' as const,
        type: fieldType === 'long' ? 'long' as const : 'short' as const
      }
  }
}

/**
 * Detect field type based on header and sample data
 */
function detectFieldType(header: string, sampleData: string[]): FormQuestionType | null {
  const headerLower = header.toLowerCase()
  
  // Check header patterns first
  if (headerLower.includes('email')) return 'email'
  if (headerLower.includes('phone') || headerLower.includes('tel')) return 'phone'
  if (headerLower.includes('date') || headerLower.includes('created') || headerLower.includes('updated')) return 'date'
  if (headerLower.includes('time')) return 'time'
  if (headerLower.includes('address')) return 'address'
  if (headerLower.includes('website') || headerLower.includes('url')) return 'website'
  if (headerLower.includes('file') || headerLower.includes('attachment') || headerLower.includes('image')) return 'file'
  if (headerLower.includes('rating') || headerLower.includes('score')) return 'rating'
  
  // Check for yes/no patterns
  if (headerLower.includes('yes') || headerLower.includes('no') || 
      headerLower.includes('approved') || headerLower.includes('active') ||
      headerLower.includes('enabled') || headerLower.includes('completed')) {
    return 'yesno'
  }

  // Analyze sample data patterns if available
  if (sampleData.length > 0) {
    // Check for email patterns
    if (sampleData.every(data => data.includes('@') && data.includes('.'))) {
      return 'email'
    }

    // Check for phone patterns
    if (sampleData.every(data => /^\+?[0-9\s\-\(\)]+$/.test(data))) {
      return 'phone'
    }

    // Check for date patterns
    if (sampleData.every(data => /^\d{4}-\d{2}-\d{2}/.test(data) || 
        /^\d{1,2}\/\d{1,2}\/\d{4}/.test(data) ||
        /^\d{1,2}-\d{1,2}-\d{4}/.test(data))) {
      return 'date'
    }

    // Check for yes/no patterns
    const yesNoValues = sampleData.map(d => d.toLowerCase()).flat()
    const uniqueValues = [...new Set(yesNoValues)]
    if (uniqueValues.length <= 3 && 
        uniqueValues.every(v => ['yes', 'no', 'true', 'false', '1', '0', 'y', 'n'].includes(v))) {
      return 'yesno'
    }

    // Check for numeric data
    if (sampleData.every(data => !isNaN(Number(data)) && data.trim() !== '')) {
      return 'number'
    }

    // Check for limited unique values (good for select/radio)
    if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
      return uniqueValues.length <= 5 ? 'radio' : 'select'
    }

    // Check for long text
    if (sampleData.some(data => data.length > 100)) {
      return 'long'
    }
  }

  // Default to short text
  return 'short'
}

/**
 * Get field category for question type
 */
function getFieldCategory(type: FormQuestionType): FormFieldCategory {
  switch (type) {
    case 'radio':
    case 'select':
      return 'choice'
    case 'checkbox':
    case 'tags':
      return 'choices'
    case 'file':
      return 'file'
    case 'rating':
      return 'rating'
    case 'yesno':
      return 'switch'
    case 'statement':
      return 'info'
    default:
      return 'text'
  }
}

/**
 * Clean up header text to make a good question
 */
function cleanHeader(header: string): string {
  return header
    .replace(/[_\-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate placeholder text for a field
 */
function generatePlaceholder(header: string, type: FormQuestionType): string {
  const headerLower = header.toLowerCase()
  
  switch (type) {
    case 'email':
      return 'Enter email address'
    case 'phone':
      return 'Enter phone number'
    case 'date':
      return 'Select date'
    case 'time':
      return 'Select time'
    case 'address':
      return 'Enter address'
    case 'website':
      return 'https://example.com'
    case 'number':
      if (headerLower.includes('age')) return 'Enter age'
      if (headerLower.includes('quantity')) return 'Enter quantity'
      if (headerLower.includes('price') || headerLower.includes('amount')) return '0.00'
      return 'Enter number'
    case 'long':
      return 'Enter detailed information'
    default:
      return `Enter ${headerLower.replace(/\s+/g, ' ')}`
  }
}

/**
 * Determine if a field is likely required based on header and data
 */
function isLikelyRequired(header: string, sampleData: string[]): boolean {
  const headerLower = header.toLowerCase()
  
  // Common required fields
  const requiredPatterns = ['name', 'email', 'phone', 'required', 'mandatory']
  if (requiredPatterns.some(pattern => headerLower.includes(pattern))) {
    return true
  }

  // If most rows have data, it's likely required
  if (sampleData.length > 0) {
    const nonEmptyCount = sampleData.filter(data => data.trim() !== '').length
    return (nonEmptyCount / sampleData.length) > 0.8
  }

  return false
}

/**
 * Generate options from sample data
 */
function generateOptionsFromSampleData(sampleData: string[]): Option[] {
  const uniqueValues = [...new Set(sampleData.filter(data => data.trim() !== ''))]
  
  return uniqueValues.slice(0, 10).map(value => ({
    value: value,
    label: value
  }))
}

/**
 * Generate default options for common field types
 */
function generateDefaultOptions(header: string): Option[] {
  const headerLower = header.toLowerCase()
  
  if (headerLower.includes('satisfaction') || headerLower.includes('rating')) {
    return [
      { value: 'very_satisfied', label: 'Very Satisfied' },
      { value: 'satisfied', label: 'Satisfied' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'dissatisfied', label: 'Dissatisfied' },
      { value: 'very_dissatisfied', label: 'Very Dissatisfied' }
    ]
  }
  
  if (headerLower.includes('priority')) {
    return [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' }
    ]
  }
  
  if (headerLower.includes('status')) {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ]
  }
  
  return [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ]
}

/**
 * Detect numeric range from sample data
 */
function detectNumericRange(sampleData: string[]): { min: number; max: number } | null {
  const numbers = sampleData
    .map(data => parseFloat(data))
    .filter(num => !isNaN(num))
  
  if (numbers.length === 0) return null
  
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers)
  }
}

/**
 * Calculate confidence score for field type detection
 */
function calculateConfidence(header: string, sampleData: string[], type: FormQuestionType): number {
  let confidence = 0.5 // Base confidence
  
  const headerLower = header.toLowerCase()
  
  // Header pattern matching
  if (type === 'email' && headerLower.includes('email')) confidence += 0.4
  if (type === 'phone' && (headerLower.includes('phone') || headerLower.includes('tel'))) confidence += 0.4
  if (type === 'date' && headerLower.includes('date')) confidence += 0.4
  if (type === 'yesno' && (headerLower.includes('yes') || headerLower.includes('active'))) confidence += 0.3
  
  // Data pattern matching
  if (sampleData.length > 0) {
    if (type === 'email' && sampleData.every(data => data.includes('@'))) confidence += 0.3
    if (type === 'phone' && sampleData.every(data => /^\+?[0-9\s\-\(\)]+$/.test(data))) confidence += 0.3
    if (type === 'date' && sampleData.every(data => /^\d{4}-\d{2}-\d{2}/.test(data) || 
        /^\d{1,2}\/\d{1,2}\/\d{4}/.test(data) ||
        /^\d{1,2}-\d{1,2}-\d{4}/.test(data))) confidence += 0.3
    if (type === 'yesno' && sampleData.every(data => ['yes', 'no', 'true', 'false', '1', '0'].includes(data.toLowerCase()))) confidence += 0.3
  }
  
  return Math.min(confidence, 1.0)
}
