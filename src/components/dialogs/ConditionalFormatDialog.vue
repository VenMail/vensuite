<template>
  <Dialog v-model:open="isOpenModel">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Conditional Formatting</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Format Type -->
        <div class="space-y-2">
          <Label>Format Type</Label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="type in formatTypes"
              :key="type.value"
              @click="conditionalFormatType = type.value"
              :class="[
                'p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors',
                conditionalFormatType === type.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              ]"
            >
              <component :is="type.icon" class="h-5 w-5" />
              <span class="text-xs">{{ type.label }}</span>
            </button>
          </div>
        </div>

        <!-- Color Scale Options -->
        <div v-if="conditionalFormatType === 'colorScale'" class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label>Minimum Color</Label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="conditionalFormatRule.colorScale.minColor"
                  class="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input
                  v-model="conditionalFormatRule.colorScale.minColor"
                  class="flex-1"
                />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Midpoint Color</Label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="conditionalFormatRule.colorScale.midColor"
                  class="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input
                  v-model="conditionalFormatRule.colorScale.midColor"
                  class="flex-1"
                />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Maximum Color</Label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="conditionalFormatRule.colorScale.maxColor"
                  class="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input
                  v-model="conditionalFormatRule.colorScale.maxColor"
                  class="flex-1"
                />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Minimum Value</Label>
              <Input
                v-model="conditionalFormatRule.colorScale.minValue"
                placeholder="auto"
              />
            </div>
            <div class="space-y-2">
              <Label>Midpoint Value</Label>
              <Input
                v-model="conditionalFormatRule.colorScale.midValue"
                placeholder="50"
              />
            </div>
          </div>
        </div>

        <!-- Data Bar Options -->
        <div v-if="conditionalFormatType === 'dataBar'" class="space-y-4">
          <div class="space-y-2">
            <Label>Bar Color</Label>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="conditionalFormatRule.dataBar.color"
                class="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                v-model="conditionalFormatRule.dataBar.color"
                class="flex-1"
              />
            </div>
          </div>
          <label class="flex items-center gap-2">
            <Checkbox
              v-model:checked="conditionalFormatRule.dataBar.showBarOnly"
              id="show-bar-only"
            />
            <Label for="show-bar-only" class="text-sm">Show bar only (hide cell value)</Label>
          </label>
        </div>

        <!-- Icon Set Options -->
        <div v-if="conditionalFormatType === 'iconSet'" class="space-y-4">
          <div class="space-y-2">
            <Label>Icon Style</Label>
            <Select v-model="conditionalFormatRule.iconSet.style">
              <SelectTrigger>
                <SelectValue placeholder="Select icon style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3TrafficLights1">3 Traffic Lights</SelectItem>
                <SelectItem value="3TrafficLights2">3 Traffic Lights (Rim)</SelectItem>
                <SelectItem value="3Signs">3 Signs</SelectItem>
                <SelectItem value="3Symbols">3 Symbols</SelectItem>
                <SelectItem value="3Arrows">3 Arrows</SelectItem>
                <SelectItem value="4Arrows">4 Arrows</SelectItem>
                <SelectItem value="5Arrows">5 Arrows</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label class="flex items-center gap-2">
            <Checkbox
              v-model:checked="conditionalFormatRule.iconSet.reverse"
              id="reverse-icons"
            />
            <Label for="reverse-icons" class="text-sm">Reverse icon order</Label>
          </label>
          <label class="flex items-center gap-2">
            <Checkbox
              v-model:checked="conditionalFormatRule.iconSet.showIconOnly"
              id="show-icon-only"
            />
            <Label for="show-icon-only" class="text-sm">Show icon only</Label>
          </label>
        </div>

        <!-- Formula Options -->
        <div v-if="conditionalFormatType === 'formula'" class="space-y-4">
          <div class="space-y-2">
            <Label for="formula-input">Formula</Label>
            <Input
              id="formula-input"
              v-model="conditionalFormatRule.formula.formula"
              placeholder="e.g., =A1>100"
            />
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Use cell references to create conditional rules. The formula should evaluate to TRUE or FALSE.
            </p>
          </div>
          <div class="space-y-2">
            <Label>Format Color</Label>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="conditionalFormatRule.formula.format"
                class="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                v-model="conditionalFormatRule.formula.format"
                class="flex-1"
              />
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="space-y-2">
          <Label>Preview</Label>
          <div class="flex gap-2">
            <div
              v-if="conditionalFormatType === 'colorScale'"
              class="flex-1 h-8 rounded"
              :style="{
                background: `linear-gradient(to right, ${conditionalFormatRule.colorScale.minColor}, ${conditionalFormatRule.colorScale.midColor}, ${conditionalFormatRule.colorScale.maxColor})`
              }"
            />
            <div
              v-else-if="conditionalFormatType === 'dataBar'"
              class="flex-1 h-8 rounded bg-gray-100 dark:bg-gray-800 relative overflow-hidden"
            >
              <div
                class="h-full"
                :style="{
                  width: '75%',
                  backgroundColor: conditionalFormatRule.dataBar.color
                }"
              />
            </div>
            <div
              v-else-if="conditionalFormatType === 'iconSet'"
              class="flex-1 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center gap-2"
            >
              <span class="text-2xl">🔴</span>
              <span class="text-2xl">🟡</span>
              <span class="text-2xl">🟢</span>
            </div>
            <div
              v-else-if="conditionalFormatType === 'formula'"
              class="flex-1 h-8 rounded"
              :style="{ backgroundColor: conditionalFormatRule.formula.format }"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeDialog">
          Cancel
        </Button>
        <Button @click="applyConditionalFormat">
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
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  PaletteIcon,
  BarChart3Icon,
  StarIcon,
  CalculatorIcon
} from 'lucide-vue-next'
import { toast } from '@/composables/useToast'

interface Props {
  isOpen: boolean
  initialType?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialType: 'colorScale'
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  apply: [config: ConditionalFormatConfig]
}>()

interface ConditionalFormatConfig {
  type: string
  rule: any
}

const formatTypes = [
  { value: 'colorScale', label: 'Color Scale', icon: PaletteIcon },
  { value: 'dataBar', label: 'Data Bar', icon: BarChart3Icon },
  { value: 'iconSet', label: 'Icon Set', icon: StarIcon },
  { value: 'formula', label: 'Formula', icon: CalculatorIcon }
]

const isOpenModel = computed({
  get: () => props.isOpen,
  set: (v: boolean) => emit('update:isOpen', v)
})

const conditionalFormatType = ref(props.initialType)

const conditionalFormatRule = ref<any>({
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

function closeDialog() {
  emit('update:isOpen', false)
}

function applyConditionalFormat() {
  const config: ConditionalFormatConfig = {
    type: conditionalFormatType.value,
    rule: conditionalFormatRule.value[conditionalFormatType.value]
  }

  emit('apply', config)
  closeDialog()
  toast.success('Conditional formatting applied')
}

// Reset form when dialog opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    conditionalFormatType.value = props.initialType
  }
})
</script>
