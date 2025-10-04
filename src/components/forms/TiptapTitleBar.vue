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
        
        <!-- Status and Last Saved on the left -->
        <div class="flex items-center gap-3 text-sm">
          <span :class="{
            'text-yellow-500 dark:text-yellow-400': isOffline,
            'text-green-600 dark:text-green-400': !isOffline && !hasUnsavedChanges,
            'text-blue-600 dark:text-blue-400': isSaving || hasUnsavedChanges,
          }">
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
            Share
          </Button>
        </DialogTrigger>
        <DialogContent class="dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle class="dark:text-gray-100">Share Document</DialogTitle>
          </DialogHeader>
          <ShareCard
            @close="shareDialogOpen = false" 
            mode="doc"
            :share-link="shareLink || ''"
            :privacy-type="privacyType || 'private'"
            :members="shareMembers || []"
            @update:privacy-type="$emit('update:privacy-type', $event)"
            @update:members="$emit('update:members', $event)"
          />
        </DialogContent>
      </Dialog>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { ArrowLeft, PencilIcon, Share2, Wifi, WifiOff, Sun, Moon } from 'lucide-vue-next';
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import Button from '@/components/ui/button/Button.vue';
import ShareCard from '@/components/ShareCard.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const props = defineProps<{
  title: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  isOffline?: boolean;
  lastSavedAt?: Date | null;
  shareLink?: string;
  privacyType?: string;
  shareMembers?: any[];
}>();

const emit = defineEmits<{
  (e: 'update:title', value: string): void;
  (e: 'back'): void;
  (e: 'manual-save'): void;
  (e: 'update:privacy-type', value: string): void;
  (e: 'update:members', value: any[]): void;
}>();

const titleRef = ref<HTMLElement | null>(null);
const isTitleEdit = ref(false);
const shareDialogOpen = ref(false);
const isSettingCursor = ref(false);
const iconComponent = defaultIcons.IconMicrosoftWord;
const isDarkMode = ref(false);

// Check initial dark mode state
if (typeof window !== 'undefined') {
  isDarkMode.value = document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

const statusText = computed(() => {
  if (props.isOffline) return 'Offline';
  if (props.isSaving) return 'Saving...';
  if (props.hasUnsavedChanges) return 'Unsaved changes';
  return 'All changes saved';
});

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

const saveTooltip = computed(() => {
  return props.hasUnsavedChanges ? 'Click to save now' : 'Last saved time';
});

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
