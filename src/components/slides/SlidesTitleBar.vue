<template>
  <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between transition-colors">
    <div class="flex items-center gap-4">
      <button @click="$emit('back')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <ArrowLeft class="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <router-link to="/">
        <component :is="iconComponent" class="w-[1.5rem] h-[3rem] text-purple-600 dark:text-purple-400" />
      </router-link>

      <div class="flex items-center gap-3">
        <div
          ref="titleRef"
          :contenteditable="isTitleEdit"
          class="font-bold border-b border-dotted border-gray-300 dark:border-gray-600 min-w-[120px] px-2 py-1 relative text-gray-900 dark:text-gray-100"
          :class="{
            'cursor-text': isTitleEdit,
            'hover:bg-gray-100 dark:hover:bg-gray-800': !isTitleEdit,
          }"
          @click="startEditing"
          @input="handleInput"
          @blur="handleBlur"
          @keydown.enter.prevent="handleEnter"
        >
          {{ title }}
        </div>

        <PencilIcon
          v-if="!isTitleEdit"
          @click="startEditing"
          class="h-3 w-3 cursor-pointer text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
        />

        <div class="flex items-center gap-3 text-sm">
          <span :class="statusClasses">
            {{ statusText }}
          </span>

          <span
            v-if="lastSavedAt"
            class="text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200"
            :title="saveTooltip"
            @click="$emit('manual-save')"
          >
            {{ lastSavedText }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button
        @click="toggleDarkMode"
        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <Sun v-if="isDarkMode" class="h-5 w-5 text-yellow-500" />
        <Moon v-else class="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div class="flex items-center" :title="isOffline ? 'Offline' : 'Online'">
        <WifiOff v-if="isOffline" class="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
        <Wifi v-else class="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>

      <Dialog v-model:open="shareDialogOpen">
        <DialogTrigger asChild>
          <Button variant="outline" class="dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            <Share2 class="h-4 w-4 mr-2" />
            {{$t('Commons.button.share')}}
          </Button>
        </DialogTrigger>
        <DialogContent class="dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle class="dark:text-gray-100">{{$t('Commons.heading.share_slides')}}</DialogTitle>
          </DialogHeader>
          <ShareCard
            @close="shareDialogOpen = false"
            mode="doc"
            :share-link="shareLink || ''"
            :privacy-type="Number(privacyType) || 7"
            :members="shareMembers || []"
            @copy-link="$emit('copy-link')"
            @change-privacy="$emit('change-privacy', $event)"
            @invite="$emit('invite', $event)"
            @update-member="$emit('update-member', $event)"
            @remove-member="$emit('remove-member', $event)"
          />
        </DialogContent>
      </Dialog>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowLeft, PencilIcon, Share2, Wifi, WifiOff, Sun, Moon } from 'lucide-vue-next';
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import Button from '@/components/ui/button/Button.vue';
import ShareCard from '@/components/ShareCard.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type ThemeMode = 'light' | 'dark';

const props = defineProps<{
  title: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  isOffline?: boolean;
  lastSavedAt?: Date | null;
  shareLink?: string | null;
  privacyType?: string | number;
  shareMembers?: any[];
}>();

const emit = defineEmits<{
  (e: 'update:title', value: string): void;
  (e: 'back'): void;
  (e: 'manual-save'): void;
  (e: 'copy-link'): void;
  (e: 'change-privacy', value: number): void;
  (e: 'invite', payload: any): void;
  (e: 'update-member', payload: any): void;
  (e: 'remove-member', payload: any): void;
}>();

const THEME_STORAGE_KEY = 'theme';
const THEME_EVENT = 'theme-change';

const iconComponent = defaultIcons.IconMicrosoftPowerpoint;
const isTitleEdit = ref(false);
const titleRef = ref<HTMLElement | null>(null);
const shareDialogOpen = ref(false);
const isDarkMode = ref(false);

function applyTheme(mode: ThemeMode, emitEvent = false, persist = true) {
  if (typeof window === 'undefined') return;
  const isDark = mode === 'dark';
  isDarkMode.value = isDark;
  document.documentElement.classList.toggle('dark', isDark);
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  if (emitEvent) {
    window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_EVENT, { detail: mode }));
  }
}

function syncThemeFromStorage() {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored as ThemeMode, false);
  } else {
    applyTheme('light', false, false);
  }
}

function handleExternalTheme(event: Event) {
  const detail = (event as CustomEvent<ThemeMode>).detail;
  if (detail === 'light' || detail === 'dark') {
    applyTheme(detail, false);
  }
}

onMounted(() => {
  syncThemeFromStorage();
  window.addEventListener(THEME_EVENT, handleExternalTheme as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener(THEME_EVENT, handleExternalTheme as EventListener);
});

function toggleDarkMode() {
  const mode: ThemeMode = isDarkMode.value ? 'light' : 'dark';
  applyTheme(mode, true);
}

const statusText = computed(() => {
  if (props.isOffline) return 'Offline';
  if (props.isSaving) return 'Saving…';
  if (props.hasUnsavedChanges) return 'Unsaved changes';
  return 'All changes saved';
});

const statusClasses = computed(() => ({
  'text-yellow-500 dark:text-yellow-400': props.isOffline,
  'text-blue-600 dark:text-blue-400': props.isSaving || props.hasUnsavedChanges,
  'text-green-600 dark:text-green-400': !props.isOffline && !props.hasUnsavedChanges && !props.isSaving,
}));

const lastSavedText = computed(() => {
  if (!props.lastSavedAt) return '';
  const now = Date.now();
  const diff = now - props.lastSavedAt.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  if (seconds < 10) return 'Saved just now';
  if (seconds < 60) return `Saved ${seconds}s ago`;
  if (minutes < 60) return `Saved ${minutes}m ago`;
  const hh = props.lastSavedAt.getHours().toString().padStart(2, '0');
  const mm = props.lastSavedAt.getMinutes().toString().padStart(2, '0');
  return `Saved at ${hh}:${mm}`;
});

const saveTooltip = computed(() => (props.hasUnsavedChanges ? 'Click to save now' : 'Last saved time'));

function startEditing() {
  if (isTitleEdit.value) return;
  isTitleEdit.value = true;
  nextTick(() => {
    if (!titleRef.value) return;
    titleRef.value.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(titleRef.value);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

function handleInput(event: Event) {
  const target = event.target as HTMLElement;
  const newText = target.textContent?.trim() || 'Untitled Deck';
  emit('update:title', newText);
}

function handleBlur() {
  if (!isTitleEdit.value) return;
  isTitleEdit.value = false;
  emit('manual-save');
}

function handleEnter() {
  titleRef.value?.blur();
}
</script>
