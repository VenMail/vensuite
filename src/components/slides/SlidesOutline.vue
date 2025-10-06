<template>
  <aside class="flex h-full w-full flex-col bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Slides</h2>
      <div class="flex items-center gap-1">
        <button
          class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-purple-400"
          title="Add slide"
          @click="$emit('add')"
        >
          <Plus class="h-4 w-4" />
        </button>
        <DropdownMenu v-if="templates.length > 1">
          <DropdownMenuTrigger as-child>
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-purple-400"
              title="Choose template"
            >
              <ChevronDown class="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="min-w-[200px]">
            <DropdownMenuItem
              v-for="template in templates"
              :key="template.slug"
              @click="onSelectTemplate(template.slug)"
            >
              <Check class="mr-2 h-4 w-4" :class="template.slug === selectedTemplateSlug ? 'opacity-100' : 'opacity-0'" />
              <div class="flex flex-col">
                <span class="text-sm font-medium">{{ template.title }}</span>
                <span v-if="template.description" class="text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto">
      <transition-group name="outline" tag="ul" class="space-y-2 px-3 py-3">
        <li
          v-for="(page, index) in pages"
          :key="page.id"
          :class="[
            'group relative cursor-pointer rounded-lg border shadow-sm transition-all',
            activePageId === page.id
              ? 'border-purple-500 ring-2 ring-purple-400 ring-offset-1 ring-offset-purple-100 dark:ring-offset-gray-900'
              : 'border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-500',
          ]"
          @click="$emit('select', page.id)"
        >
          <div class="flex items-start gap-3 p-3">
            <div class="flex h-16 w-24 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <img
                v-if="page.thumbnail"
                :src="page.thumbnail"
                alt="Slide thumbnail"
                class="h-full w-full object-contain"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                Slide {{ index + 1 }}
              </div>
            </div>
            <div class="flex flex-1 flex-col">
              <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>#{{ index + 1 }}</span>
                <span>{{ formatElementCount(page.scene?.elements?.length || 0) }}</span>
              </div>
              <div class="mt-1 text-sm font-medium text-gray-700 line-clamp-2 dark:text-gray-200">
                {{ page.name || `Slide ${index + 1}` }}
              </div>
            </div>
          </div>

          <div class="absolute inset-y-2 right-2 hidden gap-1 group-hover:flex">
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:text-purple-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-purple-400"
              title="Duplicate"
              @click.stop="$emit('duplicate', page.id)"
            >
              <Copy class="h-4 w-4" />
            </button>
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:text-purple-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-purple-400"
              :disabled="pages.length <= 1"
              title="Delete"
              @click.stop="$emit('delete', page.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <div class="absolute -left-2 top-1/2 flex -translate-y-1/2 flex-col gap-1">
            <button
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent bg-white text-gray-400 transition hover:border-purple-400 hover:text-purple-500 dark:bg-gray-900 dark:text-gray-600 dark:hover:text-purple-300"
              :disabled="index === 0"
              title="Move up"
              @click.stop="$emit('move', 'up', page.id)"
            >
              <ArrowUp class="h-3 w-3" />
            </button>
            <button
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent bg-white text-gray-400 transition hover:border-purple-400 hover:text-purple-500 dark:bg-gray-900 dark:text-gray-600 dark:hover:text-purple-300"
              :disabled="index === pages.length - 1"
              title="Move down"
              @click.stop="$emit('move', 'down', page.id)"
            >
              <ArrowDown class="h-3 w-3" />
            </button>
          </div>
        </li>
      </transition-group>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, Plus, Trash2 } from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SlidePage, SlideTemplateSummary } from '@/types/slides';

const props = defineProps<{
  pages: SlidePage[];
  activePageId: string | null;
  templates: SlideTemplateSummary[];
  selectedTemplateSlug: string;
}>();

const emit = defineEmits<{
  (e: 'add', templateSlug?: string): void;
  (e: 'select', pageId: string): void;
  (e: 'duplicate', pageId: string): void;
  (e: 'delete', pageId: string): void;
  (e: 'move', direction: 'up' | 'down', pageId: string): void;
  (e: 'change-template', slug: string): void;
}>();

function onSelectTemplate(slug: string) {
  emit('change-template', slug);
  emit('add', slug);
}

function formatElementCount(count: number) {
  if (!count) return 'Empty';
  if (count === 1) return '1 element';
  return `${count} elements`;
}
</script>

<style scoped>
.outline-enter-active,
.outline-leave-active {
  transition: all 0.18s ease;
}

.outline-enter-from,
.outline-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
