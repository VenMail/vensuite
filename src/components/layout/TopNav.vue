<script setup lang="ts">
  import {
    Bot,
    Menu,
    Sparkles
  } from 'lucide-vue-next'
  import {
    inject
  } from 'vue'
  import {
    cn
  } from '@/lib/utils'
  import SearchBar from './SearchBar.vue'
  import UserProfile from './UserProfile.vue'
  import LanguageSwitcher from '../LanguageSwitcher.vue'

  const props = defineProps < {
    isMobile: boolean
  } > ()

  const emit = defineEmits < {
    (e: 'toggleSidebar'): void
  } > ()

  const theme = inject('theme') as {
    isDark: {
      value: boolean
    }
  }
</script>

<template>
  <nav :class="cn(
      'w-full items-center gap-2 sm:gap-4 border-b py-3',
      'px-2 sm:px-6',
      'bg-white/[0.82] dark:bg-slate-950/[0.82] backdrop-blur-xl',
      'border-slate-200/80 dark:border-slate-800/80',
      'transition-all duration-200 shadow-sm',
      props.isMobile ? 'h-16' : 'h-20',
    )">
    <div :class="cn(
      'flex items-center w-full',
      props.isMobile ? 'justify-between' : 'justify-between'
    )">
      <!-- Left section: Logo, menu and search -->
      <div :class="cn(
        'flex items-center',
        props.isMobile ? 'space-x-2' : 'space-x-6'
      )">
        <!-- Hamburger menu button (mobile only) -->
        <button v-if="props.isMobile" @click="emit('toggleSidebar')" :class="cn(
          'inline-flex items-center justify-center py-2 px-3 rounded-sm',
          'text-gray-600 dark:text-gray-300',
          'hover:text-gray-800 dark:hover:text-gray-100',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-400',
          'transition duration-150 ease-in-out'
        )">
          <Menu class="h-5 w-5" />
        </button>

        <div :class="cn(
          'flex items-center',
          props.isMobile ? '!ml-[-4px] scale-90' : 'mr-4'
        )">
          <img v-if="props.isMobile" src="/manifest-icon-512.maskable.png" alt="VenMail Logo" class="h-6 w-6 rounded-sm ml-3" />
          <img v-else :src="theme.isDark.value ? '/logo-white.png' : '/logo-black.png'" alt="VenMail Logo"
            class="h-6 w-full" />
        </div>

        <SearchBar :isMobile="props.isMobile" />
      </div>

      <!-- Right section: Language switcher + User Profile -->
      <div class="flex items-center space-x-3">
        <div v-if="!props.isMobile" class="hidden items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200 lg:flex">
          <Bot class="h-4 w-4" />
          <span>AI ready</span>
          <Sparkles class="h-3.5 w-3.5" />
        </div>

        <LanguageSwitcher :isMobile="props.isMobile" />

        <UserProfile :isMobile="props.isMobile" />
      </div>
    </div>
  </nav>
</template>
