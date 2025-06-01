<script setup lang="ts">
import { Mail, Calendar, UserPlus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { cn } from '@/lib/utils'

const router = useRouter()

const navItems = [
  { icon: Mail, route: '/mail' },
  { icon: Calendar, route: '/calendar' },
  { icon: UserPlus, route: '/contacts' }
]

const navigateToRoute = (route: string) => {
  router.push(route)
}
</script>

<template>
  <div class="flex items-center space-x-2">
    <button
      v-for="(item, index) in navItems"
      :key="index"
      @click="navigateToRoute(item.route)"
      :class="cn(
        'p-2 rounded-sm',
        'text-gray-600 dark:text-gray-300',
        'hover:text-gray-800 dark:hover:text-gray-100',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'transition-colors duration-200'
      )"
    >
      <component :is="item.icon" class="h-5 w-5" />
    </button>
  </div>
</template> 