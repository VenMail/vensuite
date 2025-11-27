import { defineStore } from 'pinia'
import axios from 'axios'
import { Router } from 'vue-router'
import { useFileStore } from './files'

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
    // Tracks whether the authenticated user has at least one valid linked account/workspace.
    // When false, the user is logged in but cannot access resources requiring an account.
    hasLinkedAccounts: true,
    // Prevents multiple concurrent logout/redirect operations
    _isLoggingOut: false,
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
      if (!user) return;
      if (!this.isAuthenticated) return;
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
      this.hasLinkedAccounts = true; // Assume valid until proven otherwise
      this._isLoggingOut = false; // Reset logout flag on new login
      // Set default Authorization header for axios
      try { (axios.defaults.headers as any).common = (axios.defaults.headers as any).common || {}; (axios.defaults.headers as any).common.Authorization = `Bearer ${token}`; } catch {}
      this.setupAxiosInterceptor();
    },
    /**
     * Mark the session as having no linked accounts.
     * The user remains authenticated but cannot access account-specific resources.
     */
    setNoLinkedAccounts() {
      this.hasLinkedAccounts = false;
      console.warn('Auth: No linked accounts detected for this session.');
    },

    async logout() {
      // Prevent concurrent logout operations
      if (this._isLoggingOut) return;
      this._isLoggingOut = true;

      try {
        // Reset in-memory auth state
        this.token = null;
        this.isAuthenticated = false;
        this.hasLinkedAccounts = true; // Reset for next login
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
        try { document.cookie = 'venAuthToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; } catch {}
        try { document.cookie = 'vn_auth_sessid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; } catch {}

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
          const fileStore = useFileStore();
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
      } finally {
        this._isLoggingOut = false;
      }
    },
    getAuthUrl(redirectUri: string) {
      return `${AUTH_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    },
    async handleTokenExpiration() {
      const router = this.router;
      let redirectPath = '/';

      // Capture the route where the session actually expired, but avoid
      // redirect loops when already on auth routes.
      try {
        if (router && router.currentRoute) {
          const current = router.currentRoute;
          const name = current.name as string | undefined;
          if (name !== 'login' && name !== 'oauthCallback') {
            redirectPath = current.fullPath || '/';
          }
        }
      } catch {}

      // Clear authentication state and tokens, but intentionally preserve
      // offline file data so drafts can sync after re-login.
      try {
        this.token = null;
        this.isAuthenticated = false;
        this.firstName = "";
        this.lastName = "";
        this.email = "";
        this.userId = "";
        this.employeeId = "";

        try { localStorage.removeItem('venAuthToken'); } catch {}
        try { localStorage.removeItem('venUserFirstName'); } catch {}
        try { localStorage.removeItem('venUserLastName'); } catch {}
        try { localStorage.removeItem('venUserEmail'); } catch {}
        try { localStorage.removeItem('venUserId'); } catch {}
        try { localStorage.removeItem('venEmployeeId'); } catch {}
        try { document.cookie = 'venAuthToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; } catch {}
        try { document.cookie = 'vn_auth_sessid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; } catch {}

        try {
          if (this._axiosInterceptorIds.req != null) axios.interceptors.request.eject(this._axiosInterceptorIds.req)
          if (this._axiosInterceptorIds.res != null) axios.interceptors.response.eject(this._axiosInterceptorIds.res)
          this._axiosInterceptorIds = { req: null, res: null }
        } catch {}
        try { delete (axios.defaults.headers as any)?.common?.Authorization; } catch {}
      } catch (e) {
        console.warn('Token expiration cleanup encountered an issue:', e);
      }

      if (router) {
        await router.push({
          name: 'login',
          query: { redirect: redirectPath, reason: 'session-expired' },
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

      // Response: handle auth failures (401/403/419)
      const resId = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response) {
            const status = error.response.status
            const hadToken = !!this.getToken()

            // Check if this is a "no valid accounts" 403 (not a token issue)
            const responseData = error.response.data
            const isNoAccountsError = status === 403 && (
              (typeof responseData === 'string' && responseData.toLowerCase().includes('no valid accounts')) ||
              (responseData?.message && responseData.message.toLowerCase().includes('no valid accounts')) ||
              (responseData?.error && responseData.error.toLowerCase().includes('no valid accounts'))
            )

            if (isNoAccountsError && hadToken && this.isAuthenticated) {
              // User is authenticated but has no linked accounts.
              // Do NOT logout or redirect - just mark the state.
              this.setNoLinkedAccounts();
              // Let the caller handle this specific error (e.g., show "no workspace" UI)
            } else if (status === 401 || status === 419) {
              // Token is invalid or expired - full logout
              if (hadToken && this.isAuthenticated) {
                await this.handleTokenExpiration();
              }
            } else if (status === 403 && hadToken && this.isAuthenticated) {
              // Generic 403 (permission denied) - could be resource-specific.
              // Do NOT auto-logout; let the caller handle access-denied state.
              // Only logout if it looks like a session/token issue.
              const isTokenIssue = responseData?.message?.toLowerCase().includes('token') ||
                                   responseData?.message?.toLowerCase().includes('unauthorized') ||
                                   responseData?.message?.toLowerCase().includes('unauthenticated')
              if (isTokenIssue) {
                await this.handleTokenExpiration();
              }
            }
          }
          return Promise.reject(error);
        }
      )

      this._axiosInterceptorIds = { req: reqId, res: resId }
    }
  },
});
