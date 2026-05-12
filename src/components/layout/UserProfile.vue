<script setup lang="ts">
import { Calendar, Check, Globe, LogOut, Mail, Moon, PlusCircle, Sun, User, UserPlus, Users } from 'lucide-vue-next'
import { computed, inject, ref } from 'vue'
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
const isSwitchingAccount = ref(false)

type Account = {
  id: string | number
  account_id?: string | number
  type?: string
  name?: string
  email?: string
  is_shared?: boolean
  is_external?: boolean
  provider?: string
  picture_url?: string
  profile_photo_url?: string
}

const accountValue = (account: Account) => String(account.account_id ?? account.id)

const displayName = computed(() => {
  const name = `${authStore.firstName} ${authStore.lastName}`.trim()
  return name || authStore.email || 'Account'
})

const accounts = computed<Account[]>(() => {
  const authenticatedAccounts = (authStore.authenticatedAccounts || []) as Account[]
  if (authenticatedAccounts.length > 0) return authenticatedAccounts

  if (!authStore.email) return []

  return [{
    id: authStore.employeeId || authStore.userId || authStore.email,
    account_id: authStore.employeeId || authStore.userId || authStore.email,
    type: authStore.employeeId ? 'employee' : 'user',
    name: displayName.value,
    email: authStore.email,
  }]
})

const selectedAccount = computed(() => {
  const selectedId = authStore.selectedAccountId
  return accounts.value.find((account) => accountValue(account) === selectedId) || accounts.value[0]
})

const accountGroups = computed(() => ({
  primary: accounts.value.filter((account) => !account.is_shared && !account.is_external),
  shared: accounts.value.filter((account) => account.is_shared),
  external: accounts.value.filter((account) => account.is_external),
}))

const initials = (value?: string) => {
  const source = value || authStore.email || '?'
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'
}

const isImageUrl = (value?: string) => Boolean(value && (/^https?:\/\//i.test(value) || value.startsWith('/')))

const accountImage = (account?: Account) => account?.profile_photo_url || account?.picture_url

const accountIcon = (account: Account) => {
  if (account.is_external) return Globe
  if (account.is_shared) return Users
  return User
}

const accountSubtitle = (account: Account) => {
  if (account.is_external) {
    const provider = account.provider ? account.provider.charAt(0).toUpperCase() + account.provider.slice(1) : 'External'
    return `${provider} - ${account.name || account.email || ''}`.trim()
  }

  if (account.is_shared) return account.name ? `Shared inbox - ${account.name}` : 'Shared inbox'

  return account.name || account.type || 'Venmail account'
}

const venmailOrigin = () => {
  try {
    return new URL(authStore.getAuthUrl(`${window.location.origin}/oauth/callback`)).origin
  } catch {
    return 'http://localhost:8000'
  }
}

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

const switchAccount = (account: Account) => {
  if (account.is_shared || account.is_external || isSwitchingAccount.value) return

  const value = accountValue(account)
  authStore.setSelectedAccount(value)

  const redirectPath = router.currentRoute.value.fullPath || '/'
  localStorage.setItem('loginRedirect', redirectPath)

  const oauthUrl = new URL(authStore.getAuthUrl(`${window.location.origin}/oauth/callback`))
  oauthUrl.searchParams.set('account_id', value)
  oauthUrl.searchParams.set('redirect', redirectPath)

  isSwitchingAccount.value = true
  window.location.href = oauthUrl.toString()
}

const addAccount = () => {
  window.location.href = `${venmailOrigin()}/account-switcher`
}
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
          <div class="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors overflow-hidden">
            <img
              v-if="isImageUrl(accountImage(selectedAccount))"
              :src="accountImage(selectedAccount)"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ initials(selectedAccount?.name || authStore.firstName || authStore.email) }}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-80">
        <div class="p-2">
          <p class="font-semibold text-gray-900 dark:text-gray-100">{{ selectedAccount?.name || displayName }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ selectedAccount?.email || authStore.email }}</p>
        </div>

        <template
          v-for="group in [
            { key: 'primary', label: 'Primary accounts', accounts: accountGroups.primary },
            { key: 'shared', label: 'Shared inboxes', accounts: accountGroups.shared },
            { key: 'external', label: 'External accounts', accounts: accountGroups.external },
          ]"
          :key="group.key"
        >
          <template v-if="group.accounts.length">
            <DropdownMenuSeparator />
            <div class="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {{ group.label }}
            </div>
            <DropdownMenuItem
              v-for="account in group.accounts"
              :key="accountValue(account)"
              :disabled="account.is_shared || account.is_external || isSwitchingAccount"
              class="gap-3 py-2.5"
              :class="cn(
                !account.is_shared && !account.is_external && 'cursor-pointer',
                (account.is_shared || account.is_external) && 'opacity-75'
              )"
              @click="switchAccount(account)"
            >
              <div :class="cn(
                'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full',
                account.is_external ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' :
                  account.is_shared ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300' :
                  'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
              )">
                <img
                  v-if="isImageUrl(accountImage(account))"
                  :src="accountImage(account)"
                  alt=""
                  class="h-full w-full object-cover"
                />
                <component v-else :is="accountIcon(account)" class="h-4 w-4" />
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ account.email || account.name }}
                </p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ accountSubtitle(account) }}
                </p>
              </div>

              <Check
                v-if="accountValue(account) === authStore.selectedAccountId"
                class="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300"
              />
            </DropdownMenuItem>
          </template>
        </template>

        <DropdownMenuSeparator />
        <DropdownMenuItem @click="addAccount" class="gap-3 py-2.5 cursor-pointer">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <PlusCircle class="h-4 w-4" />
          </div>
          <div>
            <p class="text-sm font-medium">Add account</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Connect another Venmail account</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
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
