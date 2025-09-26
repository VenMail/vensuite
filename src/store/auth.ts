import { defineStore } from 'pinia'
import axios from 'axios'
import { Router } from 'vue-router'

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/auth/oauth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    firstName: localStorage.getItem('venUserFirstName') || "",
    lastName: localStorage.getItem('venUserLastName') || "",
    email: localStorage.getItem('venUserEmail') || "",
    userId: localStorage.getItem('venUserId') || "",
    employeeId: localStorage.getItem('venEmployeeId') || "",
    isAuthenticated: !!localStorage.getItem('venAuthToken'),
    token: localStorage.getItem('venAuthToken') || null,
    router: null as Router | any, // Add router to state
    // Track axios interceptors to avoid duplicates
    _axiosInterceptorIds: { req: null as number | null, res: null as number | null },
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
        // If no token, simply return null. Do not force redirect here.
        // Redirects should be handled by route guards or 401 interceptors.
      }
      return this.token
    },
    async setUserInfo(user: any) {
      this.firstName = user.first_name || "";
      this.lastName = user.last_name || "";
      this.email = user.email || "";
      this.userId = (user.id ?? user.user_id ?? user.uuid ?? "") + "";
      this.employeeId = (user.employee_id ?? user.employeeId ?? "") + "";
      localStorage.setItem('venUserFirstName', this.firstName);
      localStorage.setItem('venUserLastName', this.lastName);
      localStorage.setItem('venUserEmail', this.email);
      if (this.userId) localStorage.setItem('venUserId', this.userId);
      if (this.employeeId) localStorage.setItem('venEmployeeId', this.employeeId);
    },
    hydrate() {
      this.token = localStorage.getItem('venAuthToken');
      this.isAuthenticated = !!this.token;
      this.firstName = localStorage.getItem('venUserFirstName') || this.firstName;
      this.lastName = localStorage.getItem('venUserLastName') || this.lastName;
      this.email = localStorage.getItem('venUserEmail') || this.email;
      this.userId = localStorage.getItem('venUserId') || this.userId;
      this.employeeId = localStorage.getItem('venEmployeeId') || this.employeeId;
    },
    async getUserInfo() {
      return {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email
      }
    },
    async login(token: string) {
      this.token = token;
      localStorage.setItem('venAuthToken', token);
      this.isAuthenticated = true;
      // Set default Authorization header for axios
      try { (axios.defaults.headers as any).common = (axios.defaults.headers as any).common || {}; (axios.defaults.headers as any).common.Authorization = `Bearer ${token}`; } catch {}
      this.setupAxiosInterceptor();
    },
    async logout() {
      try {
        // Reset in-memory auth state
        this.token = null;
        this.isAuthenticated = false;
        this.firstName = "";
        this.lastName = "";
        this.email = "";
        this.userId = "";
        this.employeeId = "";

        // Remove persisted auth and user identifiers
        try { localStorage.removeItem('venAuthToken'); } catch {}
        try { localStorage.removeItem('venUserFirstName'); } catch {}
        try { localStorage.removeItem('venUserLastName'); } catch {}
        try { localStorage.removeItem('venUserEmail'); } catch {}
        try { localStorage.removeItem('venUserId'); } catch {}
        try { localStorage.removeItem('venEmployeeId'); } catch {}

        // Eject axios interceptors and clear default Authorization header
        try {
          if (this._axiosInterceptorIds.req != null) axios.interceptors.request.eject(this._axiosInterceptorIds.req)
          if (this._axiosInterceptorIds.res != null) axios.interceptors.response.eject(this._axiosInterceptorIds.res)
          this._axiosInterceptorIds = { req: null, res: null }
        } catch {}
        try { delete (axios.defaults.headers as any)?.common?.Authorization; } catch {}

        // Clear app caches (files, recent, offline).
        // Use dynamic import to avoid potential circular dependency at module top-level
        try {
          const mod = await import('./files');
          const fileStore = mod.useFileStore();
          fileStore.clearAll();
        } catch (e) {
          console.warn('Failed to clear files store on logout:', e);
        }

        // Navigate to login
        if (this.router) {
          await this.router.push({ name: 'login' });
        }
      } catch (e) {
        console.warn('Logout encountered an issue:', e);
        if (this.router) {
          await this.router.push({ name: 'login' });
        }
      }
    },
    getAuthUrl(redirectUri: string) {
      return `${AUTH_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    },
    async handleTokenExpiration() {
      await this.logout();
      if (this.router) {
        console.log("current", this.router.currentRoute)
        const currentPath = this.router.currentRoute.fullPath;
        await this.router.push({
          name: 'login',
          query: { redirect: currentPath },
        });
      }
    },
    setupAxiosInterceptor() {
      // Eject old interceptors first to avoid stacking
      try {
        if (this._axiosInterceptorIds.req != null) axios.interceptors.request.eject(this._axiosInterceptorIds.req)
        if (this._axiosInterceptorIds.res != null) axios.interceptors.response.eject(this._axiosInterceptorIds.res)
      } catch {}

      // Request: attach Authorization if available
      const reqId = axios.interceptors.request.use((config) => {
        try {
          const tok = this.getToken()
          if (tok) {
            config.headers = config.headers || {}
            if (!('Authorization' in config.headers)) {
              (config.headers as any).Authorization = `Bearer ${tok}`
            }
          }
        } catch {}
        return config
      })

      // Response: handle 401/403
      const resId = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response) {
            const status = error.response.status
            if (status === 401 || status === 403) {
              await this.handleTokenExpiration();
            }
          }
          return Promise.reject(error);
        }
      )

      this._axiosInterceptorIds = { req: reqId, res: resId }
    }
  },
});
