<template>
  <div class="mx-auto max-w-2xl space-y-8 rounded-2xl bg-white p-8 text-slate-900 shadow-md dark:bg-slate-900 dark:text-slate-100">
    <!-- Display Form Metadata -->
    <header class="space-y-3 text-center">
      <img
        v-if="metadata?.logo"
        :src="metadata?.logo?.url"
        :alt="metadata?.logo?.altText"
        class="mx-auto max-h-24"
      />
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold">{{ metadata?.title }}</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">{{ metadata?.description }}</p>
      </div>
    </header>

    <!-- Progress Bar -->
    <div v-if="settings?.progressBar?.show === true" class="space-y-2">
      <div class="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          class="h-full rounded-full bg-primary-500 transition-all dark:bg-primary-400"
          :style="progressBarStyle"
        ></div>
      </div>
      <p v-if="settings?.progressBar?.type === 'percentage'" class="text-right text-xs font-medium text-slate-500 dark:text-slate-400">
        {{ progressPercentage }}%
      </p>
    </div>

    <!-- Display Current Field -->
    <div v-if="currentField" class="space-y-4">
      <h2 class="text-xl font-semibold">{{ currentField.question }}</h2>

      <!-- Render Field Based on Type -->
      <div v-if="currentField.category === 'text'">
        <input
          :type="currentField.type"
          v-model="responses[currentField.id]"
          :placeholder="currentField.placeholder"
          :required="currentField.required"
          @focus="focusField"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <div v-else-if="currentField.type === 'select'">
        <select
          v-model="responses[currentField.id]"
          :required="currentField.required"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option v-for="(option, index) in currentField.options" :key="index" :value="Object.keys(option)[0]">
            {{ Object.values(option)[0] }}
          </option>
        </select>
      </div>
      <div v-else-if="currentField.type === 'checkbox'" class="space-y-2">
        <label
          v-for="(option, index) in currentField.options"
          :key="index"
          class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
        >
          <input
            type="checkbox"
            :value="option"
            v-model="responses[currentField.id]"
            class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span>{{ option }}</span>
        </label>
      </div>
      <div v-else-if="currentField.type === 'rating'" class="flex gap-3">
        <label v-for="n in currentField.max" :key="n" class="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="radio"
            :value="n"
            v-model="responses[currentField.id]"
            class="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span>{{ n }}</span>
        </label>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex flex-wrap gap-3 pt-4">
        <button
          v-if="settings?.navigation?.allowBack && currentStep > 0"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          @click="prevField"
        >
          Back
        </button>
        <button
          v-if="canSkip"
          class="rounded-lg border border-transparent bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          @click="nextField"
        >
          Skip
        </button>
        <button
          v-else
          class="rounded-lg border border-primary-600 bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          @click="nextField"
          :disabled="!canProceed"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="formCompleted" class="rounded-xl bg-emerald-50 p-6 text-center text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
      <p class="text-lg font-semibold">{{ metadata?.completion?.successMessage }}</p>
    </div>

    <footer class="pt-6 text-center text-xs text-slate-500 dark:text-slate-400">
      <p>{{ metadata?.footer?.text }}</p>
    </footer>
  </div>
</template>

<script lang="ts">
import { FormData } from "@/types";
import { defineComponent, ref, computed, watch } from "vue";

export default defineComponent({
  name: "WizardForm",
  props: {
    formData: {
      type: Object as () => FormData,
      required: true,
    },
  },
  setup(props) {
    const { metadata, settings, fields } = props.formData;
    const currentStep = ref(0);
    const responses = ref<Record<string, any>>({});
    const formCompleted = ref(false);

    const currentField = computed(() => {
      return fields[currentStep.value];
    });

    const progressPercentage = computed(() => {
      return Math.round(((currentStep.value + 1) / fields.length) * 100);
    });

    const progressBarStyle = computed(() => ({
      width: `${progressPercentage.value}%`,
    }));

    const canProceed = computed(() => {
      if (!currentField.value) return false;
      if (currentField.value.required && !responses.value[currentField.value.id]) return false;
      return true;
    });

    const canSkip = computed(() => {
      return settings?.navigation?.allowSkip && !currentField.value.required;
    });

    const nextField = () => {
      if (currentStep.value < fields.length - 1) {
        currentStep.value += 1;
      } else {
        formCompleted.value = true;
      }
    };

    const prevField = () => {
      if (currentStep.value > 0) {
        currentStep.value -= 1;
      }
    };

    const focusField = () => {
      if (settings?.autoFocus) {
        const input = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
        input?.focus();
      }
    };

    watch(currentStep, () => {
      focusField();
    });

    return {
      metadata,
      settings,
      fields,
      currentField,
      currentStep,
      responses,
      progressPercentage,
      progressBarStyle,
      formCompleted,
      nextField,
      prevField,
      focusField,
      canProceed,
      canSkip,
    };
  },
});
</script>