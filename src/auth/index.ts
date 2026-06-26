// Authentication module - re-exports from the canonical store to avoid duplicate Pinia definitions.
// Previously this file defined its own defineStore('auth', ...) which competed with src/store/auth.ts.
// All imports should use @/store/auth directly; this file remains for backward-compatible imports.

export { useAuthStore } from '@/store/auth'
export type { VenmailAccount } from '@/store/auth'
export { AUTH_URL } from '@/store/auth'
