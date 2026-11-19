<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  AlignLeft, Calculator, Calendar, Check, CheckSquare, ChevronDown, CircleDot,
  Clock, Hash, Mail, Phone, Search, SlidersHorizontal, Star, ToggleLeft, Type, Upload,
} from 'lucide-vue-next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { slashMenuItems, type BlockType } from './types';

const props = defineProps<{ open: boolean; currentType?: BlockType }>();
const emit = defineEmits<{
  close: [];
  select: [type: BlockType];
  restoreFocus: [event: Event];
}>();

const icons = { AlignLeft, Calculator, Calendar, CheckSquare, ChevronDown, CircleDot, Clock, Hash, Mail, Phone, SlidersHorizontal, Star, ToggleLeft, Type, Upload };
const sections: { label: string; types: BlockType[] }[] = [
  { label: 'Text & contact', types: ['short', 'long', 'email', 'phone'] },
  { label: 'Choice', types: ['radio', 'checkbox', 'select', 'yesno'] },
  { label: 'Numbers & dates', types: ['number', 'calculated', 'rating', 'slider', 'date', 'time'] },
  { label: 'Attachments', types: ['file'] },
];
const query = ref('');
const search = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
watch(() => props.open, (open) => { if (open) query.value = ''; });

const groups = computed(() => {
  const searchTerm = query.value.trim().toLowerCase();
  return sections.map(({ label, types }) => ({
    label,
    items: types.flatMap((type) => slashMenuItems.filter((item) =>
      item.type === type && (!searchTerm || [item.label, ...item.keywords].some((word) => word.toLowerCase().includes(searchTerm))),
    )),
  })).filter(({ items }) => items.length);
});
const focusSearch = (event: Event) => {
  event.preventDefault();
  search.value?.focus();
};

const handleSearchKey = (event: KeyboardEvent) => {
  if (event.isComposing) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    list.value?.querySelector('button')?.focus();
  } else if (event.key === 'Enter' && query.value.trim() && groups.value.length) {
    event.preventDefault();
    emit('select', groups.value[0].items[0].type);
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('close')">
    <DialogContent
      class="picker-dialog w-[calc(100%_-_24px)] max-w-[38rem] gap-0 overflow-hidden rounded-2xl p-0"
      :aria-describedby="undefined"
      @open-auto-focus="focusSearch"
      @close-auto-focus="emit('restoreFocus', $event)"
    >
      <header class="picker-header">
        <DialogTitle>{{ currentType ? 'Question type' : 'Add a question' }}</DialogTitle>
        <label class="picker-search">
          <Search :size="18" aria-hidden="true" />
          <input ref="search" v-model="query" type="search" placeholder="Search question types" aria-label="Search question types" @keydown="handleSearchKey" />
        </label>
      </header>
      <div ref="list" class="picker-list">
        <section v-for="group in groups" :key="group.label" :aria-label="group.label">
          <h3>{{ group.label }}</h3>
          <div class="picker-grid">
            <button v-for="item in group.items" :key="item.id" type="button" :class="{ 'picker-current': currentType === item.type }" @click="emit('select', item.type)">
              <component :is="icons[item.icon as keyof typeof icons] || Type" :size="17" aria-hidden="true" />
              {{ item.label }}
              <Check v-if="currentType === item.type" :size="16" class="picker-check" aria-label="Current type" />
            </button>
          </div>
        </section>
        <p v-if="!groups.length" role="status">No matching question types.</p>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.picker-header { padding: 1.25rem 1.25rem 1rem; border-bottom: 1px solid var(--picker-line); }
.picker-header h2 { padding-right: 1.5rem; font-size: 1.3rem; font-weight: 720; letter-spacing: -0.025em; }
.picker-search { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.9rem; padding-inline: 0.75rem; border: 1px solid var(--picker-line); border-radius: 0.65rem; }
.picker-search input { width: 100%; min-height: 44px; background: transparent; outline: none; }
.picker-search:focus-within, .picker-grid button:focus-visible { outline: 2px solid var(--picker-accent); outline-offset: 2px; }
.picker-header, .picker-list { --picker-line: #dce2e7; --picker-accent: #0f766e; }
:global(.dark) .picker-header, :global(.dark) .picker-list { --picker-line: #475569; --picker-accent: #5eead4; }
.picker-list { display: grid; gap: 1.1rem; max-height: min(57dvh, 30rem); overflow: auto; overscroll-behavior: contain; padding: 1rem 1.25rem 1.4rem; }
.picker-list h3 { margin-bottom: 0.45rem; font-size: 0.8rem; font-weight: 700; }
.picker-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem; }
.picker-grid button { display: flex; min-height: 44px; align-items: center; gap: 0.5rem; padding: 0.55rem; border-radius: 0.55rem; font-size: 0.875rem; font-weight: 600; text-align: left; }
.picker-grid button:hover, .picker-current { background: color-mix(in srgb, var(--picker-accent) 10%, transparent); }
.picker-grid svg { flex: none; color: var(--picker-accent); }
.picker-check { margin-inline-start: auto; }
@media (max-width: 370px) { .picker-grid button { font-size: 0.8rem; } }
</style>
