import { defineStore } from 'pinia'
import axios from 'axios'
import { Router } from 'vue-router'
import { FileData } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8001/auth/oauth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    token: localStorage.getItem('venAuthToken') || null,
    files: [] as FileData[],
    router: null as Router | any, // Add router to state
  }),
  actions: {
    setRouter(router: any) {
      this.router = router;
    },
    async login(token: string) {
      this.token = token;
      localStorage.setItem('venAuthToken', token);
      this.isAuthenticated = true;
      await this.fetchFiles();
      this.setupAxiosInterceptor();
    },
    async logout() {
      this.token = null;
      localStorage.removeItem('venAuthToken');
      this.isAuthenticated = false;
      this.files = [];
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
    },
    async fetchFiles() {
      if (!this.token) {
        this.isAuthenticated = false;
        return false;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/app-files`, {
          headers: { 'Authorization': `Bearer ${this.token}` },
        });
        this.files = response.data;
        this.isAuthenticated = true;
        return true;
      } catch (error) {
        this.isAuthenticated = false;
        console.error('Error fetching files:', error);
        return false;
      }
    },
  },
});
