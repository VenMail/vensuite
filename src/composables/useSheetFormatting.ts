import { ref } from 'vue'
import { toast } from '@/composables/useToast'

type CellRange = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

type CellStyleStore = Map<string, Map<string, Record<string, any>>>

export function useSheetFormatting(vtableRef: any) {
  const dataValidationOpen = ref(false)
  const validationType = ref('list')
  const validationOperator = ref('between')
  const validationValue1 = ref('')
  const validationValue2 = ref('')
  const validationInputMessage = ref('')
  const validationErrorMessage = ref('Invalid input')
  const validationShowInputMessage = ref(true)
  const validationShowErrorMessage = ref(true)

  const numberFormatOpen = ref(false)
  const numberFormatType = ref('general')
  const numberFormatDecimals = ref(2)
  const numberFormatSymbol = ref('$')
  const numberFormatCustomCode = ref('')

  const conditionalFormatOpen = ref(false)
  const conditionalFormatType = ref('colorScale')
  const conditionalFormatRule = ref({
    colorScale: {
      minColor: '#FF0000',
      midColor: '#FFFF00',
      maxColor: '#00FF00',
      minValue: 'auto',
      midValue: '50',
      maxValue: 'auto',
    },
    dataBar: {
      color: '#4472C4',
      showBarOnly: false,
      direction: 'leftToRight',
    },
    iconSet: {
      style: '3TrafficLights1',
      reverse: false,
      showIconOnly: false,
    },
    formula: {
      formula: '',
      format: '#FF0000',
    },
  })

  const manualCellStyles: CellStyleStore = new Map()
  const conditionalCellStyles: CellStyleStore = new Map()
  const validationCellStyles: CellStyleStore = new Map()

  function getActiveSheet() {
    return vtableRef.value?.getActiveSheet?.() ?? null
  }

  function getTableInstance(sheet = getActiveSheet()) {
    return sheet?.tableInstance ?? null
  }

  function getSheetKey(sheet = getActiveSheet()) {
    return sheet?.sheetKey ?? 'Sheet1'
  }

  function getSelection(sheet = getActiveSheet()): CellRange | null {
    const selection = sheet?.getSelection?.()
    if (!selection) return null
    return {
      startRow: Math.min(selection.startRow, selection.endRow ?? selection.startRow),
      startCol: Math.min(selection.startCol, selection.endCol ?? selection.startCol),
      endRow: Math.max(selection.startRow, selection.endRow ?? selection.startRow),
      endCol: Math.max(selection.startCol, selection.endCol ?? selection.startCol),
    }
  }

  function getCellKey(row: number, col: number) {
    return `${row}:${col}`
  }

  function getStoreSheetMap(store: CellStyleStore, sheetKey: string) {
    if (!store.has(sheetKey)) {
      store.set(sheetKey, new Map())
    }
    return store.get(sheetKey)!
  }

  function getStoredStyle(store: CellStyleStore, sheetKey: string, row: number, col: number) {
    return getStoreSheetMap(store, sheetKey).get(getCellKey(row, col))
  }

  function setStoredStyle(
    store: CellStyleStore,
    sheetKey: string,
    row: number,
    col: number,
    style: Record<string, any> | null,
  ) {
    const sheetMap = getStoreSheetMap(store, sheetKey)
    const key = getCellKey(row, col)
    if (!style || Object.keys(style).length === 0) {
      sheetMap.delete(key)
      return
    }
    sheetMap.set(key, style)
  }

  function getComposedStyle(sheetKey: string, row: number, col: number) {
    return {
      ...(getStoredStyle(manualCellStyles, sheetKey, row, col) ?? {}),
      ...(getStoredStyle(conditionalCellStyles, sheetKey, row, col) ?? {}),
      ...(getStoredStyle(validationCellStyles, sheetKey, row, col) ?? {}),
    }
  }

  function applyRenderedStyle(row: number, col: number, sheet = getActiveSheet()) {
    const table = getTableInstance(sheet)
    if (!sheet || !table) return
    const sheetKey = getSheetKey(sheet)
    const style = getComposedStyle(sheetKey, row, col)
    try {
      if (Object.keys(style).length === 0) {
        table.arrangeCustomCellStyle?.({ row, col }, null, false)
      } else {
        const styleId = `vensuite-${sheetKey}-${row}-${col}`
        table.registerCustomCellStyle?.(styleId, style)
        table.arrangeCustomCellStyle?.({ row, col }, styleId, false)
      }
      table.scenegraph?.updateNextFrame?.()
    } catch (error) {
      console.warn('Failed to apply cell style:', error)
    }
  }

  function forEachSelectedCell(callback: (row: number, col: number, sheet: any) => void) {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select one or more cells first')
      return false
    }

    for (let row = selection.startRow; row <= selection.endRow; row += 1) {
      for (let col = selection.startCol; col <= selection.endCol; col += 1) {
        callback(row, col, sheet)
      }
    }
    return true
  }

  function getSelectionValues(sheet = getActiveSheet()) {
    const data = sheet?.getData?.()
    const selection = getSelection(sheet)
    if (!Array.isArray(data) || !selection) return []
    const values: Array<{ row: number; col: number; value: any }> = []
    for (let row = selection.startRow; row <= selection.endRow; row += 1) {
      for (let col = selection.startCol; col <= selection.endCol; col += 1) {
        values.push({
          row,
          col,
          value: data[row]?.[col],
        })
      }
    }
    return values
  }

  function getFirstCellStyle() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) return {}
    return getComposedStyle(getSheetKey(sheet), selection.startRow, selection.startCol)
  }

  function updateManualStyle(
    patchFactory: (currentStyle: Record<string, any>) => Record<string, any> | null,
    successMessage: string,
  ) {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select one or more cells first')
      return
    }

    const sheetKey = getSheetKey(sheet)
    forEachSelectedCell((row, col) => {
      const current = getStoredStyle(manualCellStyles, sheetKey, row, col) ?? {}
      const next = patchFactory(current)
      setStoredStyle(manualCellStyles, sheetKey, row, col, next)
      applyRenderedStyle(row, col, sheet)
    })
    toast.success(successMessage)
  }

  function handleFormatBold() {
    const isActive = getFirstCellStyle().fontWeight === 'bold'
    updateManualStyle(
      current => {
        const next = { ...current }
        if (isActive) delete next.fontWeight
        else next.fontWeight = 'bold'
        return next
      },
      isActive ? 'Bold removed' : 'Bold applied',
    )
  }

  function handleFormatItalic() {
    const isActive = getFirstCellStyle().fontStyle === 'italic'
    updateManualStyle(
      current => {
        const next = { ...current }
        if (isActive) delete next.fontStyle
        else next.fontStyle = 'italic'
        return next
      },
      isActive ? 'Italic removed' : 'Italic applied',
    )
  }

  function handleFormatUnderline() {
    const isActive = Boolean(getFirstCellStyle().underline)
    updateManualStyle(
      current => {
        const next = { ...current }
        if (isActive) {
          delete next.underline
          delete next.underlineColor
        } else {
          next.underline = 1
          next.underlineColor = next.color ?? '#111827'
        }
        return next
      },
      isActive ? 'Underline removed' : 'Underline applied',
    )
  }

  function handleFormatStrike() {
    const isActive = Boolean(getFirstCellStyle().lineThrough)
    updateManualStyle(
      current => {
        const next = { ...current }
        if (isActive) {
          delete next.lineThrough
          delete next.lineThroughColor
        } else {
          next.lineThrough = 1
          next.lineThroughColor = next.color ?? '#111827'
        }
        return next
      },
      isActive ? 'Strikethrough removed' : 'Strikethrough applied',
    )
  }

  function handleDataValidation() {
    dataValidationOpen.value = true
    validationType.value = 'list'
    validationOperator.value = 'between'
    validationValue1.value = ''
    validationValue2.value = ''
    validationInputMessage.value = ''
    validationErrorMessage.value = 'Invalid input'
    validationShowInputMessage.value = true
    validationShowErrorMessage.value = true
  }

  function compareAgainstRule(value: any, left: number, right?: number) {
    const numeric = Number(value)
    switch (validationOperator.value) {
      case 'between':
        return numeric >= left && numeric <= Number(right)
      case 'notBetween':
        return numeric < left || numeric > Number(right)
      case 'equal':
        return numeric === left
      case 'notEqual':
        return numeric !== left
      case 'greaterThan':
        return numeric > left
      case 'lessThan':
        return numeric < left
      default:
        return true
    }
  }

  function isValidForRule(value: any, row: number, col: number, sheet: any) {
    const text = String(value ?? '').trim()
    if (text === '') return true

    switch (validationType.value) {
      case 'list': {
        const options = validationValue1.value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
        return options.length === 0 || options.includes(text)
      }
      case 'whole':
        return Number.isInteger(Number(text)) && compareAgainstRule(text, Number(validationValue1.value), Number(validationValue2.value))
      case 'decimal':
        return !Number.isNaN(Number(text)) && compareAgainstRule(text, Number(validationValue1.value), Number(validationValue2.value))
      case 'date': {
        const dateValue = new Date(text).getTime()
        const start = new Date(validationValue1.value).getTime()
        const end = validationValue2.value ? new Date(validationValue2.value).getTime() : undefined
        if (Number.isNaN(dateValue) || Number.isNaN(start)) return false
        return compareAgainstRule(dateValue, start, end)
      }
      case 'textLength':
        return compareAgainstRule(text.length, Number(validationValue1.value), Number(validationValue2.value))
      case 'custom':
        return evaluateFormulaCondition(validationValue1.value, value, row, col, sheet)
      default:
        return true
    }
  }

  function applyDataValidation() {
    const sheet = getActiveSheet()
    const selectionValues = getSelectionValues(sheet)
    if (!sheet || selectionValues.length === 0) {
      toast.error('Select one or more cells first')
      return
    }

    const sheetKey = getSheetKey(sheet)
    let invalidCount = 0
    let firstInvalid: { row: number; col: number } | null = null

    selectionValues.forEach(({ row, col, value }) => {
      if (isValidForRule(value, row, col, sheet)) {
        setStoredStyle(validationCellStyles, sheetKey, row, col, null)
      } else {
        setStoredStyle(validationCellStyles, sheetKey, row, col, {
          bgColor: '#FEE2E2',
          color: '#991B1B',
          borderColor: '#DC2626',
          borderLineWidth: [1, 1, 1, 1],
        })
        invalidCount += 1
        if (!firstInvalid) firstInvalid = { row, col }
      }
      applyRenderedStyle(row, col, sheet)
    })

    dataValidationOpen.value = false

    if (firstInvalid) {
      const target = firstInvalid as { row: number; col: number }
      getTableInstance(sheet)?.selectCells?.({ row: target.row, col: target.col })
      toast.error(validationErrorMessage.value || `${invalidCount} cells failed validation`)
      return
    }

    toast.success('Selection passed validation')
  }

  function handleNumberFormat() {
    numberFormatOpen.value = true
    numberFormatType.value = 'general'
    numberFormatDecimals.value = 2
    numberFormatSymbol.value = '$'
    numberFormatCustomCode.value = ''
  }

  function formatNumericValue(value: any) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return null

    switch (numberFormatType.value) {
      case 'number':
        return new Intl.NumberFormat(undefined, {
          minimumFractionDigits: numberFormatDecimals.value,
          maximumFractionDigits: numberFormatDecimals.value,
        }).format(numeric)
      case 'currency':
      case 'accounting':
        return `${numberFormatSymbol.value}${new Intl.NumberFormat(undefined, {
          minimumFractionDigits: numberFormatDecimals.value,
          maximumFractionDigits: numberFormatDecimals.value,
        }).format(numeric)}`
      case 'percentage':
        return `${(numeric * 100).toFixed(numberFormatDecimals.value)}%`
      case 'scientific':
        return numeric.toExponential(numberFormatDecimals.value)
      case 'fraction': {
        const denominator = 100
        const numerator = Math.round(numeric * denominator)
        return `${numerator}/${denominator}`
      }
      case 'text':
        return String(value ?? '')
      case 'custom':
        if (!numberFormatCustomCode.value.trim()) return String(value ?? '')
        return numberFormatCustomCode.value.replace(/\{value\}/g, String(value ?? ''))
      case 'general':
      default:
        return String(value ?? '')
    }
  }

  function applyNumberFormat() {
    const sheet = getActiveSheet()
    const selectionValues = getSelectionValues(sheet)
    if (!sheet || selectionValues.length === 0) {
      toast.error('Select one or more cells first')
      return
    }

    let updated = 0
    selectionValues.forEach(({ row, col, value }) => {
      const formatted = formatNumericValue(value)
      if (formatted === null) return
      sheet.setCellValue?.(col, row, formatted)
      updated += 1
    })

    numberFormatOpen.value = false
    if (updated === 0) {
      toast.info('No numeric cells were selected')
      return
    }
    toast.success(`Formatted ${updated} cell${updated === 1 ? '' : 's'}`)
  }

  function handleConditionalFormat() {
    conditionalFormatOpen.value = true
    conditionalFormatType.value = 'colorScale'
  }

  function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '')
    const value = normalized.length === 3
      ? normalized.split('').map(char => `${char}${char}`).join('')
      : normalized
    const parsed = Number.parseInt(value, 16)
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    }
  }

  function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`
  }

  function mixColors(start: string, end: string, amount: number) {
    const left = hexToRgb(start)
    const right = hexToRgb(end)
    return rgbToHex(
      Math.round(left.r + ((right.r - left.r) * amount)),
      Math.round(left.g + ((right.g - left.g) * amount)),
      Math.round(left.b + ((right.b - left.b) * amount)),
    )
  }

  function evaluateFormulaCondition(formula: string, cellValue: any, row: number, col: number, sheet = getActiveSheet()) {
    const expression = formula.trim().replace(/^=/, '')
    if (!expression) return false

    const address = sheet?.addressFromCoord?.({ row, col }) ?? `CELL`
    const jsExpression = expression
      .replace(new RegExp(`\\b${address}\\b`, 'gi'), 'value')
      .replace(/\bVALUE\b/gi, 'value')
      .replace(/<>/g, '!=')
      .replace(/([^=!<>])=([^=])/g, '$1==$2')

    try {
      return Boolean(new Function('value', `return (${jsExpression});`)(cellValue))
    } catch {
      return false
    }
  }

  function applyConditionalFormat() {
    const sheet = getActiveSheet()
    const selectionValues = getSelectionValues(sheet)
    if (!sheet || selectionValues.length === 0) {
      toast.error('Select one or more cells first')
      return
    }

    const sheetKey = getSheetKey(sheet)
    const numericValues = selectionValues
      .map(item => Number(item.value))
      .filter(value => !Number.isNaN(value))
    const min = numericValues.length > 0 ? Math.min(...numericValues) : 0
    const max = numericValues.length > 0 ? Math.max(...numericValues) : 0

    selectionValues.forEach(({ row, col, value }) => {
      let style: Record<string, any> | null = null

      if (conditionalFormatType.value === 'colorScale') {
        const numeric = Number(value)
        if (!Number.isNaN(numeric) && max !== min) {
          const midpoint = (min + max) / 2
          style = {
            bgColor: numeric <= midpoint
              ? mixColors(
                  conditionalFormatRule.value.colorScale.minColor,
                  conditionalFormatRule.value.colorScale.midColor,
                  (numeric - min) / Math.max(midpoint - min, 1),
                )
              : mixColors(
                  conditionalFormatRule.value.colorScale.midColor,
                  conditionalFormatRule.value.colorScale.maxColor,
                  (numeric - midpoint) / Math.max(max - midpoint, 1),
                ),
            color: '#111827',
          }
        }
      } else if (conditionalFormatType.value === 'dataBar') {
        const numeric = Number(value)
        if (!Number.isNaN(numeric) && max !== min) {
          const opacity = 0.15 + (0.55 * ((numeric - min) / Math.max(max - min, 1)))
          style = {
            bgColor: `${conditionalFormatRule.value.dataBar.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
            color: conditionalFormatRule.value.dataBar.showBarOnly ? 'transparent' : '#111827',
          }
        }
      } else if (conditionalFormatType.value === 'iconSet') {
        const numeric = Number(value)
        if (!Number.isNaN(numeric) && max !== min) {
          const ratio = (numeric - min) / Math.max(max - min, 1)
          style = {
            color: ratio >= 0.66 ? '#15803D' : ratio >= 0.33 ? '#CA8A04' : '#DC2626',
            fontWeight: 'bold',
          }
        }
      } else if (conditionalFormatType.value === 'formula') {
        if (evaluateFormulaCondition(conditionalFormatRule.value.formula.formula, value, row, col, sheet)) {
          style = {
            bgColor: conditionalFormatRule.value.formula.format,
            color: '#111827',
            fontWeight: 'bold',
          }
        }
      }

      setStoredStyle(conditionalCellStyles, sheetKey, row, col, style)
      applyRenderedStyle(row, col, sheet)
    })

    conditionalFormatOpen.value = false
    toast.success('Conditional formatting applied')
  }

  function clearConditionalFormats() {
    const sheet = getActiveSheet()
    const selection = getSelection(sheet)
    if (!sheet || !selection) {
      toast.error('Select one or more cells first')
      return
    }

    const sheetKey = getSheetKey(sheet)
    for (let row = selection.startRow; row <= selection.endRow; row += 1) {
      for (let col = selection.startCol; col <= selection.endCol; col += 1) {
        setStoredStyle(conditionalCellStyles, sheetKey, row, col, null)
        applyRenderedStyle(row, col, sheet)
      }
    }
    toast.success('Conditional formatting cleared')
  }

  // Font color
  function handleFontColor(color: string) {
    updateManualStyle(
      current => {
        const next = { ...current }
        if (!color || color === '#000000') {
          delete next.color
        } else {
          next.color = color
        }
        return next
      },
      'Font color applied',
    )
  }

  // Fill/background color
  function handleFillColor(bgColor: string) {
    updateManualStyle(
      current => {
        const next = { ...current }
        if (!bgColor || bgColor === '#ffffff' || bgColor === 'transparent') {
          delete next.bgColor
        } else {
          next.bgColor = bgColor
        }
        return next
      },
      'Fill color applied',
    )
  }

  // Horizontal alignment
  function handleAlign(align: 'left' | 'center' | 'right') {
    updateManualStyle(
      current => ({ ...current, textAlign: align }),
      `Aligned ${align}`,
    )
  }

  // Vertical alignment
  function handleVerticalAlign(verticalAlign: 'top' | 'middle' | 'bottom') {
    updateManualStyle(
      current => ({ ...current, verticalAlign }),
      `Vertical align ${verticalAlign}`,
    )
  }

  // Borders
  function handleBorder(
    borderType: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'none',
    color = '#000000',
    lineWidth = 1,
  ) {
    updateManualStyle(
      current => {
        const next = { ...current }
        if (borderType === 'none') {
          delete next.borderColor
          delete next.borderLineWidth
        } else {
          next.borderColor = color
          if (borderType === 'all') {
            next.borderLineWidth = [lineWidth, lineWidth, lineWidth, lineWidth] // [T, R, B, L]
          } else if (borderType === 'top') {
            next.borderLineWidth = [lineWidth, 0, 0, 0]
          } else if (borderType === 'right') {
            next.borderLineWidth = [0, lineWidth, 0, 0]
          } else if (borderType === 'bottom') {
            next.borderLineWidth = [0, 0, lineWidth, 0]
          } else if (borderType === 'left') {
            next.borderLineWidth = [0, 0, 0, lineWidth]
          }
        }
        return next
      },
      borderType === 'none' ? 'Borders cleared' : `${borderType} border applied`,
    )
  }

  return {
    dataValidationOpen,
    validationType,
    validationOperator,
    validationValue1,
    validationValue2,
    validationInputMessage,
    validationErrorMessage,
    validationShowInputMessage,
    validationShowErrorMessage,
    numberFormatOpen,
    numberFormatType,
    numberFormatDecimals,
    numberFormatSymbol,
    numberFormatCustomCode,
    conditionalFormatOpen,
    conditionalFormatType,
    conditionalFormatRule,
    handleFormatBold,
    handleFormatItalic,
    handleFormatUnderline,
    handleFormatStrike,
    handleFontColor,
    handleFillColor,
    handleAlign,
    handleVerticalAlign,
    handleBorder,
    handleDataValidation,
    applyDataValidation,
    handleNumberFormat,
    applyNumberFormat,
    handleConditionalFormat,
    applyConditionalFormat,
    clearConditionalFormats,
  }
}
