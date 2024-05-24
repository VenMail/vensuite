<template>
  <div>
    <p>Finishing authentication...</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

const router = useRouter();
const authBase = "http://localhost:8000/";

// Function to get a cookie value by name
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

// Function to authenticate using a cookie
function authenticateWithCookie(authCookie: string) {
  fetch(authBase + 'api/v1/login', {
    headers: {
      'Authorization': 'Bearer ' + authCookie,
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('venAuthToken', data.token);
        router.push('/');
      } else {
        console.error('Authentication failed:', data.message);
      }
    })
    .catch(error => {
      console.error('Error during authentication with cookie:', error);
    });
}

// Function to authenticate using an OAuth code
function authenticateWithCode(code: string) {
  fetch(authBase + 'api/v1/login', {
    method: "POST",
    headers: {
      'X-Auth-Init': code,
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        //todo: also store expiry time of tokens
        document.cookie = `venAuthToken=${data.token}; path=/`;
        localStorage.setItem('venAuthToken', data.token);
        router.push('/');
      } else {
        console.error('Authentication failed:', data.message);
      }
    })
    .catch(error => {
      console.error('Error during authentication with code:', error);
    });
}

// Process OAuth callback on mount
onMounted(() => {
  const code = new URLSearchParams(window.location.search).get('code');
  const authCookie = getCookie('vn_auth_sessid');

  if (authCookie) {
    authenticateWithCookie(authCookie);
  } else if (code) {
    authenticateWithCode(code);
  } else {
    console.error('No code or cookie found in callback');
  }
});
</script>
