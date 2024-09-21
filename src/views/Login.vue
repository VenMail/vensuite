<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth' // Import the store
import { Button } from '@/components/ui/button'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore() // Use the store

// authStore.setRouter(router)

const redirectUri = `${window.location.origin}/oauth/callback`
const authUrl = ref(authStore.getAuthUrl(redirectUri)) // Use the store's getAuthUrl method

function loginWithVenmail() {
  const currentPath = route.query.redirect as string || '/'
  localStorage.setItem('loginRedirect', currentPath)
  window.location.href = authUrl.value
}

onMounted(async () => {
  const token = authStore.getToken() || route.query.token as string
  console.log("Tok", token)
  if (token) {
    await authStore.login(token) // Use the store's login method
    const redirect = localStorage.getItem('loginRedirect') || '/'
    localStorage.removeItem('loginRedirect')
    await router.push(redirect)
  }
})
</script>

<template>
  <div class="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
    <div class="bg-white bg-opacity-50 backdrop-blur-lg p-8 rounded-lg shadow-xl">
      <img src="/logo.png" class="h-12 w-12 mx-auto" />
      <h2 class="text-2xl font-bold mb-4 text-center">Welcome to Venmail File Manager</h2>
      <Button class="w-full" @click="loginWithVenmail">
        Login with Venmail
      </Button>
      <p class="text-sm text-muted-foreground mt-4 text-center">
        Login to manage your files and folders on Venmail.
      </p>
    </div>
  </div>
</template>
