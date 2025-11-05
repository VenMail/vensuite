<template>
  <div class="flex flex-col gap-4 text-slate-900 dark:text-slate-100">
    <label class="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
      <span>{{ label }}</span>
      <span v-if="required" class="text-red-600 dark:text-red-400">*</span>
    </label>
    <p v-if="description" class="text-sm text-slate-600 dark:text-slate-400">{{ description }}</p>

    <div class="flex flex-col gap-3">
      <template v-if="isShortInput">
        <input
          :type="inputType"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          :placeholder="placeholder"
          :value="stringValue"
          :disabled="disabled"
          @input="updateValue(($event.target as HTMLInputElement).value)"
        />
      </template>

      <template v-else-if="isLongInput">
        <textarea
          class="w-full min-h-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          :placeholder="placeholder"
          :value="stringValue"
          :disabled="disabled"
          @input="updateValue(($event.target as HTMLTextAreaElement).value)"
        />
      </template>

      <template v-else-if="type === 'radio'">
        <div v-for="option in options" :key="option.value" class="flex items-start">
          <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              :name="question.id"
              :value="option.value"
              :checked="modelValue === option.value"
              :disabled="disabled"
              @change="updateValue(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </template>

      <template v-else-if="type === 'select'">
        <select
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :value="(modelValue as string) ?? ''"
          :disabled="disabled"
          @change="updateValue(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Select an option</option>
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </template>

      <template v-else-if="isMultiChoice">
        <div class="flex flex-col gap-2">
          <label
            v-for="option in options"
            :key="option.value"
            class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <input
              type="checkbox"
              :value="option.value"
              :checked="arrayValue.includes(option.value)"
              :disabled="disabled"
              @change="toggleCheckbox(option.value, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </template>

      <template v-else-if="type === 'yesno'">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            :checked="booleanValue"
            :disabled="disabled"
            @change="updateValue(($event.target as HTMLInputElement).checked)"
          />
          <span>{{ yesNoLabel }}</span>
        </label>
      </template>

      <template v-else-if="isSlider">
        <div class="flex items-center gap-3">
          <input
            type="range"
            class="w-full accent-primary-600 dark:accent-primary-400"
            :min="sliderConfig?.min ?? 0"
            :max="sliderConfig?.max ?? 100"
            :step="sliderConfig?.step ?? 1"
            :value="numberValue"
            :disabled="disabled"
            @input="updateValue(Number(($event.target as HTMLInputElement).value))"
          />
          <span class="min-w-[3rem] text-center font-semibold text-slate-700 dark:text-slate-200">{{ numberValue }}</span>
        </div>
      </template>

      <template v-else-if="type === 'rating'">
        <div class="flex gap-2">
          <button
            v-for="ratingValue in ratingScale"
            :key="ratingValue"
            type="button"
            :class="[
              'w-8 h-8 rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
              { 'bg-amber-400 border-amber-500 text-amber-900 dark:bg-amber-500 dark:border-amber-400 dark:text-amber-950': numberValue >= ratingValue }
            ]"
            :disabled="disabled"
            @click="updateValue(ratingValue)"
          >
            {{ ratingValue }}
          </button>
        </div>
      </template>

      <template v-else-if="type === 'statement'">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" v-html="statementHtml"></div>
      </template>

      <template v-else-if="type === 'file'">
        <input
          type="file"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :multiple="isMultipleFiles"
          :disabled="disabled"
          @change="handleFileChange"
        />
        <ul v-if="fileNames.length" class="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
          <li v-for="name in fileNames" :key="name">{{ name }}</li>
        </ul>
      </template>

      <template v-else>
        <input
          type="text"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          :placeholder="placeholder"
          :value="stringValue"
          :disabled="disabled"
          @input="updateValue(($event.target as HTMLInputElement).value)"
        />
      </template>
    </div>

    <small v-if="question.help_text" class="text-xs text-slate-500 dark:text-slate-400">{{ question.help_text }}</small>
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
  switch (type.value) {
    case 'email':
      return 'email';
    case 'number':
      return 'number';
    case 'phone':
      return 'tel';
    case 'website':
      return 'url';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    default:
      return 'text';
  }
});

const sliderConfig = computed(() => {
  if (!isSlider.value) return null;
  const q = props.question as unknown as { min?: number; max?: number; step?: number };
  return {
    min: q.min ?? 0,
    max: q.max ?? 100,
    step: q.step ?? 1,
  };
});

const ratingScale = computed(() => {
  if (type.value !== 'rating') return [];
  const q = props.question as unknown as { min?: number; max?: number };
  const min = q.min ?? 1;
  const max = q.max ?? 5;
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
});

const isMultipleFiles = computed(() => {
  if (type.value !== 'file') return false;
  const q = props.question as unknown as { multiple?: boolean };
  return q.multiple ?? false;
});

const statementHtml = computed(() => {
  if (type.value !== 'statement') return props.question.description ?? '';
  const q = props.question as unknown as { rich_text?: string };
  return q.rich_text ?? props.question.description ?? '';
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

const booleanValue = computed(() => {
  return Boolean(props.modelValue);
});

const yesNoLabel = computed(() => {
  const option = options.value?.[0];
  return option?.label ?? 'Yes / No';
});

const fileNames = computed(() => {
  const value = props.modelValue;
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.map((file) => (file as File).name ?? 'Selected file');
  }
  if (value instanceof File) {
    return [value.name];
  }
  return [] as string[];
});

const updateValue = (value: unknown) => {
  emit('update:modelValue', value);
};

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
.flex:first-child button:disabled {
  cursor: not-allowed;
}
</style>
