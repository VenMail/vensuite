<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { LoaderCircle } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processing = ref(false)
const error = ref<string | null>(null)

const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI
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
    <!-- Logo header -->
    <div class="flex items-center justify-between w-full border-b border-[#A9C9D64D] p-6">
      <div class="max-w-[150px]">
        <img src="/logo-black.png" alt="VenMail Logo" class="h-6 w-full" />
      </div>
      <div class="max-w-[150px] flex justify-end">
        <!-- Globe icon could go here if needed -->
      </div>
    </div>
    
    <!-- Main content -->
    <div class="relative w-full max-w-lg overflow-hidden p-8">
      <div class="mb-8 text-center">
        <h2 class="mb-4 text-4xl text-black font-semibold leading-normal">
          Welcome to Venmail Files
        </h2>
        <p class="text-black mb-6">
          Login to manage your files and folders on Venmail
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
        {{ processing ? 'Logging in...' : 'Login with Venmail' }}
      </Button>
    </div>

    <!-- Footer -->
    <div class="text-base text-center text-black my-6 space-x-2">
      <a href="https://venmail.io/resources/privacy-policy" target="_blank" rel="noopener noreferrer" class="hover:underline">Privacy & terms</a>
      <span>•</span>
      <a href="https://venmail.io/resources/cookie-policy" target="_blank" rel="noopener noreferrer" class="hover:underline">Cookie policy</a>
      <span>•</span>
      <a href="https://venmail.io/resources/cookie_ccpa-policy" target="_blank" rel="noopener noreferrer" class="hover:underline">Cookie & CCPA preferences</a>
      <span>•</span>
      <a href="https://venmail.io/resources/ai-principles" target="_blank" rel="noopener noreferrer" class="hover:underline">AI Principles</a>
    </div>
  </div>
</template>