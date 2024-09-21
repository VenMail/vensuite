<script setup lang="ts">
import { ref, computed } from 'vue';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TextQuestionProps {
  question: {
    id: string;
    text: string;
    type: 'text' | 'email' | 'url' | 'textarea';
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  value: string;
}

const props = defineProps<TextQuestionProps>();
const emit = defineEmits(['update:value']);

const localValue = computed({
  get: () => props.value,
  set: (value) => emit('update:value', value)
});

const error = ref('');

const validate = () => {
  error.value = '';
  
  if (props.question.minLength && localValue.value.length < props.question.minLength) {
    error.value = `Minimum length is ${props.question.minLength} characters`;
  } else if (props.question.maxLength && localValue.value.length > props.question.maxLength) {
    error.value = `Maximum length is ${props.question.maxLength} characters`;
  } else if (props.question.pattern && !new RegExp(props.question.pattern).test(localValue.value)) {
    error.value = 'Invalid format';
  } else if (props.question.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localValue.value)) {
    error.value = 'Invalid email format';
  } else if (props.question.type === 'url' && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(localValue.value)) {
    error.value = 'Invalid URL format';
  }
};
</script>

<template>
  <div class="space-y-2">
    <Label :for="question.id">{{ question.text }}</Label>
    <Textarea
      v-if="question.type === 'textarea'"
      :id="question.id"
      v-model="localValue"
      :placeholder="question.placeholder"
      @blur="validate"
    ></Textarea>
    <Input
      v-else
      :id="question.id"
      v-model="localValue"
      :type="question.type === 'email' ? 'email' : 'text'"
      :placeholder="question.placeholder"
      @blur="validate"
    />
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
  </div>
</template>