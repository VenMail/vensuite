// Authentication router guard - separated for optimal loading
import { useAuthStore } from './index'

export function createAuthGuard(authStore: ReturnType<typeof useAuthStore>) {
  return async (to: any, _from: any, next: any) => {
    // Allow explicit public routes
    if (to.meta && (to.meta as any).public === true) {
      return next()
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
