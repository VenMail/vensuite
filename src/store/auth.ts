import { defineStore } from 'pinia'
import axios from 'axios'
import { Router } from 'vue-router'

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8001/auth/oauth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    token: localStorage.getItem('venAuthToken') || null,
    router: null as Router | any, // Add router to state
  }),
  actions: {
    setRouter(router: any) {
      this.router = router;
    },
    getRouter() {
      return this.router;
    },
    getToken(): string | null {
      if (!this.token) {
        this.token = localStorage.getItem("venAuthToken")
      }
      return this.token
    },
    async login(token: string) {
      this.token = token;
      localStorage.setItem('venAuthToken', token);
      this.isAuthenticated = true;
      this.setupAxiosInterceptor();
    },
    async logout() {
      this.token = null;
      localStorage.removeItem('venAuthToken');
      this.isAuthenticated = false;
      if (this.router) {
        await this.router.push({ name: 'login' });
      }
    },
    getAuthUrl(redirectUri: string) {
      return `${AUTH_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    },
    async handleTokenExpiration() {
      await this.logout();
      if (this.router) {
        const currentPath = this.router.currentRoute.value.fullPath;
        await this.router.push({
          name: 'login',
          query: { redirect: currentPath },
        });
      }
    },
    setupAxiosInterceptor() {
      axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response && error.response.status === 401) {
            await this.handleTokenExpiration();
          }
          return Promise.reject(error);
        }
      );
    }
  },
});
