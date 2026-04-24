<template>
  <Dialog v-model:open="isOpenModel">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Format Cells</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Format Category -->
        <div class="space-y-2">
          <Label for="format-category">Category</Label>
          <Select v-model="numberFormatType" @update:model-value="resetFormatValues">
            <SelectTrigger id="format-category">
              <SelectValue placeholder="Select format category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="accounting">Accounting</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fraction">Fraction</SelectItem>
              <SelectItem value="scientific">Scientific</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Decimal Places (for numeric formats) -->
        <div v-if="showDecimalPlaces" class="space-y-2">
          <Label for="decimal-places">Decimal places</Label>
          <Input
            id="decimal-places"
            v-model.number="numberFormatDecimals"
            type="number"
            min="0"
            max="30"
            class="w-24"
          />
        </div>

        <!-- Symbol (for currency/accounting) -->
        <div v-if="showSymbol" class="space-y-2">
          <Label for="currency-symbol">Symbol</Label>
          <Select v-model="numberFormatSymbol">
            <SelectTrigger id="currency-symbol">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="$">$ (Dollar)</SelectItem>
              <SelectItem value="€">€ (Euro)</SelectItem>
              <SelectItem value="£">£ (Pound)</SelectItem>
              <SelectItem value="¥">¥ (Yen)</SelectItem>
              <SelectItem value="₹">₹ (Rupee)</SelectItem>
              <SelectItem value="₽">₽ (Ruble)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Custom Format Code -->
        <div v-if="numberFormatType === 'custom'" class="space-y-2">
          <Label for="custom-format">Custom format code</Label>
          <Input
            id="custom-format"
            v-model="numberFormatCustomCode"
            placeholder="e.g., #,##0.00;[Red]-#,##0.00"
          />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Use Excel-style format codes. Examples: #,##0.00, 0.00%, dd/mm/yyyy
          </p>
        </div>

        <!-- Format Examples -->
        <div class="space-y-2">
          <Label>Preview</Label>
          <div class="border border-gray-300 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-800">
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">1234.567</span>
                <span class="font-mono">{{ formatExample(1234.567) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">-1234.567</span>
                <span class="font-mono">{{ formatExample(-1234.567) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600 dark:text-gray-400">0.1234</span>
                <span class="font-mono">{{ formatExample(0.1234) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Format Description -->
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ getFormatDescription() }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeDialog">
          Cancel
        </Button>
        <Button @click="applyNumberFormat">
          Apply Format
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { toast } from '@/composables/useToast'

interface Props {
  isOpen: boolean
  initialType?: string
  initialDecimals?: number
  initialSymbol?: string
  initialCustomCode?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialType: 'general',
  initialDecimals: 2,
  initialSymbol: '$',
  initialCustomCode: ''
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  apply: [config: NumberFormatConfig]
}>()

interface NumberFormatConfig {
  type: string
  decimals: number
  symbol: string
  customCode: string
}

const isOpenModel = computed({
  get: () => props.isOpen,
  set: (v: boolean) => emit('update:isOpen', v)
})

const numberFormatType = ref(props.initialType)
const numberFormatDecimals = ref(props.initialDecimals)
const numberFormatSymbol = ref(props.initialSymbol)
const numberFormatCustomCode = ref(props.initialCustomCode)

const showDecimalPlaces = computed(() => {
  return ['number', 'currency', 'accounting', 'percentage', 'scientific'].includes(numberFormatType.value)
})

const showSymbol = computed(() => {
  return ['currency', 'accounting'].includes(numberFormatType.value)
})

function resetFormatValues() {
  numberFormatDecimals.value = 2
  numberFormatSymbol.value = '$'
  numberFormatCustomCode.value = ''
}

function formatExample(value: number): string {
  switch (numberFormatType.value) {
    case 'number':
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: numberFormatDecimals.value,
        maximumFractionDigits: numberFormatDecimals.value
      }).format(value)
    case 'currency':
    case 'accounting':
      return `${numberFormatSymbol.value}${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: numberFormatDecimals.value,
        maximumFractionDigits: numberFormatDecimals.value
      }).format(value)}`
    case 'percentage':
      return `${(value * 100).toFixed(numberFormatDecimals.value)}%`
    case 'scientific':
      return value.toExponential(numberFormatDecimals.value)
    case 'fraction':
      const denominator = 100
      const numerator = Math.round(value * denominator)
      return `${numerator}/${denominator}`
    case 'text':
      return String(value)
    case 'custom':
      if (!numberFormatCustomCode.value.trim()) return String(value)
      return numberFormatCustomCode.value.replace(/\{value\}/g, String(value))
    case 'general':
    default:
      return String(value)
  }
}

function getFormatDescription(): string {
  switch (numberFormatType.value) {
    case 'general':
      return 'No specific formatting. Displays numbers as entered.'
    case 'number':
      return 'Display numbers with specified decimal places.'
    case 'currency':
      return 'Display numbers as currency with a symbol.'
    case 'accounting':
      return 'Accounting format for financial data.'
    case 'percentage':
      return 'Display numbers as percentages.'
    case 'fraction':
      return 'Display numbers as fractions.'
    case 'scientific':
      return 'Display numbers in scientific notation.'
    case 'text':
      return 'Treat values as text, preventing calculations.'
    case 'custom':
      return 'Use a custom format code for advanced formatting.'
    default:
      return ''
  }
}

function closeDialog() {
  emit('update:isOpen', false)
}

function applyNumberFormat() {
  const config: NumberFormatConfig = {
    type: numberFormatType.value,
    decimals: numberFormatDecimals.value,
    symbol: numberFormatSymbol.value,
    customCode: numberFormatCustomCode.value
  }

  emit('apply', config)
  closeDialog()
  toast.success('Number format applied')
}

// Reset form when dialog opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    numberFormatType.value = props.initialType
    numberFormatDecimals.value = props.initialDecimals
    numberFormatSymbol.value = props.initialSymbol
    numberFormatCustomCode.value = props.initialCustomCode
  }
})
</script>
