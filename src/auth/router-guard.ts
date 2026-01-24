// Authentication router guard - separated for optimal loading
import { useAuthStore } from './index'

export function createAuthGuard(authStore: ReturnType<typeof useAuthStore>) {
  return async (to: any, _from: any, next: any) => {
    // Allow explicit public routes
    if (to.meta && (to.meta as any).public === true) {
      return next()
    }

    const allowGuest = Boolean(to.meta && (to.meta as any).allowGuest === true)
    const actionParam = typeof to.query?.action === 'string' ? to.query.action.toLowerCase() : null
    if (!authStore.isAuthenticated && to.name === 'home' && actionParam === 'login') {
      return next({
        name: 'login',
        query: {
          ...to.query,
          action: 'login',
          redirect: typeof to.query?.redirect === 'string' ? to.query.redirect : '/',
        },
      })
    }

    // Allow unauthenticated viewing of public/link docs/sheets by direct link
    const isPublicViewer = (
      (to.name === 'docs-edit' && typeof (to.params as any).appFileId === 'string' && (to.params as any).appFileId !== 'new') ||
      (to.name === 'sheet' && typeof to.params.id === 'string' && to.params.id !== 'new') ||
      (to.name === 'file' && typeof (to.params as any).id === 'string')
    )

    if (isPublicViewer) {
      return next()
    }

    if (!authStore.isAuthenticated && allowGuest) {
      return next()
    }

    // Always allow login and oauth callback routes
    if (to.name === 'login' || to.name === 'oauthCallback') {
      return next()
    }

    // For all other routes, require authentication if not already authenticated
    if (!authStore.isAuthenticated) {
      return next({ name: 'login', query: { redirect: to.fullPath } })
    }

    next()
  }
}
