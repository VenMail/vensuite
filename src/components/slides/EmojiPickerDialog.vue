<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Replace with Emoji</DialogTitle>
        <DialogDescription>
          Select an emoji to replace "{{ selectedText }}"
        </DialogDescription>
      </DialogHeader>

      <!-- Search -->
      <div class="relative mb-4">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search emojis..."
          class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Categories -->
      <div class="flex gap-1 mb-3 overflow-x-auto pb-2">
        <button
          v-for="category in categories"
          :key="category.id"
          class="px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors"
          :class="{
            'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': selectedCategory === category.id,
            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700': selectedCategory !== category.id
          }"
          @click="selectedCategory = category.id"
        >
          {{ category.icon }} {{ category.name }}
        </button>
      </div>

      <!-- Emoji Grid -->
      <div class="h-64 overflow-y-auto">
        <div class="grid grid-cols-8 gap-1">
          <button
            v-for="emoji in filteredEmojis"
            :key="emoji.char"
            class="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            :title="emoji.name"
            @click="selectEmoji(emoji.char)"
          >
            {{ emoji.char }}
          </button>
        </div>
        <p v-if="filteredEmojis.length === 0" class="text-center text-gray-500 py-8">
          No emojis found
        </p>
      </div>

      <!-- Recent -->
      <div v-if="recentEmojis.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500 mb-2">Recently Used</p>
        <div class="flex gap-1 flex-wrap">
          <button
            v-for="emoji in recentEmojis"
            :key="emoji"
            class="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Emoji {
  char: string;
  name: string;
  category: string;
}

interface Props {
  open: boolean;
  selectedText: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'select', emoji: string): void;
}>();

const searchQuery = ref('');
const selectedCategory = ref('all');
const recentEmojis = ref<string[]>(loadRecentEmojis());

const categories = [
  { id: 'all', name: 'All', icon: '🔍' },
  { id: 'smileys', name: 'Smileys', icon: '😀' },
  { id: 'people', name: 'People', icon: '👋' },
  { id: 'nature', name: 'Nature', icon: '🌿' },
  { id: 'food', name: 'Food', icon: '🍕' },
  { id: 'activities', name: 'Activities', icon: '⚽' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'objects', name: 'Objects', icon: '💡' },
  { id: 'symbols', name: 'Symbols', icon: '✅' },
  { id: 'flags', name: 'Flags', icon: '🏳️' },
];

const emojis: Emoji[] = [
  // Smileys
  { char: '😀', name: 'grinning face', category: 'smileys' },
  { char: '😃', name: 'grinning face with big eyes', category: 'smileys' },
  { char: '😄', name: 'grinning face with smiling eyes', category: 'smileys' },
  { char: '😁', name: 'beaming face', category: 'smileys' },
  { char: '😅', name: 'grinning face with sweat', category: 'smileys' },
  { char: '😂', name: 'face with tears of joy', category: 'smileys' },
  { char: '🤣', name: 'rolling on the floor laughing', category: 'smileys' },
  { char: '😊', name: 'smiling face with smiling eyes', category: 'smileys' },
  { char: '😇', name: 'smiling face with halo', category: 'smileys' },
  { char: '🙂', name: 'slightly smiling face', category: 'smileys' },
  { char: '😉', name: 'winking face', category: 'smileys' },
  { char: '😌', name: 'relieved face', category: 'smileys' },
  { char: '😍', name: 'smiling face with heart-eyes', category: 'smileys' },
  { char: '🥰', name: 'smiling face with hearts', category: 'smileys' },
  { char: '😘', name: 'face blowing a kiss', category: 'smileys' },
  { char: '😎', name: 'smiling face with sunglasses', category: 'smileys' },
  { char: '🤩', name: 'star-struck', category: 'smileys' },
  { char: '🤔', name: 'thinking face', category: 'smileys' },
  { char: '🤨', name: 'face with raised eyebrow', category: 'smileys' },
  { char: '😐', name: 'neutral face', category: 'smileys' },
  { char: '😑', name: 'expressionless face', category: 'smileys' },
  { char: '😶', name: 'face without mouth', category: 'smileys' },
  { char: '🙄', name: 'face with rolling eyes', category: 'smileys' },
  { char: '😏', name: 'smirking face', category: 'smileys' },
  { char: '😣', name: 'persevering face', category: 'smileys' },
  { char: '😥', name: 'sad but relieved face', category: 'smileys' },
  { char: '😮', name: 'face with open mouth', category: 'smileys' },
  { char: '🤐', name: 'zipper-mouth face', category: 'smileys' },
  { char: '😯', name: 'hushed face', category: 'smileys' },
  { char: '😪', name: 'sleepy face', category: 'smileys' },
  { char: '😫', name: 'tired face', category: 'smileys' },
  { char: '🥱', name: 'yawning face', category: 'smileys' },
  // People
  { char: '👋', name: 'waving hand', category: 'people' },
  { char: '🤚', name: 'raised back of hand', category: 'people' },
  { char: '✋', name: 'raised hand', category: 'people' },
  { char: '🖖', name: 'vulcan salute', category: 'people' },
  { char: '👌', name: 'OK hand', category: 'people' },
  { char: '🤌', name: 'pinched fingers', category: 'people' },
  { char: '✌️', name: 'victory hand', category: 'people' },
  { char: '🤞', name: 'crossed fingers', category: 'people' },
  { char: '🤟', name: 'love-you gesture', category: 'people' },
  { char: '🤘', name: 'sign of the horns', category: 'people' },
  { char: '👍', name: 'thumbs up', category: 'people' },
  { char: '👎', name: 'thumbs down', category: 'people' },
  { char: '👏', name: 'clapping hands', category: 'people' },
  { char: '🙌', name: 'raising hands', category: 'people' },
  { char: '🤝', name: 'handshake', category: 'people' },
  { char: '🙏', name: 'folded hands', category: 'people' },
  { char: '💪', name: 'flexed biceps', category: 'people' },
  { char: '🦾', name: 'mechanical arm', category: 'people' },
  // Objects & Symbols
  { char: '💡', name: 'light bulb', category: 'objects' },
  { char: '📌', name: 'pushpin', category: 'objects' },
  { char: '📎', name: 'paperclip', category: 'objects' },
  { char: '📝', name: 'memo', category: 'objects' },
  { char: '📊', name: 'bar chart', category: 'objects' },
  { char: '📈', name: 'chart increasing', category: 'objects' },
  { char: '📉', name: 'chart decreasing', category: 'objects' },
  { char: '📋', name: 'clipboard', category: 'objects' },
  { char: '📁', name: 'file folder', category: 'objects' },
  { char: '📂', name: 'open file folder', category: 'objects' },
  { char: '🗂️', name: 'card index dividers', category: 'objects' },
  { char: '📅', name: 'calendar', category: 'objects' },
  { char: '📆', name: 'tear-off calendar', category: 'objects' },
  { char: '🗓️', name: 'spiral calendar', category: 'objects' },
  { char: '⏰', name: 'alarm clock', category: 'objects' },
  { char: '⏱️', name: 'stopwatch', category: 'objects' },
  { char: '⏲️', name: 'timer clock', category: 'objects' },
  { char: '🔔', name: 'bell', category: 'objects' },
  { char: '🔕', name: 'bell with slash', category: 'objects' },
  { char: '💻', name: 'laptop', category: 'objects' },
  { char: '🖥️', name: 'desktop computer', category: 'objects' },
  { char: '📱', name: 'mobile phone', category: 'objects' },
  { char: '📧', name: 'e-mail', category: 'objects' },
  { char: '📨', name: 'incoming envelope', category: 'objects' },
  { char: '🔑', name: 'key', category: 'objects' },
  { char: '🔒', name: 'locked', category: 'objects' },
  { char: '🔓', name: 'unlocked', category: 'objects' },
  // Symbols
  { char: '✅', name: 'check mark button', category: 'symbols' },
  { char: '❌', name: 'cross mark', category: 'symbols' },
  { char: '❓', name: 'question mark', category: 'symbols' },
  { char: '❗', name: 'exclamation mark', category: 'symbols' },
  { char: '⭐', name: 'star', category: 'symbols' },
  { char: '🌟', name: 'glowing star', category: 'symbols' },
  { char: '💫', name: 'dizzy', category: 'symbols' },
  { char: '✨', name: 'sparkles', category: 'symbols' },
  { char: '🔥', name: 'fire', category: 'symbols' },
  { char: '💯', name: 'hundred points', category: 'symbols' },
  { char: '💰', name: 'money bag', category: 'symbols' },
  { char: '💵', name: 'dollar banknote', category: 'symbols' },
  { char: '💎', name: 'gem stone', category: 'symbols' },
  { char: '🎯', name: 'direct hit', category: 'symbols' },
  { char: '🏆', name: 'trophy', category: 'symbols' },
  { char: '🥇', name: 'first place medal', category: 'symbols' },
  { char: '🥈', name: 'second place medal', category: 'symbols' },
  { char: '🥉', name: 'third place medal', category: 'symbols' },
  { char: '🎉', name: 'party popper', category: 'symbols' },
  { char: '🎊', name: 'confetti ball', category: 'symbols' },
  { char: '➡️', name: 'right arrow', category: 'symbols' },
  { char: '⬅️', name: 'left arrow', category: 'symbols' },
  { char: '⬆️', name: 'up arrow', category: 'symbols' },
  { char: '⬇️', name: 'down arrow', category: 'symbols' },
  { char: '↗️', name: 'up-right arrow', category: 'symbols' },
  { char: '↘️', name: 'down-right arrow', category: 'symbols' },
  { char: '🔴', name: 'red circle', category: 'symbols' },
  { char: '🟠', name: 'orange circle', category: 'symbols' },
  { char: '🟡', name: 'yellow circle', category: 'symbols' },
  { char: '🟢', name: 'green circle', category: 'symbols' },
  { char: '🔵', name: 'blue circle', category: 'symbols' },
  { char: '🟣', name: 'purple circle', category: 'symbols' },
  { char: '⚪', name: 'white circle', category: 'symbols' },
  { char: '⚫', name: 'black circle', category: 'symbols' },
  // Nature
  { char: '🌿', name: 'herb', category: 'nature' },
  { char: '🌱', name: 'seedling', category: 'nature' },
  { char: '🌲', name: 'evergreen tree', category: 'nature' },
  { char: '🌳', name: 'deciduous tree', category: 'nature' },
  { char: '🌴', name: 'palm tree', category: 'nature' },
  { char: '🌵', name: 'cactus', category: 'nature' },
  { char: '🌸', name: 'cherry blossom', category: 'nature' },
  { char: '🌺', name: 'hibiscus', category: 'nature' },
  { char: '🌻', name: 'sunflower', category: 'nature' },
  { char: '🌼', name: 'blossom', category: 'nature' },
  { char: '🌷', name: 'tulip', category: 'nature' },
  { char: '🌹', name: 'rose', category: 'nature' },
  { char: '☀️', name: 'sun', category: 'nature' },
  { char: '🌙', name: 'crescent moon', category: 'nature' },
  { char: '⭐', name: 'star', category: 'nature' },
  { char: '🌈', name: 'rainbow', category: 'nature' },
  { char: '☁️', name: 'cloud', category: 'nature' },
  { char: '⛈️', name: 'cloud with lightning and rain', category: 'nature' },
  { char: '❄️', name: 'snowflake', category: 'nature' },
  // Activities
  { char: '⚽', name: 'soccer ball', category: 'activities' },
  { char: '🏀', name: 'basketball', category: 'activities' },
  { char: '🏈', name: 'american football', category: 'activities' },
  { char: '⚾', name: 'baseball', category: 'activities' },
  { char: '🎾', name: 'tennis', category: 'activities' },
  { char: '🏐', name: 'volleyball', category: 'activities' },
  { char: '🎮', name: 'video game', category: 'activities' },
  { char: '🎲', name: 'game die', category: 'activities' },
  { char: '🎯', name: 'direct hit', category: 'activities' },
  { char: '🎨', name: 'artist palette', category: 'activities' },
  { char: '🎬', name: 'clapper board', category: 'activities' },
  { char: '🎤', name: 'microphone', category: 'activities' },
  { char: '🎧', name: 'headphone', category: 'activities' },
  { char: '🎵', name: 'musical note', category: 'activities' },
  { char: '🎶', name: 'musical notes', category: 'activities' },
  // Travel
  { char: '✈️', name: 'airplane', category: 'travel' },
  { char: '🚀', name: 'rocket', category: 'travel' },
  { char: '🚗', name: 'automobile', category: 'travel' },
  { char: '🚕', name: 'taxi', category: 'travel' },
  { char: '🚌', name: 'bus', category: 'travel' },
  { char: '🚂', name: 'locomotive', category: 'travel' },
  { char: '🚢', name: 'ship', category: 'travel' },
  { char: '🏠', name: 'house', category: 'travel' },
  { char: '🏢', name: 'office building', category: 'travel' },
  { char: '🏛️', name: 'classical building', category: 'travel' },
  { char: '🗼', name: 'Tokyo tower', category: 'travel' },
  { char: '🗽', name: 'Statue of Liberty', category: 'travel' },
  { char: '🌍', name: 'globe showing Europe-Africa', category: 'travel' },
  { char: '🌎', name: 'globe showing Americas', category: 'travel' },
  { char: '🌏', name: 'globe showing Asia-Australia', category: 'travel' },
  // Food
  { char: '🍕', name: 'pizza', category: 'food' },
  { char: '🍔', name: 'hamburger', category: 'food' },
  { char: '🍟', name: 'french fries', category: 'food' },
  { char: '🌭', name: 'hot dog', category: 'food' },
  { char: '🍿', name: 'popcorn', category: 'food' },
  { char: '🍩', name: 'doughnut', category: 'food' },
  { char: '🍪', name: 'cookie', category: 'food' },
  { char: '🎂', name: 'birthday cake', category: 'food' },
  { char: '🍰', name: 'shortcake', category: 'food' },
  { char: '☕', name: 'hot beverage', category: 'food' },
  { char: '🍵', name: 'teacup without handle', category: 'food' },
  { char: '🥤', name: 'cup with straw', category: 'food' },
  { char: '🍷', name: 'wine glass', category: 'food' },
  { char: '🍺', name: 'beer mug', category: 'food' },
  { char: '🍎', name: 'red apple', category: 'food' },
  { char: '🍊', name: 'tangerine', category: 'food' },
  { char: '🍋', name: 'lemon', category: 'food' },
  { char: '🍇', name: 'grapes', category: 'food' },
  { char: '🍓', name: 'strawberry', category: 'food' },
  { char: '🥑', name: 'avocado', category: 'food' },
];

const filteredEmojis = computed(() => {
  let result = emojis;
  
  if (selectedCategory.value !== 'all') {
    result = result.filter(e => e.category === selectedCategory.value);
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(e => e.name.toLowerCase().includes(query));
  }
  
  return result;
});

function loadRecentEmojis(): string[] {
  try {
    const stored = localStorage.getItem('slides-recent-emojis');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmojis(emojis: string[]) {
  try {
    localStorage.setItem('slides-recent-emojis', JSON.stringify(emojis.slice(0, 16)));
  } catch {
    // Ignore storage errors
  }
}

function selectEmoji(emoji: string) {
  // Add to recent
  const recent = [emoji, ...recentEmojis.value.filter(e => e !== emoji)].slice(0, 16);
  recentEmojis.value = recent;
  saveRecentEmojis(recent);
  
  emit('select', emoji);
  emit('update:open', false);
}
</script>
