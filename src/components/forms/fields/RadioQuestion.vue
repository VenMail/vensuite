<script setup lang="ts">
import { computed } from 'vue';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Star } from 'lucide-vue-next';

interface RadioQuestionProps {
  question: {
    id: string;
    text: string;
    type: 'radio' | 'select' | 'slider' | 'range' | 'rating' | 'yesno';
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
    step?: number;
    flow?: { [key: string]: string }; // For handling conditional logic based on responses
  };
  value: string | number;
}

const props = defineProps<RadioQuestionProps>();
const emit = defineEmits(['update:value', 'flowChange']);

// Local value computed property to handle v-model binding
const localValue = computed({
  get: () => props.value,
  set: (value) => {
    emit('update:value', value);
    handleFlowChange(value as string); // Handle conditional flow logic when value changes
  },
});

// Handle flow logic based on current response
const handleFlowChange = (value: string | number) => {
  if (props.question.flow && props.question.flow[value]) {
    emit('flowChange', props.question.flow[value]);
  }
};
</script>

<template>
  <div class="space-y-2">
    <Label>{{ question.text }}</Label>

    <!-- Render Radio Group -->
    <RadioGroup v-if="question.type === 'radio'" :v-model="localValue">
      <div
        v-for="(option, optionIndex) in question.options"
        :key="optionIndex"
        class="flex items-center space-x-2"
      >
        <RadioGroupItem :value="option.value" :id="`${question.id}-${option.value}`" />
        <Label :for="`${question.id}-${option.value}`">{{ option.label }}</Label>
      </div>
    </RadioGroup>

    <!-- Render Slider/Range -->
    <Slider
      v-else-if="question.type === 'slider' || question.type === 'range'"
      :v-model="localValue"
      :min="question.min || 0"
      :max="question.max || 100"
      :step="question.step || 1"
      class="w-full"
    />

    <!-- Render Rating -->
    <div v-else-if="question.type === 'rating'" class="flex space-x-2">
      <button
        v-for="rating in (question.max || 5)"
        :key="rating"
        :class="['p-1 rounded-full', localValue as number >= rating ? 'text-yellow-400' : 'text-gray-300']"
        @click="localValue = rating"
      >
        <Star class="w-6 h-6" />
      </button>
    </div>

    <!-- Render Yes/No Switch -->
    <Switch
      v-else-if="question.type === 'yesno'"
      :v-model="localValue"
      class="data-[state=checked]:bg-green-500"
    />
  </div>
</template>
