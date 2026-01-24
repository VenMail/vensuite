<template>
  <div ref="root" class="relative inline-flex items-center">
    <!-- Desktop version -->
    <button
      v-if="!props.isMobile"
      type="button"
      :aria-label="t('components.LanguageSwitcher.aria_label.change_language')"
      :aria-expanded="open"
      @click.stop="toggle"
      class="
        relative inline-flex items-center justify-center
        h-10 w-10 rounded-lg
        bg-slate-50 hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-700
        border border-slate-200 hover:border-slate-300 dark:border-gray-600 dark:hover:border-gray-500
        transition-all duration-200
        "
      :class="open ? 'bg-slate-100 border-slate-300 shadow-sm dark:bg-gray-700 dark:border-gray-500' : ''"
    >
      <svg class="w-5 h-5 text-slate-600 dark:text-gray-300 transition-colors" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8" />
        <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.4" />
        <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.4" />
        <path d="M12 2.5c-2.2 2-3.5 5.4-3.5 9.5 0 4.1 1.3 7.5 3.5 9.5" fill="none" stroke="currentColor" stroke-width="1.2" />
        <path d="M12 2.5c2.2 2 3.5 5.4 3.5 9.5 0 4.1-1.3 7.5-3.5 9.5" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>

      <span
        class="
          absolute -top-1 -right-1
          min-w-[22px] h-[18px]
          flex items-center justify-center
          px-1.5 rounded-md
          bg-slate-700 text-white dark:bg-gray-100 dark:text-gray-900
          border border-slate-600 dark:border-gray-300
          font-medium tracking-wide
          shadow-sm
          transition-all duration-200
          text-[10px]
        "
        :class="open ? 'scale-100 opacity-100' : 'scale-90 opacity-90'"
        style="line-height: 1;"
      >
        {{ badgeText }}
      </span>
    </button>

    <!-- Mobile version - compact cycling -->
    <button
      v-else
      type="button"
      :aria-label="t('components.LanguageSwitcher.aria_label.change_language')"
      @click="cycleLanguage"
      class="
        relative inline-flex items-center justify-center
        h-8 w-8 rounded-md
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
        transition-all duration-200
        "
    >
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ currentLanguageShort }}</span>
    </button>

    <!-- Desktop dropdown -->
    <div
      v-if="!props.isMobile && open"
      class="
        absolute top-12 min-w-[220px]
        bg-white dark:bg-gray-800 rounded-lg
        border border-slate-200 dark:border-gray-600
        shadow-xl dark:shadow-gray-900/50
        overflow-hidden
        z-50
        animate-in fade-in slide-in-from-top-2 duration-200
        right-0
      "
      @click.stop
    >
      <div class="px-4 py-2.5 bg-slate-50 dark:bg-gray-700 border-b border-slate-200 dark:border-gray-600">
        <p class="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
          {{ t('LanguageSwitcher.text.select_language') }}
        </p>
      </div>

      <div class="py-1">
        <button
          v-for="lang in languages"
          :key="lang.code"
          type="button"
          @click="set(lang.code)"
          class="
            flex w-full items-center gap-3 px-4 py-2.5
            transition-colors duration-150
          "
          :class="locale === lang.code ? 'bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'"
        >
          <span class="text-lg leading-none">{{ lang.flag }}</span>
          <div class="flex-1 text-left">
            <div class="font-medium">{{ lang.nativeLabel }}</div>
            <div class="text-xs text-slate-500 dark:text-gray-400">{{ lang.label }}</div>
          </div>
          <svg v-if="locale === lang.code" class="w-4 h-4 text-slate-600 dark:text-gray-300" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 13.5l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { setLocale } from '@/i18n';
import { useTranslation } from '@/composables/useTranslation';

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
});

const root = ref(null);
const open = ref(false);

const { t, locale } = useTranslation();

function toggle() {
  open.value = !open.value;
}

function set(lng) {
  open.value = false;
  setLocale(lng);
}

function cycleLanguage() {
  const currentIndex = languages.findIndex(lang => lang.code === locale.value);
  const nextIndex = (currentIndex + 1) % languages.length;
  setLocale(languages[nextIndex].code);
}

const badgeText = computed(() => {
  const key = `LanguageSwitcher.text.${locale.value}`;
  const val = t(key);
  return val === key ? String(locale.value || '').toUpperCase() : val;
});

const currentLanguageShort = computed(() => {
  return String(locale.value || '').toUpperCase();
});

const languages = [
  { code: 'en', flag: '\ud83c\uddfa\ud83c\uddf8', label: t('LanguageSwitcher.text.english'), nativeLabel: 'English' },
  { code: 'fr', flag: '\ud83c\uddeb\ud83c\uddf7', label: t('components.LanguageSwitcher.text.francais'), nativeLabel: 'Français' },
  { code: 'zh', flag: '\ud83c\udde8\ud83c\uddf3', label: t('LanguageSwitcher.text.chinese'), nativeLabel: '中文' },
];

function onDocClick(e) {
  if (!root.value) return;
  if (!root.value.contains(e.target)) open.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>
