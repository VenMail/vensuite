<template>
  <Transition name="design-panel-slide">
    <div
      v-if="open"
      class="fixed inset-y-0 right-0 z-50 flex"
      @click.self="emit('close')"
    >
      <div
        class="relative ml-auto flex h-full w-[380px] max-w-[90vw] flex-col border-l bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Design</h2>
          <button
            class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-800">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            :class="activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto px-5 py-5">
          <!-- THEME TAB -->
          <div v-if="activeTab === 'theme'" class="space-y-6">
            <!-- Primary Color -->
            <FieldGroup label="Primary Color">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="preset in colorPresets"
                  :key="preset.value"
                  class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  :class="settingsStore.state.theme.primary_color === preset.value ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-blue-500' : 'border-transparent'"
                  :style="{ background: preset.value }"
                  :title="preset.label"
                  @click="updateTheme({ primary_color: preset.value })"
                />
                <label
                  class="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                  title="Custom color"
                >
                  <Plus class="h-3.5 w-3.5" />
                  <input
                    type="color"
                    class="absolute inset-0 cursor-pointer opacity-0"
                    :value="settingsStore.state.theme.primary_color"
                    @input="updateTheme({ primary_color: ($event.target as HTMLInputElement).value })"
                  />
                </label>
              </div>
            </FieldGroup>

            <!-- Background Color -->
            <FieldGroup label="Background">
              <div class="flex items-center gap-3">
                <label class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600">
                  <div class="h-6 w-6 rounded" :style="{ background: settingsStore.state.theme.background_color || '#FFFFFF' }" />
                  <input
                    type="color"
                    class="absolute inset-0 cursor-pointer opacity-0"
                    :value="settingsStore.state.theme.background_color || '#FFFFFF'"
                    @input="updateTheme({ background_color: ($event.target as HTMLInputElement).value })"
                  />
                </label>
                <input
                  type="text"
                  class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                  :value="settingsStore.state.theme.background_color || '#FFFFFF'"
                  @change="updateTheme({ background_color: ($event.target as HTMLInputElement).value })"
                />
              </div>
            </FieldGroup>

            <!-- Button Style -->
            <FieldGroup label="Button Style">
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="style in buttonStyles"
                  :key="style.value"
                  class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                  :class="(settingsStore.state.theme.button_style || 'solid') === style.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
                  @click="updateTheme({ button_style: style.value })"
                >
                  {{ style.label }}
                </button>
              </div>
            </FieldGroup>

            <!-- Border Radius -->
            <FieldGroup label="Corner Radius">
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="radius in borderRadii"
                  :key="radius.value"
                  class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors"
                  :class="(settingsStore.state.theme.border_radius || '0.75rem') === radius.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
                  @click="updateTheme({ border_radius: radius.value })"
                >
                  <div class="h-5 w-8 border-2 border-current" :style="{ borderRadius: radius.value }" />
                  {{ radius.label }}
                </button>
              </div>
            </FieldGroup>
          </div>

          <!-- TYPOGRAPHY TAB -->
          <div v-if="activeTab === 'typography'" class="space-y-6">
            <!-- Heading Font -->
            <FieldGroup label="Heading Font">
              <select
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                :value="settingsStore.state.typography.heading_font_family"
                @change="updateTypography({ heading_font_family: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="font in fontOptions" :key="font.value" :value="font.value" :style="{ fontFamily: font.value }">
                  {{ font.label }}
                </option>
              </select>
              <p class="mt-1.5 text-lg font-semibold text-gray-800 dark:text-gray-200" :style="{ fontFamily: settingsStore.state.typography.heading_font_family }">
                The quick brown fox
              </p>
            </FieldGroup>

            <!-- Body Font -->
            <FieldGroup label="Body Font">
              <select
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                :value="settingsStore.state.typography.body_font_family"
                @change="updateTypography({ body_font_family: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="font in fontOptions" :key="font.value" :value="font.value" :style="{ fontFamily: font.value }">
                  {{ font.label }}
                </option>
              </select>
              <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400" :style="{ fontFamily: settingsStore.state.typography.body_font_family }">
                The quick brown fox jumps over the lazy dog
              </p>
            </FieldGroup>

            <!-- Font Weight -->
            <FieldGroup label="Heading Weight">
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="weight in fontWeights"
                  :key="weight.value"
                  class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                  :class="(settingsStore.state.typography.heading_font_weight || '600') === weight.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
                  @click="updateTypography({ heading_font_weight: weight.value })"
                >
                  {{ weight.label }}
                </button>
              </div>
            </FieldGroup>

            <!-- Line Height -->
            <FieldGroup label="Line Height">
              <div class="flex items-center gap-3">
                <input
                  type="range"
                  min="1.2"
                  max="2.0"
                  step="0.1"
                  class="flex-1 accent-blue-600"
                  :value="settingsStore.state.typography.line_height ?? 1.6"
                  @input="updateTypography({ line_height: parseFloat(($event.target as HTMLInputElement).value) })"
                />
                <span class="w-10 text-right text-xs font-mono text-gray-500 dark:text-gray-400">
                  {{ (settingsStore.state.typography.line_height ?? 1.6).toFixed(1) }}
                </span>
              </div>
            </FieldGroup>
          </div>

          <!-- LAYOUT TAB -->
          <div v-if="activeTab === 'layout'" class="space-y-6">
            <!-- Layout Mode -->
            <FieldGroup label="Player Mode">
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="mode in layoutModes"
                  :key="mode.value"
                  class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
                  :class="settingsStore.state.layoutMode === mode.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
                  @click="settingsStore.setLayoutMode(mode.value); triggerSave()"
                >
                  <component :is="mode.icon" class="h-5 w-5" />
                  {{ mode.label }}
                </button>
              </div>
            </FieldGroup>

            <!-- Label Placement -->
            <FieldGroup label="Label Placement">
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="placement in labelPlacements"
                  :key="placement.value"
                  class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                  :class="(settingsStore.state.settings.label_placement || 'stacked') === placement.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
                  @click="settingsStore.updateSettings({ label_placement: placement.value }); triggerSave()"
                >
                  {{ placement.label }}
                </button>
              </div>
            </FieldGroup>

            <!-- Density -->
            <FieldGroup label="Density">
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="d in densities"
                  :key="d.value"
                  class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                  :class="(settingsStore.state.settings.form_density || 'comfortable') === d.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'"
                  @click="settingsStore.updateSettings({ form_density: d.value }); triggerSave()"
                >
                  {{ d.label }}
                </button>
              </div>
            </FieldGroup>

            <!-- Progress Bar -->
            <FieldGroup label="Progress Bar">
              <label class="flex cursor-pointer items-center justify-between">
                <span class="text-sm text-gray-700 dark:text-gray-300">Show progress bar</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="settingsStore.state.settings.progress_bar?.show ?? true"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  :class="(settingsStore.state.settings.progress_bar?.show ?? true) ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'"
                  @click="toggleProgressBar"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
                    :class="(settingsStore.state.settings.progress_bar?.show ?? true) ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </label>
            </FieldGroup>

            <!-- Question Numbers -->
            <FieldGroup label="Question Numbers">
              <label class="flex cursor-pointer items-center justify-between">
                <span class="text-sm text-gray-700 dark:text-gray-300">Show question numbers</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="settingsStore.state.settings.show_question_number ?? false"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  :class="(settingsStore.state.settings.show_question_number ?? false) ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'"
                  @click="settingsStore.updateSettings({ show_question_number: !(settingsStore.state.settings.show_question_number ?? false) }); triggerSave()"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
                    :class="(settingsStore.state.settings.show_question_number ?? false) ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </label>
            </FieldGroup>
          </div>

          <!-- SCREENS TAB -->
          <div v-if="activeTab === 'screens'" class="space-y-6">
            <!-- Welcome Screen -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Welcome Screen</h3>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="settingsStore.state.welcomeScreen.enabled"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  :class="settingsStore.state.welcomeScreen.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'"
                  @click="settingsStore.updateWelcomeScreen({ enabled: !settingsStore.state.welcomeScreen.enabled }); triggerSave()"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
                    :class="settingsStore.state.welcomeScreen.enabled ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>

              <template v-if="settingsStore.state.welcomeScreen.enabled">
                <div class="space-y-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      :value="settingsStore.state.welcomeScreen.title || ''"
                      placeholder="Welcome"
                      @input="settingsStore.updateWelcomeScreen({ title: ($event.target as HTMLInputElement).value }); debouncedSave()"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Subtitle</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      :value="settingsStore.state.welcomeScreen.subtitle || ''"
                      placeholder="Let's get to know you better"
                      @input="settingsStore.updateWelcomeScreen({ subtitle: ($event.target as HTMLInputElement).value }); debouncedSave()"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Button Text</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      :value="settingsStore.state.welcomeScreen.button_text || ''"
                      placeholder="Start"
                      @input="settingsStore.updateWelcomeScreen({ button_text: ($event.target as HTMLInputElement).value }); debouncedSave()"
                    />
                  </div>
                </div>
              </template>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-800" />

            <!-- Completion Screen -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Completion Screen</h3>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="settingsStore.state.completionScreen.enabled"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  :class="settingsStore.state.completionScreen.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'"
                  @click="settingsStore.updateCompletionScreen({ enabled: !settingsStore.state.completionScreen.enabled }); triggerSave()"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
                    :class="settingsStore.state.completionScreen.enabled ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>

              <template v-if="settingsStore.state.completionScreen.enabled">
                <div class="space-y-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      :value="settingsStore.state.completionScreen.title || ''"
                      placeholder="Thank you!"
                      @input="settingsStore.updateCompletionScreen({ title: ($event.target as HTMLInputElement).value }); debouncedSave()"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Message</label>
                    <textarea
                      rows="2"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 resize-none"
                      :value="settingsStore.state.completionScreen.message || ''"
                      placeholder="We've received your response."
                      @input="settingsStore.updateCompletionScreen({ message: ($event.target as HTMLTextAreaElement).value }); debouncedSave()"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Button Text</label>
                    <input
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      :value="settingsStore.state.completionScreen.button_text || ''"
                      placeholder="Continue"
                      @input="settingsStore.updateCompletionScreen({ button_text: ($event.target as HTMLInputElement).value }); debouncedSave()"
                    />
                  </div>
                  <label class="flex cursor-pointer items-center justify-between">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Show response summary</span>
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="settingsStore.state.completionScreen.show_summary ?? false"
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      :class="(settingsStore.state.completionScreen.show_summary ?? false) ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'"
                      @click="settingsStore.updateCompletionScreen({ show_summary: !(settingsStore.state.completionScreen.show_summary ?? false) }); triggerSave()"
                    >
                      <span
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
                        :class="(settingsStore.state.completionScreen.show_summary ?? false) ? 'translate-x-5' : 'translate-x-0'"
                      />
                    </button>
                  </label>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { X, Plus, Maximize2, Columns, Wand2 } from 'lucide-vue-next';
import { useFormSettingsStore } from '@/store/formSettings';
import type { FormTheme, FormTypography, FormLabelPlacement, FormDensity, FormLayoutMode } from '@/types';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
}>();

const settingsStore = useFormSettingsStore();

const activeTab = ref<'theme' | 'typography' | 'layout' | 'screens'>('theme');

const tabs = [
  { id: 'theme' as const, label: 'Theme' },
  { id: 'typography' as const, label: 'Fonts' },
  { id: 'layout' as const, label: 'Layout' },
  { id: 'screens' as const, label: 'Screens' },
];

const colorPresets = [
  { value: '#2563EB', label: 'Blue' },
  { value: '#7C3AED', label: 'Purple' },
  { value: '#059669', label: 'Green' },
  { value: '#DC2626', label: 'Red' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#DB2777', label: 'Pink' },
  { value: '#0D9488', label: 'Teal' },
  { value: '#0F172A', label: 'Slate' },
];

const buttonStyles: { value: FormTheme['button_style']; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
];

const borderRadii = [
  { value: '0', label: 'Sharp' },
  { value: '0.75rem', label: 'Rounded' },
  { value: '9999px', label: 'Pill' },
];

const fontOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'system-ui', label: 'System Default' },
];

const fontWeights = [
  { value: '400', label: 'Regular' },
  { value: '600', label: 'Semi-bold' },
  { value: '700', label: 'Bold' },
];

const layoutModes: { value: FormLayoutMode; label: string; icon: typeof Maximize2 }[] = [
  { value: 'focus', label: 'Focus', icon: Maximize2 },
  { value: 'classic', label: 'Classic', icon: Columns },
  { value: 'auto', label: 'Auto', icon: Wand2 },
];

const labelPlacements: { value: FormLabelPlacement; label: string }[] = [
  { value: 'stacked', label: 'Stacked' },
  { value: 'inline', label: 'Inline' },
];

const densities: { value: FormDensity; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

const triggerSave = () => {
  emit('save');
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => triggerSave(), 500);
};

const updateTheme = (partial: Partial<FormTheme>) => {
  settingsStore.updateTheme(partial);
  triggerSave();
};

const updateTypography = (partial: Partial<FormTypography>) => {
  settingsStore.updateTypography(partial);
  triggerSave();
};

const toggleProgressBar = () => {
  const current = settingsStore.state.settings.progress_bar?.show ?? true;
  settingsStore.updateSettings({
    progress_bar: {
      ...(settingsStore.state.settings.progress_bar ?? { type: 'percentage' as const }),
      show: !current,
    },
  });
  triggerSave();
};

// Simple field group component
const FieldGroup = {
  props: { label: String },
  template: `<div class="space-y-2"><label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{{ label }}</label><slot /></div>`,
};
</script>

<style scoped>
.design-panel-slide-enter-active,
.design-panel-slide-leave-active {
  transition: all 0.25s ease;
}

.design-panel-slide-enter-active > div,
.design-panel-slide-leave-active > div {
  transition: transform 0.25s ease;
}

.design-panel-slide-enter-from,
.design-panel-slide-leave-to {
  opacity: 0;
}

.design-panel-slide-enter-from > div,
.design-panel-slide-leave-to > div {
  transform: translateX(100%);
}
</style>
