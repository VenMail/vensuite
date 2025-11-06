<template>
  <div class="space-y-3">
    <div class="space-y-1.5">
      <label :for="inputId" class="flex items-baseline gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
        <span>{{ label }}</span>
        <span v-if="required" class="text-rose-500" aria-label="required">*</span>
      </label>
      
      <p v-if="description" class="text-sm text-slate-600 dark:text-slate-400">
        {{ description }}
      </p>
    </div>

    <!-- Short Text Inputs -->
    <input
      v-if="isShortInput"
      :id="inputId"
      :type="inputType"
      class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
      :placeholder="placeholder"
      :value="stringValue"
      :disabled="disabled"
      :required="required"
      @input="updateValue(($event.target as HTMLInputElement).value)"
    />

    <!-- Long Text Input -->
    <textarea
      v-else-if="isLongInput"
      :id="inputId"
      class="min-h-[140px] w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
      :placeholder="placeholder"
      :value="stringValue"
      :disabled="disabled"
      :required="required"
      @input="updateValue(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- Radio Buttons -->
    <fieldset v-else-if="type === 'radio'" class="space-y-2.5">
      <label
        v-for="(option, idx) in options"
        :key="option.value"
        class="flex items-center gap-3 cursor-pointer group"
      >
        <input
          :id="`${inputId}-${idx}`"
          type="radio"
          :name="question.id"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="disabled"
          class="h-4 w-4 cursor-pointer border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-primary-500 dark:focus:ring-primary-400"
          @change="updateValue(option.value)"
        />
        <span class="text-sm text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white transition-colors">
          {{ option.label }}
        </span>
      </label>
    </fieldset>

    <!-- Select Dropdown -->
    <select
      v-else-if="type === 'select'"
      :id="inputId"
      class="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
      :value="(modelValue as string) ?? ''"
      :disabled="disabled"
      :required="required"
      @change="updateValue(($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Select an option</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <!-- Checkboxes -->
    <fieldset v-else-if="isMultiChoice" class="space-y-2.5">
      <label
        v-for="(option, idx) in options"
        :key="option.value"
        class="flex items-center gap-3 cursor-pointer group"
      >
        <input
          :id="`${inputId}-${idx}`"
          type="checkbox"
          :value="option.value"
          :checked="arrayValue.includes(option.value)"
          :disabled="disabled"
          class="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-primary-500 dark:focus:ring-primary-400"
          @change="toggleCheckbox(option.value, ($event.target as HTMLInputElement).checked)"
        />
        <span class="text-sm text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white transition-colors">
          {{ option.label }}
        </span>
      </label>
    </fieldset>

    <!-- Yes/No Toggle -->
    <label v-else-if="type === 'yesno'" class="flex items-center gap-3 cursor-pointer group">
      <input
        :id="inputId"
        type="checkbox"
        :checked="booleanValue"
        :disabled="disabled"
        class="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-primary-500 dark:focus:ring-primary-400"
        @change="updateValue(($event.target as HTMLInputElement).checked)"
      />
      <span class="text-sm text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white transition-colors">
        {{ yesNoLabel }}
      </span>
    </label>

    <!-- Slider -->
    <div v-else-if="isSlider" class="space-y-2">
      <input
        :id="inputId"
        type="range"
        class="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:accent-primary-500 dark:focus:ring-primary-400"
        :min="sliderConfig?.min ?? 0"
        :max="sliderConfig?.max ?? 100"
        :step="sliderConfig?.step ?? 1"
        :value="numberValue"
        :disabled="disabled"
        @input="updateValue(Number(($event.target as HTMLInputElement).value))"
      />
      <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{{ sliderConfig?.min ?? 0 }}</span>
        <output class="font-semibold text-slate-900 dark:text-white">{{ numberValue }}</output>
        <span>{{ sliderConfig?.max ?? 100 }}</span>
      </div>
    </div>

    <!-- Rating -->
    <div v-else-if="type === 'rating'" class="flex flex-wrap gap-2">
      <button
        v-for="ratingValue in ratingScale"
        :key="ratingValue"
        type="button"
        :class="[
          'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          numberValue >= ratingValue
            ? 'border-amber-400 bg-amber-400 text-amber-950 hover:bg-amber-500 dark:border-amber-500 dark:bg-amber-500'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        ]"
        :disabled="disabled"
        @click="updateValue(ratingValue)"
      >
        {{ ratingValue }}
      </button>
    </div>

    <!-- Statement -->
    <div 
      v-else-if="type === 'statement'"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300" 
      v-html="statementHtml"
    />

    <!-- File Upload -->
    <div v-else-if="type === 'file'" class="space-y-3">
      <input
        :id="inputId"
        type="file"
        class="w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-900 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:file:bg-primary-900/30 dark:file:text-primary-300 dark:hover:file:bg-primary-900/50 dark:focus:border-primary-400 dark:focus:ring-primary-400"
        :multiple="isMultipleFiles"
        :disabled="disabled"
        :required="required"
        @change="handleFileChange"
      />
      <ul v-if="fileNames.length" class="space-y-1.5">
        <li v-for="name in fileNames" :key="name" class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="truncate">{{ name }}</span>
        </li>
      </ul>
    </div>

    <!-- Fallback Input -->
    <input
      v-else
      :id="inputId"
      type="text"
      class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
      :placeholder="placeholder"
      :value="stringValue"
      :disabled="disabled"
      :required="required"
      @input="updateValue(($event.target as HTMLInputElement).value)"
    />

    <!-- Help Text -->
    <p v-if="question.help_text" class="text-xs text-slate-500 dark:text-slate-400">
      {{ question.help_text }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FormQuestion, Option } from '@/types';

const props = defineProps<{
  question: FormQuestion;
  modelValue: unknown;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();

const inputId = computed(() => `question-${props.question.id}`);
const type = computed(() => props.question.type);
const label = computed(() => props.question.question ?? 'Untitled question');
const description = computed(() => props.question.description ?? '');
const placeholder = computed(() => props.question.placeholder ?? '');
const required = computed(() => props.question.required);
const options = computed<Option[]>(() => ('options' in props.question ? props.question.options ?? [] : []));

const isShortInput = computed(() => ['short', 'email', 'number', 'phone', 'website', 'date', 'time', 'fname', 'lname', 'fullName'].includes(type.value));
const isLongInput = computed(() => ['long'].includes(type.value));
const isMultiChoice = computed(() => type.value === 'checkbox' || type.value === 'tags');
const isSlider = computed(() => type.value === 'slider' || type.value === 'range');

const inputType = computed(() => {
  const typeMap: Record<string, string> = {
    email: 'email',
    number: 'number',
    phone: 'tel',
    website: 'url',
    date: 'date',
    time: 'time'
  };
  return typeMap[type.value] || 'text';
});

const sliderConfig = computed(() => {
  if (!isSlider.value) return null;
  const q = props.question as unknown as { min?: number; max?: number; step?: number };
  return { min: q.min ?? 0, max: q.max ?? 100, step: q.step ?? 1 };
});

const ratingScale = computed(() => {
  if (type.value !== 'rating') return [];
  const q = props.question as unknown as { min?: number; max?: number };
  const min = q.min ?? 1;
  const max = q.max ?? 5;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
});

const isMultipleFiles = computed(() => {
  if (type.value !== 'file') return false;
  return (props.question as unknown as { multiple?: boolean }).multiple ?? false;
});

const statementHtml = computed(() => {
  if (type.value !== 'statement') return props.question.description ?? '';
  return (props.question as unknown as { rich_text?: string }).rich_text ?? props.question.description ?? '';
});

const stringValue = computed(() => {
  if (props.modelValue == null) return '';
  if (Array.isArray(props.modelValue)) return props.modelValue.join(', ');
  return String(props.modelValue);
});

const arrayValue = computed<string[]>(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue as string[];
  if (props.modelValue == null) return [];
  return [String(props.modelValue)];
});

const numberValue = computed<number>(() => {
  const value = props.modelValue;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : sliderConfig.value?.min ?? 0;
});

const booleanValue = computed(() => Boolean(props.modelValue));

const yesNoLabel = computed(() => options.value?.[0]?.label ?? 'Yes / No');

const fileNames = computed(() => {
  const value = props.modelValue;
  if (!value) return [];
  if (Array.isArray(value)) return value.map((file) => (file as File).name ?? 'Selected file');
  if (value instanceof File) return [value.name];
  return [];
});

const updateValue = (value: unknown) => emit('update:modelValue', value);

const toggleCheckbox = (optionValue: string, checked: boolean) => {
  const current = arrayValue.value.slice();
  if (checked) {
    if (!current.includes(optionValue)) current.push(optionValue);
  } else {
    const index = current.indexOf(optionValue);
    if (index !== -1) current.splice(index, 1);
  }
  emit('update:modelValue', current);
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input?.files) {
    emit('update:modelValue', null);
    return;
  }
  const files = Array.from(input.files);
  emit('update:modelValue', isMultipleFiles.value ? files : files[0] ?? null);
};
</script>

<style scoped>
</style>