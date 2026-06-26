import { defineStore } from 'pinia'
import axios from 'axios'
import { Router } from 'vue-router'
import { useFileStore } from './files'

export const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/auth/oauth'
const ACCOUNTS_STORAGE_KEY = 'venAuthenticatedAccounts'
const SELECTED_ACCOUNT_STORAGE_KEY = 'venSelectedAccountId'

export interface VenmailAccount {
  id: string | number
  account_id?: string | number
  type?: string
  name?: string
  email?: string
  organization_id?: string | number
  is_shared?: boolean
  is_external?: boolean
  external_account_id?: string | number
  provider?: string
  unread_count?: number
  last_synced_at?: string
  picture_url?: string
  profile_photo_url?: string
  can_manage?: boolean
}

function normalizeAccounts(raw: unknown): VenmailAccount[] {
  const values = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw as Record<string, unknown>)
      : []

  return values
    .filter((account): account is Record<string, unknown> => Boolean(account) && typeof account === 'object')
    .map((account) => {
      const id = account.id ?? account.account_id
      return {
        ...(account as unknown as VenmailAccount),
        id: (id ?? '') as string | number,
        account_id: (account.account_id ?? id ?? '') as string | number,
      }
    })
    .filter((account) => String(account.id || account.account_id || '').length > 0)
}

function loadAccounts(): VenmailAccount[] {
  try {
    return normalizeAccounts(JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    firstName: localStorage.getItem('venUserFirstName') || "",
    lastName: localStorage.getItem('venUserLastName') || "",
    email: localStorage.getItem('venUserEmail') || "",
    userId: localStorage.getItem('venUserId') || "",
    employeeId: localStorage.getItem('venEmployeeId') || "",
    isAuthenticated: !!localStorage.getItem('venAuthToken'),
    token: localStorage.getItem('venAuthToken') || null,
    authenticatedAccounts: loadAccounts(),
    selectedAccountId: localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY) || "",
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
    setAuthenticatedAccounts(accounts: unknown) {
      const normalized = normalizeAccounts(accounts)
      this.authenticatedAccounts = normalized
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(normalized))
      } catch {}

      const selectedExists = normalized.some((account) => String(account.account_id ?? account.id) === this.selectedAccountId)
      if (!this.selectedAccountId || !selectedExists) {
        const currentAccount = normalized.find((account) =>
          (this.email && account.email?.toLowerCase() === this.email.toLowerCase()) ||
          (this.employeeId && String(account.id) === this.employeeId) ||
          (this.userId && String(account.id) === this.userId)
        )
        this.setSelectedAccount(currentAccount?.account_id ?? currentAccount?.id ?? normalized[0]?.account_id ?? normalized[0]?.id ?? "")
      }
    },
    setSelectedAccount(accountId: string | number | null | undefined) {
      this.selectedAccountId = accountId == null ? "" : String(accountId)
      try {
        if (this.selectedAccountId) {
          localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, this.selectedAccountId)
        } else {
          localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY)
        }
      } catch {}
    },
    hydrate() {
      this.token = localStorage.getItem('venAuthToken');
      this.isAuthenticated = !!this.token;
      this.firstName = localStorage.getItem('venUserFirstName') || this.firstName;
      this.lastName = localStorage.getItem('venUserLastName') || this.lastName;
      this.email = localStorage.getItem('venUserEmail') || this.email;
      this.userId = localStorage.getItem('venUserId') || this.userId;
      this.employeeId = localStorage.getItem('venEmployeeId') || this.employeeId;
      this.authenticatedAccounts = loadAccounts();
      this.selectedAccountId = localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY) || this.selectedAccountId;
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
        // Clear any service worker caches that might hold authenticated responses
        // or stale app shells before wiping auth state.
        try {
          const keys = await caches.keys()
          await Promise.all(keys.map(key => caches.delete(key)))
        } catch { }

        // Reset in-memory auth state
        this.token = null;
        this.isAuthenticated = false;
        this.hasLinkedAccounts = true; // Reset for next login
        this.firstName = "";
        this.lastName = "";
        this.email = "";
        this.userId = "";
        this.employeeId = "";
        this.authenticatedAccounts = [];
        this.selectedAccountId = "";

        // Remove persisted auth and user identifiers
        try { localStorage.removeItem('venAuthToken'); } catch {}
        try { localStorage.removeItem('venUserFirstName'); } catch {}
        try { localStorage.removeItem('venUserLastName'); } catch {}
        try { localStorage.removeItem('venUserEmail'); } catch {}
        try { localStorage.removeItem('venUserId'); } catch {}
        try { localStorage.removeItem('venEmployeeId'); } catch {}
        try { localStorage.removeItem(ACCOUNTS_STORAGE_KEY); } catch {}
        try { localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY); } catch {}
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
        // Wipe service worker caches to avoid any cross-session leakage.
        try {
          const keys = await caches.keys()
          await Promise.all(keys.map(key => caches.delete(key)))
        } catch { }

        this.token = null;
        this.isAuthenticated = false;
        this.hasLinkedAccounts = true; // Reset for next login
        this.firstName = "";
        this.lastName = "";
        this.email = "";
        this.userId = "";
        this.employeeId = "";
        this.authenticatedAccounts = [];
        this.selectedAccountId = "";

        try { localStorage.removeItem('venAuthToken'); } catch {}
        try { localStorage.removeItem('venUserFirstName'); } catch {}
        try { localStorage.removeItem('venUserLastName'); } catch {}
        try { localStorage.removeItem('venUserEmail'); } catch {}
        try { localStorage.removeItem('venUserId'); } catch {}
        try { localStorage.removeItem('venEmployeeId'); } catch {}
        try { localStorage.removeItem(ACCOUNTS_STORAGE_KEY); } catch {}
        try { localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY); } catch {}
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
