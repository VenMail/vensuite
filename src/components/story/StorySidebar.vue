<script setup lang="ts">
/**
 * StorySidebar — Right panel with tab switching between Layers, Properties, and Theme.
 */
import { ref, inject, computed, watch } from 'vue';
import { Layers, Settings2, Palette, Sparkles } from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import StoryLayersPanel from './StoryLayersPanel.vue';
import StoryPropertiesPanel from './StoryPropertiesPanel.vue';
import StoryThemePanel from './StoryThemePanel.vue';
import StoryAnimationPanel from './StoryAnimationPanel.vue';

const store = inject<StoryStoreReturn>('storyStore')!;

type SidebarTab = 'layers' | 'properties' | 'theme' | 'animate';

const activeTab = ref<SidebarTab>('properties');

const tabs: { id: SidebarTab; label: string; icon: typeof Layers }[] = [
  { id: 'properties', label: 'Properties', icon: Settings2 },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'animate', label: 'Animate', icon: Sparkles },
  { id: 'theme', label: 'Theme', icon: Palette },
];

// Auto-switch to properties when a block is selected
watch(() => store.editor.selectedBlockIds.value.size, (size) => {
  if (size > 0 && activeTab.value !== 'properties' && activeTab.value !== 'animate') {
    activeTab.value = 'properties';
  }
});
</script>

<template>
  <aside
    class="w-[280px] min-w-[280px] bg-white dark:bg-gray-900 border-l border-gray-200
           dark:border-gray-700 flex flex-col overflow-hidden"
  >
    <!-- Tab bar -->
    <div class="flex border-b border-gray-200 dark:border-gray-800">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium',
          'transition-colors duration-150 border-b-2 -mb-px',
          activeTab === tab.id
            ? 'text-primary-600 dark:text-primary-400 border-primary-500'
            : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50',
        ]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-3.5 h-3.5" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Panel content -->
    <div class="flex-1 overflow-y-auto">
      <StoryPropertiesPanel v-if="activeTab === 'properties'" />
      <StoryLayersPanel v-else-if="activeTab === 'layers'" />
      <StoryAnimationPanel v-else-if="activeTab === 'animate'" />
      <StoryThemePanel v-else-if="activeTab === 'theme'" />
    </div>
  </aside>
</template>
