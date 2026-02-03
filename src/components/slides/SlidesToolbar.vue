<template>
  <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
    <!-- Left: Mode Toggle & Slide Navigation -->
    <div class="flex items-center gap-3">
      <!-- Mode Toggle -->
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          v-for="m in modes"
          :key="m.value"
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="{
            'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100': mode === m.value,
            'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100': mode !== m.value
          }"
          @click="emit('update:mode', m.value as 'edit' | 'preview')"
        >
          <component :is="m.icon" class="h-4 w-4 inline-block mr-1.5" />
          {{ m.label }}
        </button>
      </div>

      <!-- Arrange / Finish (when in edit mode) -->
      <template v-if="mode === 'edit'">
        <button
          v-if="!arrangeMode"
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Arrange layout: move elements in preview. Markdown collapses; click Finish when done."
          @click="emit('enter-arrange')"
        >
          <Move class="h-4 w-4 inline-block mr-1.5" />
          Arrange
        </button>
        <button
          v-else
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          title="Finish arranging"
          @click="emit('finish-arrange')"
        >
          Finish
        </button>
      </template>

      <!-- Slide Navigation -->
      <div class="flex items-center gap-2">
        <button
          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          :disabled="currentSlideIndex <= 0"
          @click="emit('previous-slide')"
        >
          <ChevronLeft class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
          {{ currentSlideIndex + 1 }} / {{ totalSlides }}
        </span>
        <button
          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          :disabled="currentSlideIndex >= totalSlides - 1"
          @click="emit('next-slide')"
        >
          <ChevronRight class="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <!-- Theme & Layout Controls -->
      <ImprovedToolbarControls
        :current-theme="currentTheme"
        :current-layout="currentLayout"
        @update:theme="emit('update:theme', $event)"
        @update:layout="emit('update:layout', $event)"
      />
    </div>

    <!-- Right: Slide Actions -->
    <div class="flex items-center gap-2">
      <AddSlideSplitButton 
        @add-slide="emit('add-slide')"
        @add-slide-with-template="emit('add-slide-with-template', $event)"
      />
      
      <!-- Infographics Button -->
      <Button variant="outline" size="sm" @click="emit('open-infographics')">
        <BarChart3 class="h-4 w-4 mr-1" />
        {{$t('Commons.button.infographics')}}
      </Button>

      <!-- More Actions Menu -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="dark:bg-gray-900 dark:border-gray-700">
          <DropdownMenuItem @click="emit('start-presenter-mode')">
            <MonitorSpeaker class="h-4 w-4 mr-2" />
            {{$t('Commons.text.presenter_mode')}}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="emit('export', 'pdf')">
            <Download class="h-4 w-4 mr-2" />
            {{$t('Components.Slides.text.export_as_pdf')}}
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('export', 'pptx')">
            <FileText class="h-4 w-4 mr-2" />
            {{$t('Components.Slides.text.export_as_pptx')}}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="emit('print')">
            <Printer class="h-4 w-4 mr-2" />
            {{$t('Commons.text.print')}}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ChevronLeft, ChevronRight, Edit, Eye, Move, BarChart3, MoreHorizontal, MonitorSpeaker, Download, FileText, Printer
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import AddSlideSplitButton from './AddSlideSplitButton.vue';
import ImprovedToolbarControls from './ImprovedToolbarControls.vue';
import type { SlideTemplate } from '@/utils/slidevMarkdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  mode: 'edit' | 'preview';
  arrangeMode?: boolean;
  currentSlideIndex: number;
  totalSlides: number;
  currentTheme: string;
  currentLayout: string;
}

withDefaults(defineProps<Props>(), { arrangeMode: false });

const emit = defineEmits<{
  (e: 'update:mode', value: 'edit' | 'preview'): void;
  (e: 'update:theme', value: string): void;
  (e: 'update:layout', value: string): void;
  (e: 'enter-arrange'): void;
  (e: 'finish-arrange'): void;
  (e: 'previous-slide'): void;
  (e: 'next-slide'): void;
  (e: 'add-slide'): void;
  (e: 'add-slide-with-template', template: SlideTemplate): void;
  (e: 'open-infographics'): void;
  (e: 'start-presenter-mode'): void;
  (e: 'export', format: 'pdf' | 'pptx'): void;
  (e: 'print'): void;
}>();

const modes = [
  { value: 'edit', label: 'Edit', icon: Edit },
  { value: 'preview', label: 'Preview', icon: Eye }
];
</script>
