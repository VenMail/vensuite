<template>
  <aside
    class="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-700/70 bg-gray-50/70 dark:bg-gray-900/60"
  >
    <div class="p-3">
      <Button
        class="w-full justify-start gap-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/70"
        variant="ghost"
        @click="emit('new-chat')"
      >
        <Plus class="h-4 w-4" />
        New chat
      </Button>
    </div>

    <div class="flex-1 overflow-y-auto px-2 pb-3">
      <p
        v-if="chatStore.sortedConversations.length === 0"
        class="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500"
      >
        Your conversations will appear here
      </p>

      <div
        v-for="convo in chatStore.sortedConversations"
        :key="convo.id"
        class="group relative mb-0.5"
      >
        <button
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left transition-colors"
          :class="
            convo.id === chatStore.activeId
              ? 'bg-violet-50 dark:bg-violet-500/15'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="emit('select', convo.id)"
        >
          <span
            class="block truncate pr-6 text-sm"
            :class="
              convo.id === chatStore.activeId
                ? 'font-medium text-violet-900 dark:text-violet-200'
                : 'text-gray-700 dark:text-gray-300'
            "
          >
            {{ convo.title }}
          </span>
          <span class="block text-[11px] text-gray-400 dark:text-gray-500">
            {{ relativeTime(convo.updatedAt) }}
          </span>
        </button>

        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-all"
          :class="
            confirmingId === convo.id
              ? 'opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
          "
          :aria-label="confirmingId === convo.id ? `Confirm delete ${convo.title}` : `Delete ${convo.title}`"
          @click.stop="onDelete(convo.id)"
          @blur="confirmingId === convo.id && (confirmingId = null)"
        >
          <span v-if="confirmingId === convo.id" class="text-[11px] font-medium px-0.5">Sure?</span>
          <Trash2 v-else class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import { useAiChatStore } from '@/store/aiChat';

const emit = defineEmits<{
  (e: 'new-chat'): void;
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
}>();

const chatStore = useAiChatStore();
const confirmingId = ref<string | null>(null);

function onDelete(id: string) {
  if (confirmingId.value === id) {
    confirmingId.value = null;
    emit('delete', id);
  } else {
    confirmingId.value = id;
  }
}

interface RelativeTimeUnit {
  limit: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}

const UNITS: RelativeTimeUnit[] = [
  { limit: 60_000, divisor: 1000, unit: 'second' },
  { limit: 3_600_000, divisor: 60_000, unit: 'minute' },
  { limit: 86_400_000, divisor: 3_600_000, unit: 'hour' },
  { limit: 604_800_000, divisor: 86_400_000, unit: 'day' },
  { limit: 2_592_000_000, divisor: 604_800_000, unit: 'week' },
  { limit: Infinity, divisor: 2_592_000_000, unit: 'month' },
];

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function relativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 30_000) return 'Just now';
  for (const { limit, divisor, unit } of UNITS) {
    if (elapsed < limit) {
      return rtf.format(-Math.round(elapsed / divisor), unit);
    }
  }
  return '';
}
</script>
