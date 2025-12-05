<script setup lang="ts">
import { Moon, Sun, Mail, Calendar, UserPlus, LogOut } from 'lucide-vue-next'
import { inject } from 'vue'
import { cn } from '@/lib/utils'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  isMobile: boolean
}>()

const router = useRouter()
const authStore = useAuthStore()
const theme = inject('theme') as { isDark: { value: boolean }, toggleTheme: () => void }

const handleLogout = async () => {
  await authStore.logout()
}

const navigateTo = (route: string) => {
  router.push(route)
}

const menuItems = [
  { icon: Mail, label: 'Mail', route: '/mail' },
  { icon: Calendar, label: 'Calendar', route: '/calendar' },
  { icon: UserPlus, label: 'Contacts', route: '/contacts' }
]
</script>

<template>
  <div :class="cn(
    'flex items-center',
    props.isMobile ? 'ml-1' : 'space-x-4'
  )">
    <button
      v-if="!props.isMobile"
      @click="theme.toggleTheme"
      :class="cn(
        'p-2 rounded-full',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'transition-colors duration-200'
      )"
    >
      <component 
        :is="theme.isDark.value ? Moon : Sun" 
        class="h-6 w-6" 
        :class="theme.isDark.value ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'" 
      />
    </button>

    <!-- User Profile with Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button class="focus:outline-none">
          <div class="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
            <span>{{ authStore.firstName.charAt(0).toUpperCase() }}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <div class="p-2">
          <p class="font-semibold">{{ authStore.firstName }} {{ authStore.lastName }}</p>
          <p class="text-xs text-gray-500">{{ authStore.email }}</p>
        </div>
        <DropdownMenuItem
          v-for="item in menuItems"
          :key="item.route"
          @click="navigateTo(item.route)"
        >
          <component :is="item.icon" class="h-4 w-4 mr-2" />
          <span>{{ item.label }}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          @click="handleLogout"
          class="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut class="h-4 w-4 mr-2" />
          <span>{{$t('Commons.text.logout')}}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template> 