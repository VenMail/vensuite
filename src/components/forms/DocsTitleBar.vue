<template>
  <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between transition-colors">
    <div class="flex items-center gap-4">
      <button @click="$emit('back')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <ArrowLeft class="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <router-link to="/">
        <component :is="iconComponent" class="w-[1.5rem] h-[3rem] text-blue-600 dark:text-blue-400" />
      </router-link>

      <div class="flex items-center gap-3">
        <div
          ref="titleRef"
          :contenteditable="isTitleEdit"
          class="font-bold border-b border-dotted border-gray-300 dark:border-gray-600 min-w-[100px] px-2 py-1 relative text-gray-900 dark:text-gray-100"
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
          <span
            v-if="lastSavedAt"
            :class="{
              'text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200': true,
              'text-yellow-500 dark:text-yellow-400': isOffline,
              'text-green-600 dark:text-green-400': !isOffline
            }"
            :title="isOffline ? 'Offline - changes will sync when online' : 'Last saved'"
            @click="$emit('manual-save')"
          >
            {{ lastSavedText }}
          </span>

           
          <div class="relative inline-block" ref="versionAreaRef">
            <button
              v-if="showVersionHistory"
              @click="onVersionButtonClick"
              class="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm cursor-pointer transition-colors"
              :title="isVersionDropdownOpen ? 'Hide version history' : 'Show version history'"
            >
              <Clock class="w-4 h-4" />
              <span v-if="versionCount && versionCount > 0" class="text-xs">{{ versionCount }}</span>
            </button>

             
            <transition name="fade">
              <div
                v-if="isVersionDropdownOpen"
                class="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
                @click.stop
              >
                <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">{{$t('Commons.heading.version_history')}}</h3>
                  <button
                    @click="isVersionDropdownOpen = false"
                    class="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div class="max-h-80 overflow-y-auto">
                  <div v-if="isLoadingVersions" class="p-4 text-center text-gray-500 dark:text-gray-400">
                    Loading versions...
                  </div>
                  <template v-else>
                    <div class="divide-y divide-gray-200 dark:divide-gray-700">
                       
                      <div class="p-3 bg-blue-50 dark:bg-blue-900/20">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.text.current_version')}}</span>
                          </div>
                          <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(currentVersion.updated_at_human) }}</span>
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {{ formatFileSize(currentVersion.file_size) }}
                        </div>
                      </div>

                       
                      <div v-if="versionHistory.length === 0" class="p-3 text-center text-gray-500 dark:text-gray-400">
                        {{$t('Forms.DocsTitleBar.text.no_previous_versions')}}
                      </div>
                      <template v-else>
                        <div
                          v-for="version in versionHistory"
                          :key="version.id"
                          class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          @click="selectVersion(version)"
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span class="text-sm text-gray-900 dark:text-gray-100">Version {{ version.version_number }}</span>
                            </div>
                            <div class="text-right">
                              <div class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(version.created_at_human) }}</div>
                              <div class="text-xs text-gray-400 dark:text-gray-500">{{ formatFileSize(version.file_size) }}</div>
                            </div>
                          </div>
                          <div v-if="version.change_note" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {{ version.change_note }}
                          </div>
                        </div>
                      </template>
                    </div>
                  </template>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <!-- Dark Mode Toggle -->
      <button
        @click="toggleDarkMode"
        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <Sun v-if="isDarkMode" class="h-5 w-5 text-yellow-500" />
        <Moon v-else class="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      <!-- Online/Offline Indicator -->
      <div
        class="flex items-center"
        :title="isOffline ? 'Offline' : 'Online'"
      >
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
          <!-- <DialogHeader>
            <DialogTitle class="dark:text-gray-100">{{$t('Commons.heading.share_document')}}</DialogTitle>
          </DialogHeader> -->
          <ShareCard
            @close="shareDialogOpen = false"
            mode="doc"
            :share-link="shareLink || ''"
            :privacy-type="privacyType || 7"
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
import { ref, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { ArrowLeft, PencilIcon, Share2, Wifi, WifiOff, Sun, Moon, Clock, X } from 'lucide-vue-next';
import { Dialog, DialogTrigger, DialogContent } from '../ui/dialog';
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import Button from '@/components/ui/button/Button.vue';
import ShareCard from '@/components/ShareCard.vue';
import { useFileStore } from '@/store/files';

const props = defineProps<{
  title: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  isOffline?: boolean;
  lastSavedAt?: Date | null;
  shareLink?: string;
  privacyType?: number;
  shareMembers?: any[];
  showVersionHistory?: boolean;
  versionCount?: number;
  currentFileId?: string;
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
  (e: 'open-version-history'): void;
  (e: 'select-version', version: any): void;
}>();

const titleRef = ref<HTMLElement | null>(null);
const isTitleEdit = ref(false);
const shareDialogOpen = ref(false);
const isSettingCursor = ref(false);
const iconComponent = defaultIcons.IconMicrosoftWord;

// Version history state
const isVersionDropdownOpen = ref(false);
const isLoadingVersions = ref(false);
const versionHistory = ref<any[]>([]);
const currentVersion = ref<any>({});
const versionAreaRef = ref<HTMLElement | null>(null);

// Theme state
const isDarkMode = ref(false);

type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'theme';
const THEME_EVENT = 'theme-change';


const lastSavedText = computed(() => {
  if (!props.lastSavedAt) return '';
  
  const now = new Date();
  const diff = now.getTime() - props.lastSavedAt.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (seconds < 10) return 'Saved just now';
  if (seconds < 60) return `Saved ${seconds}s ago`;
  if (minutes < 60) return `Saved ${minutes}m ago`;
  
  const hh = props.lastSavedAt.getHours().toString().padStart(2, '0');
  const mm = props.lastSavedAt.getMinutes().toString().padStart(2, '0');
  return `Saved at ${hh}:${mm}`;
});

// const saveTooltip = computed(() => {
//   return props.hasUnsavedChanges ? 'Click to save now' : 'Last saved time';
// });

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
  if (typeof window !== 'undefined') {
    window.addEventListener(THEME_EVENT, handleExternalTheme as EventListener);
    window.addEventListener('click', handleOutsideClick);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener(THEME_EVENT, handleExternalTheme as EventListener);
    window.removeEventListener('click', handleOutsideClick);
  }
});

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as Node;
  const area = versionAreaRef.value;
  if (!area) return;
  if (isVersionDropdownOpen.value && !area.contains(target)) {
    isVersionDropdownOpen.value = false;
  }
}

function toggleDarkMode() {
  const mode: ThemeMode = isDarkMode.value ? 'light' : 'dark';
  applyTheme(mode, true);
}

// Version history methods
async function loadVersionHistory() {
  console.log("Attempt", props.currentFileId)
  if (!props.currentFileId) return;

  isLoadingVersions.value = true;
  try {
    const fileStore = useFileStore();
    console.log("loading version for ", props.currentFileId)
    const response = await fileStore.listVersions(props.currentFileId);
    if (response) {
      versionHistory.value = response.versions || [];
      currentVersion.value = response.current_version || {};
    }
  } catch (error) {
    console.error('Failed to load version history:', error);
  } finally {
    isLoadingVersions.value = false;
  }
}

function toggleVersionDropdown() {
  isVersionDropdownOpen.value = !isVersionDropdownOpen.value;
  if (isVersionDropdownOpen.value && versionHistory.value.length === 0) {
    loadVersionHistory();
  }
}

function selectVersion(version: any) {
  emit('select-version', version);
  isVersionDropdownOpen.value = false;
}

function onVersionButtonClick() {
  // Keep parent informed while still handling dropdown locally
  emit('open-version-history');
  toggleVersionDropdown();
}

// Reload versions whenever the file changes
watch(
  () => props.currentFileId,
  (newId) => {
    if (newId) {
      loadVersionHistory();
    }
  },
  { immediate: true }
);

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const timestamp = Date.parse(dateStr);
  if (isNaN(timestamp)) {
    // Probably already a human readable string from API
    return String(dateStr);
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function startEditing() {
  isTitleEdit.value = true;
  nextTick(() => {
    if (titleRef.value) {
      titleRef.value.focus();
      const range = document.createRange();
      range.selectNodeContents(titleRef.value);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
}

function handleInput(event: Event) {
  const target = event.target as HTMLElement;
  const newText = target.textContent || 'Untitled Document';

  const selection = window.getSelection();
  const range = selection?.getRangeAt(0);
  const offset = range?.startOffset;

  emit('update:title', newText);

  nextTick(() => {
    isSettingCursor.value = true;
    restoreCursorPosition(target, offset ?? newText.length);
    isSettingCursor.value = false;
  });
}

function restoreCursorPosition(element: HTMLElement, offset: number) {
  const range = document.createRange();
  const selection = window.getSelection();

  try {
    const textNode = element.firstChild || element;
    const safeOffset = Math.min(offset, (textNode.textContent || '').length);
    range.setStart(textNode, safeOffset);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  } catch (e) {
    console.warn('Could not restore cursor position:', e);
  }
}

function handleBlur() {
  isTitleEdit.value = false;
  emit('manual-save');
}

function handleEnter() {
  if (titleRef.value) {
    titleRef.value.blur();
  }
}

// openVersionHistory removed; handled by onVersionButtonClick()
</script>

<style scoped>
[contenteditable="true"] {
  outline: 2px solid #4d7cfe;
  border-radius: 4px;
  padding: 2px 6px;
}

@media (prefers-color-scheme: dark) {
  [contenteditable="true"] {
    outline-color: #60a5fa;
  }
}
</style>
