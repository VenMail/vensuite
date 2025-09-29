<script setup lang="ts">
  import {
    Menu
  } from 'lucide-vue-next'
  import {
    inject
  } from 'vue'
  import {
    cn
  } from '@/lib/utils'
  import SearchBar from './SearchBar.vue'
  import UserProfile from './UserProfile.vue'

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
      'bg-white dark:bg-gray-900',
      'border-gray-200 dark:border-gray-800',
      'transition-all duration-200',
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
        <button v-if="props.isMobile" @click="emit('toggleSidebar')" :class="cn(
            'inline-flex items-center justify-center p-2 rounded-sm',
            'text-gray-600 dark:text-gray-300',
            'hover:text-gray-800 dark:hover:text-gray-100',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-400',
            'transition duration-150 ease-in-out'
          )">
          <Menu class="h-5 w-5"></Menu>
        </button>

        <div :class="cn(
          'flex items-center',
          props.isMobile ? '!ml-[-4px] scale-90' : 'mr-[158px]'
        )">
          <img :src="theme.isDark.value ? '/logo-white.png' : '/logo-black.png'" alt="VenMail Logo"
            class="h-6 w-full" />
        </div>

        <SearchBar :isMobile="props.isMobile" />
      </div>

      <!-- Right section: User Profile -->
      <UserProfile :isMobile="props.isMobile" />
    </div>
  </nav>
</template>