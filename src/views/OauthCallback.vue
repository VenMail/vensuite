<script setup lang="ts">
import { useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();
const router = useRouter();
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const errorMessage = ref<string | null>(null);
const isLoading = ref(true);

// Function to get a cookie value by name
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

// Function to authenticate using a cookie
function authenticateWithCookie(authCookie: string) {
  fetch(`${API_BASE_URI}/login`, {
    headers: {
      Authorization: `Bearer ${authCookie}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("setting token", data);
        authStore.login(data.token);
        authStore.setUserInfo(data.user);
        router.push("/");
      } else {
        console.log("Auth failed with cookie:", data);
        errorMessage.value = data.message || "Authentication failed. Please try again.";
        console.log("Error value set to:", errorMessage.value);
        isLoading.value = false;
      }
    })
    .catch((error) => {
      console.error("Error during authentication with cookie:", error);
      errorMessage.value = "Failed to connect to authentication service. Please try again.";
      console.log("Error value set to:", errorMessage.value);
      isLoading.value = false;
    });
}

// Function to authenticate using an OAuth code
function authenticateWithCode(code: string) {
  fetch(`${API_BASE_URI}/login`, {
    method: "POST",
    headers: {
      "X-Auth-Init": code,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Auth suc", data);
        document.cookie = `venAuthToken=${data.token}; path=/`;
        authStore.login(data.token);
        authStore.setUserInfo(data.user);
        router.push("/");
      } else {
        console.log("Auth failed with code:", data);
        errorMessage.value = data.message || "Authentication failed. Please try again.";
        console.log("Error value set to:", errorMessage.value);
        isLoading.value = false;
      }
    })
    .catch((error) => {
      console.error("Error during authentication with code:", error);
      errorMessage.value = "Failed to connect to authentication service. Please try again.";
      isLoading.value = false;
    });
}

function returnToLogin() {
  router.push('/login');
}

// Process OAuth callback on mount
onMounted(() => {
  const code = new URLSearchParams(window.location.search).get("code");
  const authCookie = getCookie("vn_auth_sessid");

  if (authCookie) {
    authenticateWithCookie(authCookie);
  } else if (code) {
    authenticateWithCode(code);
  } else {
    errorMessage.value = "No authentication code or cookie found. Please try logging in again.";
    isLoading.value = false;
  }
});
</script>

<template>
  <div
    class="min-h-screen flex flex-col justify-between items-center bg-white text-black"
  >
    <!-- Logo header -->
    <div class="flex items-center justify-between w-full border-b border-[#A9C9D64D] p-6">
      <div class="max-w-[150px]">
        <img src="/logo-black.png" alt="VenMail Logo" class="h-6 w-full" />
      </div>
      <div class="max-w-[150px] flex justify-end">
        <!-- Consistent empty space for layout balance -->
      </div>
    </div>

    <!-- Main content -->
    <div class="relative w-full max-w-lg overflow-hidden p-8 text-center">
      <div class="mb-8">
        <h2 class="mb-4 text-[40px] text-black font-semibold leading-normal">
          {{ errorMessage ? $t('Views.OauthCallback.heading.oops_login_failed') : $t('Views.OauthCallback.heading.completing_authentication') }}
        </h2>
        <div class="flex flex-col items-center justify-center space-y-4">
          <template v-if="isLoading">
            <LoaderCircle class="h-8 w-8 animate-spin text-primary-600" />
            <p class="text-gray-600">Securely connecting to Venmail services...</p>
          </template>
          <template v-else>
            <p class="text-red-600 mb-4">We're sorry, an error has occured and we're unable to log you in. Please try again.</p>
            <Button 
              @click="returnToLogin"
              class="bg-primary-600 text-white px-6 py-2 rounded-sm hover:bg-primary-700"
            >
              {{$t('Views.OauthCallback.button.return_to_login')}}
            </Button>
          </template>
        </div>
      </div>
    </div>

    <!-- Consistent footer -->
    <div class="text-base text-center text-black my-6 space-x-2">
      <a
        href="https://venmail.io/resources/privacy-policy"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:underline"
        >{{$t('Views.OauthCallback.link.privacy_terms')}}</a
      >
      <span>•</span>
      <a
        href="https://venmail.io/resources/cookie-policy"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:underline"
        >{{$t('Commons.link.cookie_policy')}}</a
      >
      <span>•</span>
      <a
        href="https://venmail.io/resources/cookie_ccpa-policy"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:underline"
        >{{$t('Views.OauthCallback.link.cookie_ccpa_preferences')}}</a
      >
      <span>•</span>
      <a
        href="https://venmail.io/resources/ai-principles"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:underline"
        >{{$t('Commons.link.ai_principles')}}</a
      >
    </div>
  </div>
</template>
