<script setup lang="ts">
/**
 * StoryPropertiesPanel — Edits properties of the selected block(s).
 * Shows position, style, and type-specific content fields.
 */
import { computed, inject } from 'vue';
import {
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import type {
  StoryBlockPosition,
  StoryBlockStyle,
  StoryTextContent,
  StoryImageContent,
  StoryShapeContent,
} from '@/types/story';

const store = inject<StoryStoreReturn>('storyStore')!;
const editor = computed(() => store.editor);

const selectedBlocks = computed(() => editor.value.selectedBlocks.value);
const singleBlock = computed(() =>
  selectedBlocks.value.length === 1 ? selectedBlocks.value[0] : null,
);

// ── Position fields ──────────────────────────────────────────────────
function updatePosition(field: keyof StoryBlockPosition, value: number) {
  if (!singleBlock.value) return;
  editor.value.updateBlockPosition(singleBlock.value.id, { [field]: value });
}

function updateStyle(field: keyof StoryBlockStyle, value: string | number | undefined) {
  if (!singleBlock.value) return;
  editor.value.updateBlockStyle(singleBlock.value.id, { [field]: value });
}

function updateContent(field: string, value: unknown) {
  if (!singleBlock.value) return;
  editor.value.updateBlockContent(singleBlock.value.id, { [field]: value });
}

// ── Scene background ────────────────────────────────────────────────
const currentScene = computed(() => editor.value.currentScene.value);
const currentSceneIndex = computed(() => editor.value.currentSceneIndex.value);

function updateSceneBg(value: string) {
  if (!currentScene.value) return;
  editor.value.updateSceneBackground(currentSceneIndex.value, { value });
}
</script>

<template>
  <div class="p-3">
    <!-- No selection state -->
    <template v-if="!singleBlock">
      <div v-if="selectedBlocks.length === 0">
        <!-- Scene properties when nothing selected -->
        <div class="space-y-4">
          <div>
            <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Scene
            </h4>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Background</label>
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="currentScene?.background.value ?? '#ffffff'"
                class="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
                @input="updateSceneBg(($event.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                :value="currentScene?.background.value ?? '#ffffff'"
                class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       rounded px-2 py-1.5 text-gray-700 dark:text-gray-300 font-mono"
                @change="updateSceneBg(($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>

          <p class="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
            Select a block to edit its properties.
          </p>
        </div>
      </div>

      <div v-else class="text-xs text-gray-500 dark:text-gray-400">
        {{ selectedBlocks.length }} blocks selected
      </div>
    </template>

    <!-- Single block selected -->
    <template v-else>
      <div class="space-y-4">
        <!-- Block type badge -->
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                   bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
          >
            {{ singleBlock.type }}
          </span>
          <span v-if="singleBlock.name" class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ singleBlock.name }}
          </span>
        </div>

        <!-- Position & Size -->
        <section>
          <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Position & Size
          </h4>
          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="text-[10px] text-gray-400 uppercase">X</span>
              <input
                type="number"
                :value="Math.round(singleBlock.position.x)"
                class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
                @change="updatePosition('x', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <label class="block">
              <span class="text-[10px] text-gray-400 uppercase">Y</span>
              <input
                type="number"
                :value="Math.round(singleBlock.position.y)"
                class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
                @change="updatePosition('y', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <label class="block">
              <span class="text-[10px] text-gray-400 uppercase">W</span>
              <input
                type="number"
                :value="Math.round(singleBlock.position.width)"
                class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
                min="10"
                @change="updatePosition('width', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
            <label class="block">
              <span class="text-[10px] text-gray-400 uppercase">H</span>
              <input
                type="number"
                :value="Math.round(singleBlock.position.height)"
                class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
                min="10"
                @change="updatePosition('height', Number(($event.target as HTMLInputElement).value))"
              />
            </label>
          </div>

          <!-- Rotation -->
          <label class="flex items-center gap-2 mt-2">
            <RotateCw class="w-3 h-3 text-gray-400" />
            <input
              type="number"
              :value="singleBlock.position.rotation ?? 0"
              class="w-16 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
              step="1"
              @change="updatePosition('rotation', Number(($event.target as HTMLInputElement).value))"
            />
            <span class="text-[10px] text-gray-400">deg</span>
          </label>
        </section>

        <!-- Style -->
        <section>
          <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Style
          </h4>

          <!-- Background color -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Fill</span>
            <input
              type="color"
              :value="singleBlock.style.backgroundColor || '#ffffff'"
              class="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
              @input="updateStyle('backgroundColor', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="text"
              :value="singleBlock.style.backgroundColor || ''"
              placeholder="none"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono"
              @change="updateStyle('backgroundColor', ($event.target as HTMLInputElement).value || undefined)"
            />
          </label>

          <!-- Border radius -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Rad</span>
            <input
              type="text"
              :value="singleBlock.style.borderRadius || '0'"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateStyle('borderRadius', ($event.target as HTMLInputElement).value || undefined)"
            />
          </label>

          <!-- Border -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Bdr</span>
            <input
              type="text"
              :value="singleBlock.style.border || ''"
              placeholder="1px solid #ccc"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateStyle('border', ($event.target as HTMLInputElement).value || undefined)"
            />
          </label>

          <!-- Box shadow -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Shd</span>
            <input
              type="text"
              :value="singleBlock.style.boxShadow || ''"
              placeholder="0 2px 8px rgba(0,0,0,0.1)"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateStyle('boxShadow', ($event.target as HTMLInputElement).value || undefined)"
            />
          </label>

          <!-- Opacity -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Opa</span>
            <input
              type="range"
              :value="(singleBlock.style.opacity ?? 1) * 100"
              min="0"
              max="100"
              step="1"
              class="flex-1 h-1 accent-primary-500"
              @input="updateStyle('opacity', Number(($event.target as HTMLInputElement).value) / 100)"
            />
            <span class="text-[10px] text-gray-400 w-8 text-right tabular-nums">
              {{ Math.round((singleBlock.style.opacity ?? 1) * 100) }}%
            </span>
          </label>

          <!-- Padding -->
          <label class="flex items-center gap-2">
            <span class="text-[10px] text-gray-400 w-8">Pad</span>
            <input
              type="text"
              :value="singleBlock.style.padding || '0'"
              placeholder="16px"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateStyle('padding', ($event.target as HTMLInputElement).value || undefined)"
            />
          </label>
        </section>

        <!-- Text-specific properties -->
        <section v-if="singleBlock.type === 'text' || singleBlock.type === 'heading'">
          <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Typography
          </h4>

          <!-- Font size -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Size</span>
            <input
              type="number"
              :value="(singleBlock.content as StoryTextContent).fontSize ?? 16"
              min="8"
              max="200"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
              @change="updateContent('fontSize', Number(($event.target as HTMLInputElement).value))"
            />
          </label>

          <!-- Font family -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Font</span>
            <select
              :value="(singleBlock.content as StoryTextContent).fontFamily || 'Inter, system-ui, sans-serif'"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateContent('fontFamily', ($event.target as HTMLSelectElement).value)"
            >
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
            </select>
          </label>

          <!-- Font weight -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Wgt</span>
            <select
              :value="(singleBlock.content as StoryTextContent).fontWeight || '400'"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateContent('fontWeight', ($event.target as HTMLSelectElement).value)"
            >
              <option value="300">Light</option>
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
              <option value="700">Bold</option>
              <option value="800">Extra Bold</option>
              <option value="900">Black</option>
            </select>
          </label>

          <!-- Text color -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Color</span>
            <input
              type="color"
              :value="(singleBlock.content as StoryTextContent).color || '#1a1a2e'"
              class="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
              @input="updateContent('color', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="text"
              :value="(singleBlock.content as StoryTextContent).color || '#1a1a2e'"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono"
              @change="updateContent('color', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <!-- Text align -->
          <div class="flex items-center gap-1 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Align</span>
            <div class="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                v-for="align in [
                  { value: 'left', icon: AlignLeft },
                  { value: 'center', icon: AlignCenter },
                  { value: 'right', icon: AlignRight },
                  { value: 'justify', icon: AlignJustify },
                ]"
                :key="align.value"
                :class="[
                  'p-1.5 transition-colors',
                  (singleBlock.content as StoryTextContent).textAlign === align.value
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                ]"
                @click="updateContent('textAlign', align.value)"
              >
                <component :is="align.icon" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Line height -->
          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">LH</span>
            <input
              type="number"
              :value="(singleBlock.content as StoryTextContent).lineHeight ?? 1.5"
              min="0.5"
              max="4"
              step="0.1"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
              @change="updateContent('lineHeight', Number(($event.target as HTMLInputElement).value))"
            />
          </label>

          <!-- Letter spacing -->
          <label class="flex items-center gap-2">
            <span class="text-[10px] text-gray-400 w-8">LS</span>
            <input
              type="number"
              :value="(singleBlock.content as StoryTextContent).letterSpacing ?? 0"
              step="0.5"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
              @change="updateContent('letterSpacing', Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </section>

        <!-- Image-specific properties -->
        <section v-if="singleBlock.type === 'image'">
          <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Image
          </h4>

          <label class="block mb-2">
            <span class="text-[10px] text-gray-400 uppercase">Source URL</span>
            <input
              type="text"
              :value="(singleBlock.content as StoryImageContent).src"
              placeholder="https://..."
              class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1.5 text-gray-700 dark:text-gray-300"
              @change="updateContent('src', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label class="block mb-2">
            <span class="text-[10px] text-gray-400 uppercase">Alt Text</span>
            <input
              type="text"
              :value="(singleBlock.content as StoryImageContent).alt || ''"
              placeholder="Describe the image"
              class="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1.5 text-gray-700 dark:text-gray-300"
              @change="updateContent('alt', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Fit</span>
            <select
              :value="(singleBlock.content as StoryImageContent).objectFit || 'cover'"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateContent('objectFit', ($event.target as HTMLSelectElement).value)"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
              <option value="none">None</option>
            </select>
          </label>
        </section>

        <!-- Shape-specific properties -->
        <section v-if="singleBlock.type === 'shape'">
          <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Shape
          </h4>

          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Type</span>
            <select
              :value="(singleBlock.content as StoryShapeContent).shape"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300"
              @change="updateContent('shape', ($event.target as HTMLSelectElement).value)"
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="ellipse">Ellipse</option>
              <option value="triangle">Triangle</option>
              <option value="star">Star</option>
              <option value="line">Line</option>
              <option value="arrow">Arrow</option>
            </select>
          </label>

          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Fill</span>
            <input
              type="color"
              :value="(singleBlock.content as StoryShapeContent).fill || '#e5e7eb'"
              class="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
              @input="updateContent('fill', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="text"
              :value="(singleBlock.content as StoryShapeContent).fill || '#e5e7eb'"
              class="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 font-mono"
              @change="updateContent('fill', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label class="flex items-center gap-2 mb-2">
            <span class="text-[10px] text-gray-400 w-8">Strk</span>
            <input
              type="color"
              :value="(singleBlock.content as StoryShapeContent).stroke || '#000000'"
              class="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
              @input="updateContent('stroke', ($event.target as HTMLInputElement).value)"
            />
            <input
              type="number"
              :value="(singleBlock.content as StoryShapeContent).strokeWidth ?? 0"
              min="0"
              max="20"
              class="w-14 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
              @change="updateContent('strokeWidth', Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </section>
      </div>
    </template>
  </div>
</template>
