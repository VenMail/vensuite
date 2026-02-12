<template>
  <div class="flex flex-col h-full">
    <!-- Block Info Header -->
    <div v-if="activeBlock" class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <component :is="blockIcon" class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ blockDef?.label || activeBlock.type }}</span>
        </div>
        <button
          @click="emit('close')"
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <X class="h-3.5 w-3.5 text-gray-400" />
        </button>
      </div>
      <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ blockDef?.description || '' }}</p>
    </div>

    <!-- Properties Form -->
    <div v-if="activeBlock && blockDef" class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
      <!-- Group props by group name -->
      <template v-for="group in propGroups" :key="group.name">
        <div>
          <h4 class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{{ group.name }}</h4>
          <div class="space-y-2">
            <div v-for="prop in group.props" :key="prop.key">
              <!-- Text input -->
              <template v-if="prop.type === 'text'">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ prop.label }}</label>
                <input
                  type="text"
                  :value="resolvedProps[prop.key] ?? prop.default ?? ''"
                  :placeholder="prop.placeholder"
                  class="w-full text-sm px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  @input="handlePropChange(prop.key, ($event.target as HTMLInputElement).value)"
                />
              </template>

              <!-- Textarea -->
              <template v-else-if="prop.type === 'textarea'">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ prop.label }}</label>
                <textarea
                  :value="resolvedProps[prop.key] ?? prop.default ?? ''"
                  :placeholder="prop.placeholder"
                  rows="3"
                  class="w-full text-sm px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  @input="handlePropChange(prop.key, ($event.target as HTMLTextAreaElement).value)"
                />
              </template>

              <!-- Number input -->
              <template v-else-if="prop.type === 'number'">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ prop.label }}</label>
                <input
                  type="number"
                  :value="resolvedProps[prop.key] ?? prop.default ?? 0"
                  class="w-full text-sm px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  @input="handlePropChange(prop.key, ($event.target as HTMLInputElement).value)"
                />
              </template>

              <!-- Select -->
              <template v-else-if="prop.type === 'select'">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ prop.label }}</label>
                <div class="grid gap-1" :class="(prop.options?.length || 0) > 4 ? 'grid-cols-1' : 'grid-cols-2'">
                  <button
                    v-for="opt in prop.options"
                    :key="opt.value"
                    @click="handlePropChange(prop.key, opt.value)"
                    class="px-2.5 py-1.5 text-xs rounded-md border transition-all text-left"
                    :class="(resolvedProps[prop.key] ?? prop.default) === opt.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </template>

              <!-- Color picker -->
              <template v-else-if="prop.type === 'color'">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ prop.label }}</label>
                <div class="flex gap-2">
                  <input
                    type="color"
                    :value="resolvedProps[prop.key] ?? prop.default ?? '#000000'"
                    class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    @input="handlePropChange(prop.key, ($event.target as HTMLInputElement).value)"
                  />
                  <input
                    type="text"
                    :value="resolvedProps[prop.key] ?? prop.default ?? ''"
                    class="flex-1 text-sm px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                    @input="handlePropChange(prop.key, ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </template>

              <!-- Boolean toggle -->
              <template v-else-if="prop.type === 'boolean'">
                <label class="flex items-center gap-2 cursor-pointer">
                  <button
                    @click="handlePropChange(prop.key, String(!(resolvedProps[prop.key] === 'true' || resolvedProps[prop.key] === true)))"
                    class="relative w-8 h-5 rounded-full transition-colors"
                    :class="(resolvedProps[prop.key] === 'true' || resolvedProps[prop.key] === true) ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'"
                  >
                    <span
                      class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      :class="(resolvedProps[prop.key] === 'true' || resolvedProps[prop.key] === true) ? 'translate-x-3.5' : 'translate-x-0.5'"
                    />
                  </button>
                  <span class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ prop.label }}</span>
                </label>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- No editable props -->
      <div v-if="blockDef.props.length === 0" class="text-xs text-gray-400 dark:text-gray-500 italic py-2">
        This block has no editable properties. Edit its content directly in the markdown editor.
      </div>
    </div>

    <!-- No block selected -->
    <div v-else class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <MousePointerClick class="h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
      <p class="text-sm text-gray-500 dark:text-gray-400">Select a block in the preview or markdown editor to edit its properties</p>
    </div>

    <!-- Block Picker (always visible at bottom) -->
    <div class="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
      <button
        @click="showBlockPicker = !showBlockPicker"
        class="w-full px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
      >
        <span class="flex items-center gap-1.5">
          <Plus class="h-3.5 w-3.5" />
          Insert Block
        </span>
        <ChevronUp v-if="showBlockPicker" class="h-3.5 w-3.5" />
        <ChevronDown v-else class="h-3.5 w-3.5" />
      </button>

      <div v-if="showBlockPicker" class="max-h-64 overflow-y-auto p-2 space-y-2">
        <template v-for="cat in blockCategories" :key="cat.name">
          <div>
            <h5 class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1">{{ cat.name }}</h5>
            <div class="space-y-0.5">
              <button
                v-for="block in cat.blocks"
                :key="block.type"
                @click="handleInsertBlock(block)"
                class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
              >
                <div class="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <component :is="getBlockIcon(block.icon)" class="h-3 w-3 text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{{ block.label }}</div>
                  <div class="text-[10px] text-gray-400 dark:text-gray-500 truncate">{{ block.description }}</div>
                </div>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  X, Plus, ChevronUp, ChevronDown, MousePointerClick,
  Presentation, Type, BarChart3, Hash, LayoutGrid, Square,
  Frame, Smile, List, Minus, Maximize, Columns, AlignJustify,
} from 'lucide-vue-next';
import {
  type BlockDefinition,
  type BlockInstance,
  type BlockPropSchema,
  getBlockDefinition,
  getAllBlockDefinitions,
} from '@/utils/slideBlocks';

interface Props {
  activeBlock: BlockInstance | null;
  markdownContent: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update-prop', payload: { blockId: string; propKey: string; propValue: any }): void;
  (e: 'insert-block', markdown: string): void;
  (e: 'close'): void;
}>();

const showBlockPicker = ref(false);

const blockDef = computed<BlockDefinition | undefined>(() => {
  if (!props.activeBlock) return undefined;
  return getBlockDefinition(props.activeBlock.type);
});

const resolvedProps = computed<Record<string, any>>(() => {
  if (!props.activeBlock) return {};
  return { ...props.activeBlock.props };
});

const ICON_MAP: Record<string, any> = {
  Presentation, Type, BarChart3, Hash, LayoutGrid, Square,
  Frame, Smile, List, Minus, Maximize, Columns, AlignJustify,
};

const blockIcon = computed(() => {
  const iconName = blockDef.value?.icon || 'Square';
  return ICON_MAP[iconName] || Square;
});

function getBlockIcon(iconName: string) {
  return ICON_MAP[iconName] || Square;
}

interface PropGroup {
  name: string;
  props: BlockPropSchema[];
}

const propGroups = computed<PropGroup[]>(() => {
  if (!blockDef.value) return [];
  const groups = new Map<string, BlockPropSchema[]>();
  for (const prop of blockDef.value.props) {
    const groupName = prop.group || 'General';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(prop);
  }
  return Array.from(groups.entries()).map(([name, props]) => ({ name, props }));
});

const blockCategories = computed(() => {
  const allBlocks = getAllBlockDefinitions();
  const catMap = new Map<string, BlockDefinition[]>();
  const catLabels: Record<string, string> = {
    layout: 'Layout',
    content: 'Content',
    data: 'Data & Metrics',
    media: 'Media',
    decoration: 'Decoration',
  };
  for (const block of allBlocks) {
    const cat = block.category;
    if (!catMap.has(cat)) catMap.set(cat, []);
    catMap.get(cat)!.push(block);
  }
  return Array.from(catMap.entries()).map(([key, blocks]) => ({
    name: catLabels[key] || key,
    blocks,
  }));
});

function handlePropChange(propKey: string, propValue: any) {
  if (!props.activeBlock) return;
  emit('update-prop', {
    blockId: props.activeBlock.blockId,
    propKey,
    propValue,
  });
}

function handleInsertBlock(block: BlockDefinition) {
  const markdown = block.defaultMarkdown();
  emit('insert-block', markdown);
  showBlockPicker.value = false;
}
</script>
