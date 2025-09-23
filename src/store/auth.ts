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
      this.setupAxiosInterceptor();
    },
    async logout() {
      this.token = null;
      localStorage.removeItem('venAuthToken');
      this.isAuthenticated = false;
      this.firstName = "";
      this.lastName = "";
      this.email = "";
      localStorage.removeItem('venUserFirstName');
      localStorage.removeItem('venUserLastName');
      localStorage.removeItem('venUserEmail');
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
        console.log("current", this.router.currentRoute)
        const currentPath = this.router.currentRoute.fullPath;
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
          if (error.response) {
            const status = error.response.status
            if (status === 401 || status === 403) {
              // Treat 403 (forbidden) similarly to 401, as MarketAuth may fail when user not found after fallback
              await this.handleTokenExpiration();
            }
          }
          return Promise.reject(error);
        }
      );
    }
  },
});
