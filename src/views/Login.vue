<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from '@/composables/useTranslation'
import { Button } from '@/components/ui/button'
import { LoaderCircle } from 'lucide-vue-next'
import { toast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processing = ref(false)
const error = ref<string | null>(null)

const { locale, setLocale } = useTranslation()

const redirectUri = `${window.location.origin}/oauth/callback`
const authUrl = ref(authStore.getAuthUrl(redirectUri))

function loginWithVenmail() {
  processing.value = true
  error.value = null
  const currentPath = route.query.redirect as string || '/'
  // Don't redirect back to login page
  const redirectPath = currentPath === '/login' ? '/' : currentPath
  localStorage.setItem('loginRedirect', redirectPath)
  window.location.href = authUrl.value
}

onMounted(async () => {
  // Show a minimal toast if we arrived here because the session expired
  const reason = route.query.reason as string | undefined
  if (reason === 'session-expired') {
    toast.info('Session expired. Please sign in again to continue.')
  }

  try {
    const token = authStore.getToken() || route.query.token as string
    if (!token) return

    await authStore.login(token)
    const redirect = route.query.redirect as string || localStorage.getItem('loginRedirect') || '/'
    localStorage.removeItem('loginRedirect')
    await router.push(redirect)
  } catch (err) {
    error.value = 'Failed to authenticate. Please try again.'
    console.error('Login error:', err)
  } finally {
    processing.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-between items-center bg-white text-black">
     
    <div class="flex items-center justify-between w-full border-b border-[#A9C9D64D] p-6">
      <div class="w-[150px]">
        <img src="/logo-black.png" alt="VenMail Logo" class="h-6 object-contain" />
      </div>
      <div class="w-[150px] flex justify-end">
        <div class="inline-flex items-center rounded-full border border-gray-200 text-xs overflow-hidden">
          <button
            class="px-2 py-1 transition-colors"
            :class="locale === 'en'
              ? 'bg-gray-900 text-white'
              : 'bg-transparent text-gray-600'"
            @click="setLocale('en')"
          >
            EN
          </button>
          <button
            class="px-2 py-1 transition-colors"
            :class="locale === 'fr'
              ? 'bg-gray-900 text-white'
              : 'bg-transparent text-gray-600'"
            @click="setLocale('fr')"
          >
            FR
          </button>
          <button
            class="px-2 py-1 transition-colors"
            :class="locale === 'zh'
              ? 'bg-gray-900 text-white'
              : 'bg-transparent text-gray-600'"
            @click="setLocale('zh')"
          >
            中
          </button>
        </div>
      </div>
    </div>
    
     
    <div class="relative w-full max-w-lg overflow-hidden p-8">
      <div class="mb-8 text-center">
        <h2 class="mb-4 text-4xl text-black font-semibold leading-normal">
          {{$t('Views.Login.heading.welcome_to_venmail_files')}}
        </h2>
        <p class="text-black mb-6">
          {{$t('Views.Login.text.login_to_manage_your')}}
        </p>
      </div>

      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-600 rounded-sm text-sm">
        {{ error }}
      </div>

      <Button 
        class="w-full bg-primary-600 py-4 rounded-sm text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        @click="loginWithVenmail"
        :disabled="processing"
        size="lg"
      >
        <LoaderCircle v-if="processing" class="h-5 w-5 animate-spin mr-2" />
        {{ processing ? 'Logging in...' : $t('Views.Login.button.login_with_venmail') }}
      </Button>
    </div>

     
    <div class="text-base text-center text-black my-6 space-x-2">
      <a href="https://venmail.io/resources/privacy-policy" target="_blank" rel="noopener noreferrer" class="hover:underline">{{$t('Views.Login.link.privacy_terms')}}</a>
      <span>•</span>
      <a href="https://venmail.io/resources/cookie-policy" target="_blank" rel="noopener noreferrer" class="hover:underline">{{$t('Commons.link.cookie_policy')}}</a>
      <span>•</span>
      <a href="https://venmail.io/resources/cookie_ccpa-policy" target="_blank" rel="noopener noreferrer" class="hover:underline">{{$t('Views.Login.link.cookie_ccpa_preferences')}}</a>
      <span>•</span>
      <a href="https://venmail.io/resources/ai-principles" target="_blank" rel="noopener noreferrer" class="hover:underline">{{$t('Commons.link.ai_principles')}}</a>
    </div>
  </div>
</template>