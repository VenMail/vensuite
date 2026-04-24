<template>
  <Dialog v-model:open="isOpenModel">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Data Validation</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Validation Type -->
        <div class="space-y-2">
          <Label for="validation-type">Validation Type</Label>
          <Select v-model="validationType" @update:model-value="resetValidationValues">
            <SelectTrigger id="validation-type">
              <SelectValue placeholder="Select validation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">List of values</SelectItem>
              <SelectItem value="whole">Whole number</SelectItem>
              <SelectItem value="decimal">Decimal</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="textLength">Text length</SelectItem>
              <SelectItem value="custom">Custom formula</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Operator (for numeric/date validations) -->
        <div v-if="showOperator" class="space-y-2">
          <Label for="validation-operator">Operator</Label>
          <Select v-model="validationOperator">
            <SelectTrigger id="validation-operator">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="between">Between</SelectItem>
              <SelectItem value="notBetween">Not between</SelectItem>
              <SelectItem value="equal">Equal to</SelectItem>
              <SelectItem value="notEqual">Not equal to</SelectItem>
              <SelectItem value="greaterThan">Greater than</SelectItem>
              <SelectItem value="lessThan">Less than</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Validation Values -->
        <div class="space-y-2">
          <Label v-if="validationType === 'list'" for="validation-list">
            List of values (comma-separated)
          </Label>
          <Label v-else-if="validationType === 'custom'" for="validation-formula">
            Custom formula
          </Label>
          <Label v-else-if="showOperator && validationOperator === 'between'" for="validation-value1">
            Minimum value
          </Label>
          <Label v-else-if="showOperator" for="validation-value1">
            Value
          </Label>

          <Input
            v-if="validationType === 'list'"
            id="validation-list"
            v-model="validationValue1"
            placeholder="e.g., Option1, Option2, Option3"
          />
          <Input
            v-else-if="validationType === 'custom'"
            id="validation-formula"
            v-model="validationValue1"
            placeholder="e.g., =A1>100"
          />
          <Input
            v-else
            id="validation-value1"
            v-model="validationValue1"
            :type="validationType === 'date' ? 'date' : 'text'"
            :placeholder="getValuePlaceholder()"
          />
        </div>

        <!-- Second value for "between" operator -->
        <div v-if="showOperator && validationOperator === 'between'" class="space-y-2">
          <Label for="validation-value2">Maximum value</Label>
          <Input
            id="validation-value2"
            v-model="validationValue2"
            :type="validationType === 'date' ? 'date' : 'text'"
            :placeholder="getValuePlaceholder()"
          />
        </div>

        <!-- Input Message -->
        <div class="space-y-2">
          <Label for="input-message">Input message (shown when cell is selected)</Label>
          <Textarea
            id="input-message"
            v-model="validationInputMessage"
            placeholder="Enter a message to guide users"
            rows="2"
          />
        </div>

        <!-- Error Message -->
        <div class="space-y-2">
          <Label for="error-message">Error message (shown when validation fails)</Label>
          <Textarea
            id="error-message"
            v-model="validationErrorMessage"
            placeholder="Enter an error message"
            rows="2"
          />
        </div>

        <!-- Options -->
        <div class="space-y-3">
          <label class="flex items-center gap-2">
            <Checkbox
              v-model:checked="validationShowInputMessage"
              id="show-input-message"
            />
            <Label for="show-input-message" class="text-sm">Show input message</Label>
          </label>
          <label class="flex items-center gap-2">
            <Checkbox
              v-model:checked="validationShowErrorMessage"
              id="show-error-message"
            />
            <Label for="show-error-message" class="text-sm">Show error message</Label>
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeDialog">
          Cancel
        </Button>
        <Button @click="applyValidation" :disabled="!isValidConfig">
          Apply Validation
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
import Textarea from '@/components/ui/textarea/Textarea.vue'
import Label from '@/components/ui/label/Label.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
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
  initialOperator?: string
  initialValue1?: string
  initialValue2?: string
  initialInputMessage?: string
  initialErrorMessage?: string
  initialShowInputMessage?: boolean
  initialShowErrorMessage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialType: 'list',
  initialOperator: 'between',
  initialValue1: '',
  initialValue2: '',
  initialInputMessage: '',
  initialErrorMessage: 'Invalid input',
  initialShowInputMessage: true,
  initialShowErrorMessage: true
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  apply: [config: ValidationConfig]
}>()

interface ValidationConfig {
  type: string
  operator: string
  value1: string
  value2: string
  inputMessage: string
  errorMessage: string
  showInputMessage: boolean
  showErrorMessage: boolean
}

const isOpenModel = computed({
  get: () => props.isOpen,
  set: (v: boolean) => emit('update:isOpen', v)
})

const validationType = ref(props.initialType)
const validationOperator = ref(props.initialOperator)
const validationValue1 = ref(props.initialValue1)
const validationValue2 = ref(props.initialValue2)
const validationInputMessage = ref(props.initialInputMessage)
const validationErrorMessage = ref(props.initialErrorMessage)
const validationShowInputMessage = ref(props.initialShowInputMessage)
const validationShowErrorMessage = ref(props.initialShowErrorMessage)

const showOperator = computed(() => {
  return ['whole', 'decimal', 'date', 'textLength'].includes(validationType.value)
})

const isValidConfig = computed(() => {
  if (validationType.value === 'list') {
    return validationValue1.value.trim().length > 0
  }
  if (validationType.value === 'custom') {
    return validationValue1.value.trim().length > 0
  }
  if (showOperator.value) {
    if (validationOperator.value === 'between') {
      return validationValue1.value.trim().length > 0 && validationValue2.value.trim().length > 0
    }
    return validationValue1.value.trim().length > 0
  }
  return false
})

function getValuePlaceholder(): string {
  switch (validationType.value) {
    case 'whole':
    case 'decimal':
      return 'e.g., 100'
    case 'date':
      return 'e.g., 2024-01-01'
    case 'textLength':
      return 'e.g., 10'
    default:
      return 'Enter value'
  }
}

function resetValidationValues() {
  validationValue1.value = ''
  validationValue2.value = ''
  validationOperator.value = 'between'
}

function closeDialog() {
  emit('update:isOpen', false)
}

function applyValidation() {
  if (!isValidConfig.value) {
    toast.error('Please complete the validation configuration')
    return
  }

  const config: ValidationConfig = {
    type: validationType.value,
    operator: validationOperator.value,
    value1: validationValue1.value,
    value2: validationValue2.value,
    inputMessage: validationInputMessage.value,
    errorMessage: validationErrorMessage.value,
    showInputMessage: validationShowInputMessage.value,
    showErrorMessage: validationShowErrorMessage.value
  }

  emit('apply', config)
  closeDialog()
  toast.success('Data validation applied')
}

// Reset form when dialog opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    validationType.value = props.initialType
    validationOperator.value = props.initialOperator
    validationValue1.value = props.initialValue1
    validationValue2.value = props.initialValue2
    validationInputMessage.value = props.initialInputMessage
    validationErrorMessage.value = props.initialErrorMessage
    validationShowInputMessage.value = props.initialShowInputMessage
    validationShowErrorMessage.value = props.initialShowErrorMessage
  }
})
</script>
