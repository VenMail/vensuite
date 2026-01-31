import { ref } from 'vue'
import { toast } from '@/composables/useToast'

export function useSheetFormatting(univerRef: any) {
  // Data Validation state
  const dataValidationOpen = ref(false)
  const validationType = ref('list') // list, whole, decimal, date, textLength, custom
  const validationOperator = ref('between') // between, notBetween, equal, notEqual, greaterThan, lessThan, etc.
  const validationValue1 = ref('')
  const validationValue2 = ref('')
  const validationInputMessage = ref('')
  const validationErrorMessage = ref('Invalid input')
  const validationShowInputMessage = ref(true)
  const validationShowErrorMessage = ref(true)

  // Number Formatting state
  const numberFormatOpen = ref(false)
  const numberFormatType = ref('general') // general, number, currency, accounting, percentage, fraction, scientific, text, custom
  const numberFormatDecimals = ref(2)
  const numberFormatSymbol = ref('$')
  const numberFormatCustomCode = ref('')

  // Conditional Formatting state
  const conditionalFormatOpen = ref(false)
  const conditionalFormatType = ref('colorScale') // colorScale, dataBar, iconSet, formula
  const conditionalFormatRule = ref({
    colorScale: {
      minColor: '#FF0000',
      midColor: '#FFFF00',
      maxColor: '#00FF00',
      minValue: 'auto',
      midValue: '50',
      maxValue: 'auto'
    },
    dataBar: {
      color: '#4472C4',
      showBarOnly: false,
      direction: 'leftToRight'
    },
    iconSet: {
      style: '3TrafficLights1',
      reverse: false,
      showIconOnly: false
    },
    formula: {
      formula: '',
      format: '#FF0000'
    }
  })

  // Formatting actions
  function handleFormatBold() {
    try {
      const wb = univerRef.value?.fUniver?.getActiveWorkbook()
      const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
      range?.setFontWeight('bold')
    } catch {}
  }

  function handleFormatItalic() {
    try {
      const wb = univerRef.value?.fUniver?.getActiveWorkbook()
      const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
      range?.setFontStyle('italic')
    } catch {}
  }

  function handleFormatUnderline() {
    try {
      const wb = univerRef.value?.fUniver?.getActiveWorkbook()
      const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
      range?.setFontLine('underline')
    } catch {}
  }

  function handleFormatStrike() {
    try {
      const wb = univerRef.value?.fUniver?.getActiveWorkbook()
      const range = wb?.getActiveSheet()?.getSelection()?.getActiveRange()
      range?.setFontLine('line-through')
    } catch {}
  }

  // Data Validation functions
  function handleDataValidation() {
    dataValidationOpen.value = true
    // Reset form
    validationType.value = 'list'
    validationOperator.value = 'between'
    validationValue1.value = ''
    validationValue2.value = ''
    validationInputMessage.value = ''
    validationErrorMessage.value = 'Invalid input'
    validationShowInputMessage.value = true
    validationShowErrorMessage.value = true
  }

  function applyDataValidation() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to apply validation')
        return
      }
      
      // Build validation rule
      const validationRule: any = {
        type: validationType.value,
        operator: validationOperator.value,
        showInputMessage: validationShowInputMessage.value,
        showErrorMessage: validationShowErrorMessage.value
      }
      
      // Set values based on validation type
      if (validationType.value === 'list') {
        validationRule.formula1 = validationValue1.value || 'Option1,Option2,Option3'
      } else if (validationType.value === 'custom') {
        validationRule.formula1 = validationValue1.value
      } else {
        validationRule.formula1 = validationValue1.value
        if (validationOperator.value === 'between' || validationOperator.value === 'notBetween') {
          validationRule.formula2 = validationValue2.value
        }
      }
      
      // Set input and error messages
      if (validationShowInputMessage.value && validationInputMessage.value) {
        validationRule.inputTitle = 'Input Message'
        validationRule.inputMessage = validationInputMessage.value
      }
      
      if (validationShowErrorMessage.value && validationErrorMessage.value) {
        validationRule.errorTitle = 'Validation Error'
        validationRule.errorMessage = validationErrorMessage.value
        validationRule.errorStyle = 'stop' // stop, warning, information
      }
      
      // Apply validation to the range
      range?.setDataValidation(validationRule)
      
      toast.success('Data validation applied successfully')
      dataValidationOpen.value = false
    } catch (error) {
      console.error('Error applying data validation:', error)
      toast.error('Failed to apply data validation')
    }
  }

  // Number Formatting functions
  function handleNumberFormat() {
    numberFormatOpen.value = true
    // Reset form
    numberFormatType.value = 'general'
    numberFormatDecimals.value = 2
    numberFormatSymbol.value = '$'
    numberFormatCustomCode.value = ''
  }

  function applyNumberFormat() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to apply number format')
        return
      }
      
      let formatCode = 'General'
      
      switch (numberFormatType.value) {
        case 'general':
          formatCode = 'General'
          break
        case 'number':
          formatCode = `0.${'0'.repeat(numberFormatDecimals.value)}`
          break
        case 'currency':
          formatCode = `${numberFormatSymbol.value}#,##0.${'0'.repeat(numberFormatDecimals.value)}`
          break
        case 'accounting':
          formatCode = `_(${numberFormatSymbol.value}* #,##0.${'0'.repeat(numberFormatDecimals.value)};_(${numberFormatSymbol.value}* #,##0.${'0'.repeat(numberFormatDecimals.value)};_(${numberFormatSymbol.value}* "-"??;_(@_)`
          break
        case 'percentage':
          formatCode = `0.${'0'.repeat(numberFormatDecimals.value)}%`
          break
        case 'fraction':
          formatCode = '# ?/?'
          break
        case 'scientific':
          formatCode = '0.00E+00'
          break
        case 'text':
          formatCode = '@'
          break
        case 'custom':
          formatCode = numberFormatCustomCode.value || 'General'
          break
      }
      
      // Apply number format to the range
      range?.setNumberFormat(formatCode)
      
      toast.success('Number format applied successfully')
      numberFormatOpen.value = false
    } catch (error) {
      console.error('Error applying number format:', error)
      toast.error('Failed to apply number format')
    }
  }

  // Conditional Formatting functions
  function handleConditionalFormat() {
    conditionalFormatOpen.value = true
    // Reset form
    conditionalFormatType.value = 'colorScale'
    conditionalFormatRule.value = {
      colorScale: {
        minColor: '#FF0000',
        midColor: '#FFFF00',
        maxColor: '#00FF00',
        minValue: 'auto',
        midValue: '50',
        maxValue: 'auto'
      },
      dataBar: {
        color: '#4472C4',
        showBarOnly: false,
        direction: 'leftToRight'
      },
      iconSet: {
        style: '3TrafficLights1',
        reverse: false,
        showIconOnly: false
      },
      formula: {
        formula: '',
        format: '#FF0000'
      }
    }
  }

  function applyConditionalFormat() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to apply conditional formatting')
        return
      }
      
      let rule: any = {}
      
      switch (conditionalFormatType.value) {
        case 'colorScale':
          rule = {
            type: 'colorScale',
            colorScale: {
              minColor: conditionalFormatRule.value.colorScale.minColor,
              midColor: conditionalFormatRule.value.colorScale.midColor,
              maxColor: conditionalFormatRule.value.colorScale.maxColor,
              minValue: conditionalFormatRule.value.colorScale.minValue === 'auto' ? null : parseFloat(conditionalFormatRule.value.colorScale.minValue),
              midValue: conditionalFormatRule.value.colorScale.midValue === 'auto' ? null : parseFloat(conditionalFormatRule.value.colorScale.midValue),
              maxValue: conditionalFormatRule.value.colorScale.maxValue === 'auto' ? null : parseFloat(conditionalFormatRule.value.colorScale.maxValue)
            }
          }
          break
          
        case 'dataBar':
          rule = {
            type: 'dataBar',
            dataBar: {
              color: conditionalFormatRule.value.dataBar.color,
              showBarOnly: conditionalFormatRule.value.dataBar.showBarOnly,
              direction: conditionalFormatRule.value.dataBar.direction
            }
          }
          break
          
        case 'iconSet':
          rule = {
            type: 'iconSet',
            iconSet: {
              style: conditionalFormatRule.value.iconSet.style,
              reverse: conditionalFormatRule.value.iconSet.reverse,
              showIconOnly: conditionalFormatRule.value.iconSet.showIconOnly
            }
          }
          break
          
        case 'formula':
          if (!conditionalFormatRule.value.formula.formula.trim()) {
            toast.info('Please enter a formula')
            return
          }
          rule = {
            type: 'formula',
            formula: {
              formula: conditionalFormatRule.value.formula.formula,
              format: conditionalFormatRule.value.formula.format
            }
          }
          break
      }
      
      // Apply conditional formatting rule to the range
      worksheet?.setConditionalFormat(range, rule)
      
      toast.success('Conditional formatting applied successfully')
      conditionalFormatOpen.value = false
    } catch (error) {
      console.error('Error applying conditional formatting:', error)
      toast.error('Failed to apply conditional formatting')
    }
  }

  function clearConditionalFormats() {
    try {
      const workbook = univerRef.value?.fUniver?.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = worksheet?.getSelection()?.getActiveRange()
      
      if (!range) {
        toast.info('Please select a range to clear conditional formatting')
        return
      }
      
      // Clear all conditional formatting rules from the range
      worksheet?.clearConditionalFormats(range)
      
      toast.success('Conditional formatting cleared successfully')
      conditionalFormatOpen.value = false
    } catch (error) {
      console.error('Error clearing conditional formatting:', error)
      toast.error('Failed to clear conditional formatting')
    }
  }

  return {
    // State
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
    
    // Methods
    handleFormatBold,
    handleFormatItalic,
    handleFormatUnderline,
    handleFormatStrike,
    handleDataValidation,
    applyDataValidation,
    handleNumberFormat,
    applyNumberFormat,
    handleConditionalFormat,
    applyConditionalFormat,
    clearConditionalFormats,
  }
}
