<template>
  <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
    <!-- Top Menu Bar -->
    <div class="px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
      <!-- Left: Back & Logo -->
      <div class="flex items-center gap-3">
        <button @click="$emit('back')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ArrowLeft class="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        <router-link to="/" class="flex items-center">
          <component :is="iconComponent" class="w-[1.2rem] h-[2.4rem] text-purple-600 dark:text-purple-400" />
        </router-link>

        <!-- File Menu -->
        <SlidesFileMenu
          v-if="showFileMenu"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :total-slides="totalSlides"
          :show-ruler="showRuler"
          :show-thumbnails="showThumbnails"
          :show-properties="showProperties"
          :zoom="zoom"
          :spell-check-enabled="spellCheckEnabled"
          @new-deck="$emit('new-deck')"
          @import-powerpoint="$emit('import-powerpoint')"
          @import-html="$emit('import-html')"
          @export="$emit('export', $event)"
          @print="$emit('print')"
          @undo="$emit('undo')"
          @redo="$emit('redo')"
          @duplicate-slide="$emit('duplicate-slide')"
          @delete-slide="$emit('delete-slide')"
          @toggle-fullscreen="$emit('toggle-fullscreen')"
          @toggle-ruler="$emit('toggle-ruler')"
          @zoom-in="$emit('zoom-in')"
          @zoom-out="$emit('zoom-out')"
          @reset-zoom="$emit('reset-zoom')"
          @add-slide="$emit('add-slide')"
          @show-infographics="$emit('show-infographics')"
          @toggle-thumbnails="$emit('toggle-thumbnails')"
          @toggle-properties="$emit('toggle-properties')"
          @start-presentation="$emit('start-presentation')"
          @start-presenter-mode="$emit('start-presenter-mode')"
          @start-overview="$emit('start-overview')"
          @export-for-presentation="$emit('export-for-presentation')"
          @toggle-spell-check="$emit('toggle-spell-check')"
          @show-emoji-picker="$emit('show-emoji-picker')"
          @show-keyboard-shortcuts="$emit('show-keyboard-shortcuts')"
          @show-help="$emit('show-help')"
        />
      </div>

      <!-- Right: Status & Actions -->
      <div class="flex items-center gap-3">
        <!-- Status Indicator -->
        <div class="flex items-center gap-2 text-sm">
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

        <!-- Quick Actions -->
        <div class="flex items-center gap-1">
          <!-- Presentation Quick Start -->
          <Button
            variant="default"
            size="sm"
            class="bg-green-600 hover:bg-green-700"
            @click="$emit('start-presentation')"
          >
            <Play class="h-4 w-4 mr-1" />
            Present
          </Button>

          <!-- Presenter Mode -->
          <Button
            v-if="showPresenterMode"
            variant="outline"
            size="sm"
            @click="$emit('start-presenter-mode')"
          >
            <MonitorSpeaker class="h-4 w-4 mr-1" />
            Presenter
          </Button>

          <!-- Dark Mode Toggle -->
          <button
            @click="toggleDarkMode"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <Sun v-if="isDarkMode" class="h-4 w-4 text-yellow-500" />
            <Moon v-else class="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          <!-- Online/Offline Indicator -->
          <div
            class="flex items-center"
            :title="isOffline ? 'Offline' : 'Online'"
          >
            <WifiOff v-if="isOffline" class="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            <Wifi v-else class="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>

          <!-- Share Button -->
          <Dialog v-model:open="shareDialogOpen">
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 class="h-4 w-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent class="dark:bg-gray-900 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle class="dark:text-gray-100">Share Presentation</DialogTitle>
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
      </div>
    </div>

    <!-- Title Bar -->
    <div class="px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          ref="titleRef"
          :contenteditable="isTitleEdit"
          class="font-bold text-lg border-b border-dotted border-gray-300 dark:border-gray-600 min-w-[120px] px-2 py-1 relative text-gray-900 dark:text-gray-100"
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

        <!-- Slide Counter -->
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{{ (currentSlideIndex || 0) + 1 }} / {{ totalSlides || 0 }} slides</span>
          <div class="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          <span>{{ formatDuration(duration || 0) }}</span>
        </div>
      </div>

      <!-- Quick Info -->
      <div v-if="showExtendedInfo" class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <!-- Theme Info -->
        <div v-if="currentTheme" class="flex items-center gap-2">
          <Palette class="h-4 w-4" />
          <span>{{ currentTheme }}</span>
        </div>

        <!-- Layout Info -->
        <div v-if="currentLayout" class="flex items-center gap-2">
          <Layout class="h-4 w-4" />
          <span>{{ currentLayout }}</span>
        </div>

        <!-- Word Count -->
        <div v-if="wordCount !== undefined" class="flex items-center gap-2">
          <FileText class="h-4 w-4" />
          <span>{{ wordCount }} words</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { 
  ArrowLeft, PencilIcon, Share2, Wifi, WifiOff, Sun, Moon, Play, MonitorSpeaker, Palette, Layout, FileText
} from 'lucide-vue-next';
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
import SlidesFileMenu from './SlidesFileMenu.vue';

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
  currentSlideIndex?: number;
  totalSlides?: number;
  currentTheme?: string;
  currentLayout?: string;
  duration?: number; // in seconds
  wordCount?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  showRuler?: boolean;
  showThumbnails?: boolean;
  showProperties?: boolean;
  zoom?: number;
  spellCheckEnabled?: boolean;
  showFileMenu?: boolean;
  showPresenterMode?: boolean;
  showExtendedInfo?: boolean;
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
  (e: 'start-presentation'): void;
  (e: 'start-presenter-mode'): void;
  // File menu events
  (e: 'new-deck'): void;
  (e: 'import-powerpoint'): void;
  (e: 'import-html'): void;
  (e: 'export', format: 'pdf' | 'pptx'): void;
  (e: 'print'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'duplicate-slide'): void;
  (e: 'delete-slide'): void;
  (e: 'toggle-fullscreen'): void;
  (e: 'toggle-ruler'): void;
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'reset-zoom'): void;
  (e: 'add-slide'): void;
  (e: 'show-infographics'): void;
  (e: 'toggle-thumbnails'): void;
  (e: 'toggle-properties'): void;
  (e: 'start-overview'): void;
  (e: 'export-for-presentation'): void;
  (e: 'toggle-spell-check'): void;
  (e: 'show-emoji-picker'): void;
  (e: 'show-keyboard-shortcuts'): void;
  (e: 'show-help'): void;
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

function formatDuration(seconds: number = 0): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

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
