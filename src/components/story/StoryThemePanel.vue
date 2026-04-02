<script setup lang="ts">
/**
 * StoryThemePanel — Theme preset gallery and color/typography editor.
 */
import { inject, computed, ref } from 'vue';
import { Check, Paintbrush } from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import type { StoryTheme } from '@/types/story';
import { useStoryTheme, builtInThemes } from '@/composables/useStoryTheme';

const store = inject<StoryStoreReturn>('storyStore')!;
const editor = computed(() => store.editor);

const theme = computed(() => editor.value.document.value?.theme);

const storyTheme = useStoryTheme({
  theme,
  onThemeChange: () => store.markDirty(),
});

const showAdvanced = ref(false);

// Color fields for the editor
const colorFields: { key: keyof StoryTheme['colors']; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Text' },
  { key: 'textSecondary', label: 'Text 2nd' },
  { key: 'border', label: 'Border' },
];
</script>

<template>
  <div class="p-3 space-y-4">
    <!-- Preset gallery -->
    <section>
      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Presets
      </h4>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in builtInThemes"
          :key="preset.id"
          :class="[
            'relative rounded-lg border-2 p-2 transition-all duration-150 text-left',
            storyTheme.currentPresetId.value === preset.id
              ? 'border-primary-500 ring-1 ring-primary-200 dark:ring-primary-800'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          ]"
          @click="storyTheme.applyPreset(preset.id)"
        >
          <!-- Mini preview -->
          <div
            class="h-14 rounded-md mb-1.5 relative overflow-hidden"
            :style="{ backgroundColor: preset.theme.colors.background }"
          >
            <!-- Color swatches preview -->
            <div class="absolute bottom-1 left-1 flex gap-0.5">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: preset.theme.colors.primary }"
              />
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: preset.theme.colors.secondary }"
              />
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: preset.theme.colors.accent }"
              />
            </div>
            <!-- Text preview lines -->
            <div class="absolute top-2 left-2 right-2 space-y-1">
              <div
                class="h-1.5 rounded-full w-2/3"
                :style="{ backgroundColor: preset.theme.colors.text, opacity: 0.8 }"
              />
              <div
                class="h-1 rounded-full w-full"
                :style="{ backgroundColor: preset.theme.colors.textSecondary, opacity: 0.5 }"
              />
              <div
                class="h-1 rounded-full w-4/5"
                :style="{ backgroundColor: preset.theme.colors.textSecondary, opacity: 0.3 }"
              />
            </div>
          </div>
          <span class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
            {{ preset.name }}
          </span>
          <!-- Active check -->
          <Check
            v-if="storyTheme.currentPresetId.value === preset.id"
            class="absolute top-1.5 right-1.5 w-4 h-4 text-primary-500"
          />
        </button>
      </div>
    </section>

    <!-- Color editor -->
    <section>
      <button
        class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400
               uppercase tracking-wider mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        @click="showAdvanced = !showAdvanced"
      >
        <Paintbrush class="w-3 h-3" />
        Colors
        <span class="text-[10px] font-normal normal-case">
          {{ showAdvanced ? '(collapse)' : '(expand)' }}
        </span>
      </button>

      <div v-if="showAdvanced" class="space-y-2">
        <div
          v-for="field in colorFields"
          :key="field.key"
          class="flex items-center gap-2"
        >
          <span class="text-[10px] text-gray-400 w-12 truncate">{{ field.label }}</span>
          <input
            type="color"
            :value="theme.colors[field.key]"
            class="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
            @input="storyTheme.updateColors({ [field.key]: ($event.target as HTMLInputElement).value })"
          />
          <input
            type="text"
            :value="theme.colors[field.key]"
            class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                   rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono"
            @change="storyTheme.updateColors({ [field.key]: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </section>

    <!-- Typography -->
    <section>
      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Typography
      </h4>

      <label class="block mb-2">
        <span class="text-[10px] text-gray-400 uppercase">Heading Font</span>
        <select
          :value="theme.typography.headingFont"
          class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded px-2 py-1.5 text-gray-700 dark:text-gray-300"
          @change="storyTheme.updateTypography({ headingFont: ($event.target as HTMLSelectElement).value })"
        >
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Georgia', 'Times New Roman', serif">Georgia / Times</option>
        </select>
      </label>

      <label class="block mb-2">
        <span class="text-[10px] text-gray-400 uppercase">Body Font</span>
        <select
          :value="theme.typography.bodyFont"
          class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded px-2 py-1.5 text-gray-700 dark:text-gray-300"
          @change="storyTheme.updateTypography({ bodyFont: ($event.target as HTMLSelectElement).value })"
        >
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
        </select>
      </label>

      <label class="flex items-center gap-2 mb-2">
        <span class="text-[10px] text-gray-400 w-12">Base Size</span>
        <input
          type="number"
          :value="theme.typography.baseSize"
          min="10"
          max="24"
          class="w-16 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
          @change="storyTheme.updateTypography({ baseSize: Number(($event.target as HTMLInputElement).value) })"
        />
        <span class="text-[10px] text-gray-400">px</span>
      </label>

      <label class="flex items-center gap-2">
        <span class="text-[10px] text-gray-400 w-12">Scale</span>
        <select
          :value="String(theme.typography.scaleRatio)"
          class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
          @change="storyTheme.updateTypography({ scaleRatio: Number(($event.target as HTMLSelectElement).value) })"
        >
          <option value="1.125">Minor Second (1.125)</option>
          <option value="1.2">Minor Third (1.2)</option>
          <option value="1.25">Major Third (1.25)</option>
          <option value="1.333">Perfect Fourth (1.333)</option>
          <option value="1.414">Aug Fourth (1.414)</option>
          <option value="1.5">Perfect Fifth (1.5)</option>
          <option value="1.618">Golden Ratio (1.618)</option>
        </select>
      </label>
    </section>

    <!-- Effects -->
    <section>
      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Effects
      </h4>

      <label class="flex items-center gap-2 mb-2">
        <span class="text-[10px] text-gray-400 w-12">Radius</span>
        <input
          type="text"
          :value="theme.effects.borderRadius"
          class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
          @change="storyTheme.updateEffects({ borderRadius: ($event.target as HTMLInputElement).value })"
        />
      </label>

      <label class="flex items-center justify-between mb-2">
        <span class="text-[10px] text-gray-400">Glassmorphism</span>
        <button
          :class="[
            'relative w-8 h-4 rounded-full transition-colors duration-200',
            theme.effects.glassmorphism
              ? 'bg-primary-500'
              : 'bg-gray-300 dark:bg-gray-600',
          ]"
          @click="storyTheme.updateEffects({ glassmorphism: !theme.effects.glassmorphism })"
        >
          <span
            :class="[
              'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
              theme.effects.glassmorphism ? 'translate-x-4' : 'translate-x-0.5',
            ]"
          />
        </button>
      </label>

      <label class="flex items-center justify-between">
        <span class="text-[10px] text-gray-400">Dark Mode</span>
        <button
          :class="[
            'relative w-8 h-4 rounded-full transition-colors duration-200',
            theme.effects.darkMode
              ? 'bg-primary-500'
              : 'bg-gray-300 dark:bg-gray-600',
          ]"
          @click="storyTheme.updateEffects({ darkMode: !theme.effects.darkMode })"
        >
          <span
            :class="[
              'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
              theme.effects.darkMode ? 'translate-x-4' : 'translate-x-0.5',
            ]"
          />
        </button>
      </label>
    </section>
  </div>
</template>
