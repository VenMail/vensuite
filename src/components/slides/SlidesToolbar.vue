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
      <select
        :value="currentTheme"
        class="text-sm px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
        @change="emit('update:theme', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="theme in themes" :key="theme.value" :value="theme.value">
          {{ theme.label }}
        </option>
      </select>

      <select
        :value="currentLayout"
        class="text-sm px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
        @change="emit('update:layout', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="layout in layouts" :key="layout.value" :value="layout.value">
          {{ layout.label }}
        </option>
      </select>
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
        Infographics
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
            Presenter Mode
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="emit('export', 'pdf')">
            <Download class="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('export', 'pptx')">
            <FileText class="h-4 w-4 mr-2" />
            Export as PPTX
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="emit('print')">
            <Printer class="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ChevronLeft, ChevronRight, Edit, Eye, BarChart3, MoreHorizontal, MonitorSpeaker, Download, FileText, Printer
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { SLIDEV_LAYOUTS, SLIDEV_THEMES } from '@/utils/slidevMarkdown';
import AddSlideSplitButton from './AddSlideSplitButton.vue';
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
  currentSlideIndex: number;
  totalSlides: number;
  currentTheme: string;
  currentLayout: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:mode', value: 'edit' | 'preview'): void;
  (e: 'update:theme', value: string): void;
  (e: 'update:layout', value: string): void;
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

const layouts = SLIDEV_LAYOUTS;
const themes = SLIDEV_THEMES;
</script>
