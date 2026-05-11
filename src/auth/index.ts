// Authentication module - separated for optimal loading
// This module contains only authentication-related code for faster startup

import { defineStore } from 'pinia'
import axios from 'axios'
import { Router } from 'vue-router'

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/auth/oauth'
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

// Export auth store separately
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
    hasLinkedAccounts: true,
    _isLoggingOut: false,
    router: null as Router | any,
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
      this.hasLinkedAccounts = true;
      this._isLoggingOut = false;
      try { (axios.defaults.headers as any).common = (axios.defaults.headers as any).common || {}; (axios.defaults.headers as any).common.Authorization = `Bearer ${token}`; } catch {}
      this.setupAxiosInterceptor();
    },
    setNoLinkedAccounts() {
      this.hasLinkedAccounts = false;
      console.warn('Auth: No linked accounts detected for this session.');
    },
    async logout() {
      if (this._isLoggingOut) return;
      this._isLoggingOut = true;

      try {
        this.token = null;
        this.isAuthenticated = false;
        this.hasLinkedAccounts = true;
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

      try {
        if (router && router.currentRoute) {
          const current = router.currentRoute;
          const name = current.name as string | undefined;
          if (name !== 'login' && name !== 'oauthCallback') {
            redirectPath = current.fullPath || '/';
          }
        }
      } catch {}

      try {
        this.token = null;
        this.isAuthenticated = false;
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
      try {
        if (this._axiosInterceptorIds.req != null) axios.interceptors.request.eject(this._axiosInterceptorIds.req)
        if (this._axiosInterceptorIds.res != null) axios.interceptors.response.eject(this._axiosInterceptorIds.res)
      } catch {}

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

      const resId = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response) {
            const status = error.response.status
            const hadToken = !!this.getToken()

            const responseData = error.response.data
            const isNoAccountsError = status === 403 && (
              (typeof responseData === 'string' && responseData.toLowerCase().includes('no valid accounts')) ||
              (responseData?.message && responseData.message.toLowerCase().includes('no valid accounts')) ||
              (responseData?.error && responseData.error.toLowerCase().includes('no valid accounts'))
            )

            if (isNoAccountsError && hadToken && this.isAuthenticated) {
              this.setNoLinkedAccounts();
            } else if (status === 401 || status === 419) {
              if (hadToken && this.isAuthenticated) {
                await this.handleTokenExpiration();
              }
            } else if (status === 403 && hadToken && this.isAuthenticated) {
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

// Export authentication utilities
export { AUTH_URL }
