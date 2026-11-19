<template>
  <div :class="containerClass" @focusout="handleFocusOut">
    <div :class="labelWrapperClass">
      <label :id="`${inputId}-label`" :for="inputId" class="question-label flex items-baseline gap-1.5 text-base font-semibold leading-tight text-slate-950 dark:text-white">
        <span>{{ label }}</span>
        <span v-if="required" class="text-rose-500" aria-label="required">*</span>
      </label>

      <p v-if="description" :id="`${inputId}-description`" class="question-note">
        {{ description }}
      </p>
    </div>

    <div :class="fieldWrapperClass">
       
      <output v-if="type === 'calculated'" :id="inputId" class="form-control block w-full" :aria-label="label">{{ modelValue ?? '—' }}</output>
      <input
      v-else-if="isShortInput"
      :id="inputId"
      :type="inputType"
      :step="type === 'number' ? 'any' : undefined"
      :autocomplete="autocomplete"
      class="form-control w-full"
      :placeholder="placeholder"
      :value="stringValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="hasError || undefined"
      :aria-describedby="describedBy"
      @keydown.enter="emitEnter"
      @input="updateValue(($event.target as HTMLInputElement).value)"
    />

     
      <textarea
      v-else-if="isLongInput"
      :id="inputId"
      class="form-control min-h-[120px] w-full resize-y"
      :placeholder="placeholder"
      :value="stringValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="hasError || undefined"
      :aria-describedby="describedBy"
      @input="updateValue(($event.target as HTMLTextAreaElement).value)"
    />

     
      <fieldset v-else-if="type === 'radio'" :aria-labelledby="`${inputId}-label`" :aria-describedby="describedBy" class="space-y-2.5">
        <label
        v-for="(option, idx) in options"
        :key="option.value"
        :class="choiceOptionClass(modelValue === option.value)"
      >
        <span v-if="showShortcutLabels" class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-semibold transition-colors" :class="modelValue === option.value ? 'shortcut-badge--active text-white' : 'border-slate-300 bg-white text-slate-500 group-hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'">
          {{ getOptionShortcutLabel(idx) }}
        </span>
        <input
          :id="`${inputId}-${idx}`"
          type="radio"
          :name="question.id"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="disabled"
          class="h-4 w-4 cursor-pointer border-slate-300 focus:ring-2 focus:ring-offset-0 focus:ring-[var(--player-accent)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-[var(--player-accent)]"
          :class="{ 'sr-only': showShortcutLabels }"
          @change="updateValue(option.value)"
        />
          <span class="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-white">
          {{ option.label }}
        </span>
      </label>
      </fieldset>

       
      <select
      v-else-if="type === 'select'"
      :id="inputId"
      class="form-control w-full cursor-pointer"
      :value="(modelValue as string) ?? ''"
      :disabled="disabled"
      :required="required"
      :aria-invalid="hasError || undefined"
      :aria-describedby="describedBy"
      @change="updateValue(($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{$t('Forms.Player.QuestionRenderer.text.select_an_option')}}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

       
      <fieldset v-else-if="isMultiChoice" :aria-labelledby="`${inputId}-label`" :aria-describedby="describedBy" class="space-y-2.5">
        <label
        v-for="(option, idx) in options"
        :key="option.value"
        :class="choiceOptionClass(arrayValue.includes(option.value))"
      >
        <span v-if="showShortcutLabels" class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-semibold transition-colors" :class="arrayValue.includes(option.value) ? 'shortcut-badge--active text-white' : 'border-slate-300 bg-white text-slate-500 group-hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'">
          {{ getOptionShortcutLabel(idx) }}
        </span>
        <input
          :id="`${inputId}-${idx}`"
          type="checkbox"
          :value="option.value"
          :checked="arrayValue.includes(option.value)"
          :disabled="disabled"
          class="form-checkbox h-4 w-4 cursor-pointer rounded border-slate-300 focus:ring-2 focus:ring-offset-0 focus:ring-[var(--player-accent)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
          :class="{ 'sr-only': showShortcutLabels }"
          @change="toggleCheckbox(option.value, ($event.target as HTMLInputElement).checked)"
        />
          <span class="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-white">
          {{ option.label }}
        </span>
      </label>
      </fieldset>

       
      <div v-else-if="type === 'yesno'" role="group" :aria-labelledby="`${inputId}-label`" :aria-describedby="describedBy" class="flex items-center gap-4">
        <button
          type="button"
          :class="[
            'yesno-btn inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--player-accent)] disabled:cursor-not-allowed disabled:opacity-50',
            booleanValue === true
              ? 'yesno-btn--active text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
          :disabled="disabled"
          :aria-pressed="modelValue != null && booleanValue"
          @click="updateValue(true)"
        >
          <kbd v-if="showShortcutLabels" class="inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold" :class="booleanValue === true ? 'border-white/30 bg-white/10' : 'border-slate-300 dark:border-slate-600'">Y</kbd>
          Yes
        </button>
        <button
          type="button"
          :class="[
            'yesno-btn inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--player-accent)] disabled:cursor-not-allowed disabled:opacity-50',
            booleanValue === false && modelValue != null
              ? 'yesno-btn--active text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
          :disabled="disabled"
          :aria-pressed="modelValue != null && !booleanValue"
          @click="updateValue(false)"
        >
          <kbd v-if="showShortcutLabels" class="inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold" :class="booleanValue === false && modelValue != null ? 'border-white/30 bg-white/10' : 'border-slate-300 dark:border-slate-600'">N</kbd>
          No
        </button>
      </div>

       
      <div v-else-if="isSlider" class="space-y-2">
      <input
        :id="inputId"
        type="range"
        class="form-range h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--player-accent)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700"
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

       
      <div v-else-if="type === 'rating'" class="flex flex-wrap gap-2">
        <button
          v-for="ratingValue in ratingScale"
          :key="ratingValue"
          type="button"
          :class="[
            'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 rating-btn',
            numberValue >= ratingValue
              ? 'rating-btn--active text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
          :disabled="disabled"
          :aria-pressed="numberValue === ratingValue"
          @click="updateValue(ratingValue)"
        >
          {{ ratingValue }}
        </button>
      </div>

       
      <div 
      v-else-if="type === 'statement'"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
      v-html="statementHtml"
    />

       
      <div v-else-if="type === 'file'" class="space-y-3">
      <input
        :id="inputId"
        type="file"
        class="file-input-themed w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-900 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:px-4 file:py-1.5 file:text-xs file:font-semibold focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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

       
      <input
      v-else
      :id="inputId"
      type="text"
      class="form-control w-full"
      :placeholder="placeholder"
      :value="stringValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="hasError || undefined"
      :aria-describedby="describedBy"
      @keydown.enter="emitEnter"
      @input="updateValue(($event.target as HTMLInputElement).value)"
    />

       
      <p v-if="question.help_text" :id="`${inputId}-help`" class="question-note">
        {{ question.help_text }}
      </p>
      <p v-if="lengthHint" :id="`${inputId}-length`" class="question-note">
        {{ lengthHint }}
      </p>
      <p v-if="errorMessage" :id="`${inputId}-error`" role="alert" class="question-error">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FormDensity, FormLabelPlacement, FormQuestion, Option } from '@/types';
import { getAnswerError, getAnswerRules, isEmptyAnswer } from '@/utils/formAnswerValidation';
import { getOptionShortcutLabel } from '@/composables/useFormKeyboard';

const props = defineProps<{
  question: FormQuestion;
  modelValue: unknown;
  disabled?: boolean;
  labelPlacement?: FormLabelPlacement;
  density?: FormDensity;
  showShortcutLabels?: boolean;
  showErrors?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
  (e: 'enter'): void;
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

const fileNames = computed(() => {
  const value = props.modelValue;
  if (!value) return [];
  if (Array.isArray(value)) return value.map((file) => (file as File).name ?? 'Selected file');
  if (value instanceof File) return [value.name];
  return [];
});

const updateValue = (value: unknown) => emit('update:modelValue', value);

const emitEnter = (event: KeyboardEvent) => {
  if (event.isComposing || event.repeat) return;
  event.preventDefault();
  emit('enter');
};

const autocomplete = computed(() => ({
  email: 'email',
  phone: 'tel',
  fname: 'given-name',
  lname: 'family-name',
  fullName: 'name',
  website: 'url',
})[type.value as string]);

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

const labelPlacement = computed<FormLabelPlacement>(() => props.labelPlacement ?? 'stacked');
const density = computed<FormDensity>(() => props.density ?? 'comfortable');

const containerClass = computed(() => {
  const classes = ['flex', 'flex-col'];
  classes.push(density.value === 'compact' ? 'gap-3' : 'gap-4');
  if (labelPlacement.value === 'inline') {
    classes.push('md:grid', 'md:grid-cols-[minmax(0,220px)_1fr]', 'md:gap-6', 'md:items-start');
  }
  return classes.join(' ');
});

const labelWrapperClass = computed(() => {
  const classes = ['flex', 'flex-col'];
  classes.push(density.value === 'compact' ? 'gap-1' : 'gap-1.5');
  if (labelPlacement.value === 'inline') {
    classes.push('md:pt-1');
  }
  return classes.join(' ');
});

const fieldWrapperClass = computed(() => {
  const classes = ['flex', 'flex-col'];
  classes.push(density.value === 'compact' ? 'gap-2.5' : 'gap-3');
  return classes.join(' ');
});

const choiceOptionClass = (selected: boolean) => [
  'choice-option group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
  { 'choice-option--active': selected },
];

const blurred = ref(false);
const handleFocusOut = (event: FocusEvent) => {
  const field = event.currentTarget as HTMLElement;
  if (!(event.relatedTarget instanceof Node) || !field.contains(event.relatedTarget)) {
    blurred.value = !isEmptyAnswer(props.modelValue);
  }
};
const activeValidation = computed(() => getAnswerRules(props.question));
const errorMessage = computed(() =>
  props.showErrors || blurred.value ? getAnswerError(props.question, props.modelValue) : '',
);
const hasError = computed(() => Boolean(errorMessage.value));
const describedBy = computed(() => [
  description.value && `${inputId.value}-description`,
  props.question.help_text && `${inputId.value}-help`,
  lengthHint.value && `${inputId.value}-length`,
  errorMessage.value && `${inputId.value}-error`,
].filter(Boolean).join(' ') || undefined);

const lengthHint = computed(() => {
  if (!isLongInput.value) return '';
  const rules = activeValidation.value;
  const hints: string[] = [];
  if (rules?.minLength && rules.minLength > 1) hints.push(`Min ${rules.minLength}`);
  if (rules?.maxLength) hints.push(`Max ${rules.maxLength}`);
  return hints.length ? `${hints.join(' · ')} characters` : '';
});
</script>

<style scoped>
.question-label { color: var(--player-text-color, #0f172a); overflow-wrap: anywhere; }
.question-note { color: inherit; font-size: 0.9rem; line-height: 1.55; }
.question-error { color: inherit; border-inline-start: 3px solid #db5269; padding-inline-start: 0.65rem; font-size: 0.9rem; font-weight: 650; }
.form-control[aria-invalid="true"] { border-color: #db5269; }
.choice-option:focus-within { outline: 2px solid var(--player-accent); outline-offset: 2px; }

:deep(input:focus),
:deep(textarea:focus),
:deep(select:focus) {
  --tw-ring-color: var(--player-accent, #3b82f6);
  border-color: var(--player-accent, #3b82f6);
}

.form-control {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--player-text-color, #0f172a) 18%, transparent);
  background: var(--player-surface, #fff);
  padding: 0.85rem 1rem;
  color: var(--player-text-color, #0f172a);
  font-size: 0.98rem;
  line-height: 1.45;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.form-control::placeholder {
  color: color-mix(in srgb, var(--player-text-color) 70%, var(--player-surface));
}

.form-control:focus {
  outline: none;
  border-color: var(--player-accent, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--player-accent, #3b82f6) 16%, transparent);
}

.form-control:disabled {
  cursor: not-allowed;
  background: #f1f5f9;
  color: #64748b;
}

.choice-option {
  min-height: 44px;
  border-color: var(--player-surface-border);
  background: var(--player-surface);
}
.choice-option:hover {
  border-color: var(--player-accent);
}
.choice-option--active {
  border-color: var(--player-accent);
  background: color-mix(in srgb, var(--player-accent) 10%, var(--player-surface));
}
.choice-option span:last-child { color: var(--player-text-color); }

:deep(input[type="radio"]:checked),
:deep(input[type="checkbox"]:checked) {
  background-color: var(--player-accent, #3b82f6);
  border-color: var(--player-accent, #3b82f6);
}

:deep(input[type="radio"]:focus),
:deep(input[type="checkbox"]:focus) {
  --tw-ring-color: var(--player-accent, #3b82f6);
}

:deep(input[type="range"]) {
  accent-color: var(--player-accent, #3b82f6);
}

.shortcut-badge--active {
  border-color: var(--player-accent, #3b82f6);
  background-color: var(--player-accent, #3b82f6);
}

.yesno-btn, .rating-btn {
  min-width: 44px;
  min-height: 44px;
  border-color: var(--player-surface-border);
  background: var(--player-surface);
  color: var(--player-text-color);
}
.yesno-btn--active, .rating-btn--active {
  border-color: var(--player-accent);
  background: color-mix(in srgb, var(--player-accent) 14%, var(--player-surface));
}
.yesno-btn:focus-visible, .rating-btn:focus-visible {
  outline: 2px solid var(--player-accent);
  outline-offset: 2px;
}

.file-input-themed {
  --tw-ring-color: var(--player-accent, #3b82f6);
}

.file-input-themed:focus {
  border-color: var(--player-accent, #3b82f6);
}

.file-input-themed::file-selector-button {
  background-color: color-mix(in srgb, var(--player-accent, #3b82f6) 15%, transparent);
  color: var(--player-accent, #3b82f6);
}

.file-input-themed:hover::file-selector-button {
  background-color: color-mix(in srgb, var(--player-accent, #3b82f6) 25%, transparent);
}

</style>
