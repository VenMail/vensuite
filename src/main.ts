import { createApp, defineComponent, h, VNode } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

// Load mammoth browser build as a script asset (works reliably with Umo Editor v8)
// Vite will emit a URL for the browser build; we inject it before initializing the editor
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite url import
import mammothUrl from 'mammoth/mammoth.browser.min.js?url'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { useAuthStore } from './store/auth'

// Routes
import Home from './views/Home.vue'
import RunSheet from './views/RunSheet.vue'
import MediaViewer from './views/MediaViewer.vue'
import Sheets from './views/Sheets.vue'
import Documents from './views/Documents.vue'
import Forms from './views/Forms.vue'
import FormBuilder from './views/FormBuilder.vue'
import Bin from './views/Bin.vue'
import OauthCallback from './views/OauthCallback.vue'
import AuthenticatedLayout from './layouts/AuthenticatedLayout.vue'
// Import utils as needed
import FilePicker from './views/FilePicker.vue'
import DocsEditor from './views/DocsEditor.vue'
import Login from './views/Login.vue'
import SlidesEditor from './views/SlidesEditor.vue'
import Media from './views/Media.vue'

const routes = [
  {
    path: '/f/:slug(.*)',
    name: 'form-player',
    component: () => import('./views/FormPlayerHost.vue'),
    meta: { public: true },
  },
  {
    path: '/f/by-id/:id',
    name: 'form-player-by-id',
    component: () => import('./views/FormPlayerHost.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
  },
  {
    path: '/oauth/callback',
    name: 'oauthCallback',
    component: OauthCallback,
  },
  {
    path: '/',
    component: AuthenticatedLayout,
    children: [
      { path: 'sheets', name: 'sheets-view', component: Sheets },
      { path: 'bin', name: 'bin-view', component: Bin },
      { path: 'docs/new', name: 'docs-new', component: DocsEditor, meta: { hideLayout: true } },
      { path: 'docs/:appFileId', name: 'docs-edit', component: DocsEditor, meta: { hideLayout: true, public: true } },
      { path: 'docs/t/:template', name: 'docs-template', component: DocsEditor, meta: { hideLayout: true } },
      { path: 'slides/new', name: 'slides-new', component: SlidesEditor, meta: { hideLayout: true } },
      { path: 'slides/:deckId', name: 'slides-edit', component: SlidesEditor, meta: { hideLayout: true } },
      { path: 'slides/t/:template', name: 'slides-template', component: SlidesEditor, meta: { hideLayout: true } },
      { path: 'docs', name: 'docs-view', component: Documents },
      { path: 'forms', name: 'forms', component: Forms },
      { path: 'forms/t/:template', name: 'form-template', component: () => import('./views/FormTemplateHandler.vue'), meta: { hideLayout: true } },
      {
        path: 'forms/:id/edit',
        name: 'form-edit',
        alias: ['forms/:id'],
        component: FormBuilder,
        meta: { hideLayout: true },
      },
      { path: 'forms/:id/settings', name: 'form-settings', component: FormBuilder, meta: { hideLayout: true } },
      { path: 'forms/:id/responses', name: 'form-responses', component: () => import('./views/FormResponses.vue'), meta: { hideLayout: true } },
      { path: 'picker', name: 'file-picker', component: FilePicker, meta: { hideLayout: true } },
      { path: 'import/:id', name: 'import', component: Home },
      { path: 'media', name: 'media', component: Media },
      { path: 'files/:id', name: 'file', component: MediaViewer, meta: { hideLayout: true, public: true } },
      { path: 'sheets/new', name: 'sheets', component: RunSheet, meta: { hideLayout: true } },
      { path: 'sheets/:id', name: 'sheet', component: RunSheet, meta: { hideLayout: true, public: true } },
      { path: 'sheets/t/:template', name: 'sheet-template', component: RunSheet, meta: { hideLayout: true } },
      { path: '', name: 'home', component: Home },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})
const i18n = createI18n({
  // something vue-i18n options here ...
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

const authStore = useAuthStore(pinia)
authStore.setRouter(router)
authStore.setupAxiosInterceptor()
authStore.hydrate()

// Router guard
router.beforeEach(async (to, _from, next) => {
  // Allow explicit public routes
  if (to.meta && (to.meta as any).public === true) {
    return next()
  }

  // Allow unauthenticated viewing of public/link docs/sheets by direct link
  const isPublicViewer = (
    (to.name === 'docs-edit' && typeof (to.params as any).appFileId === 'string' && (to.params as any).appFileId !== 'new') ||
    (to.name === 'sheet' && typeof to.params.id === 'string' && to.params.id !== 'new') ||
    (to.name === 'file' && typeof to.params.id === 'string')
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
})

// Ensure mammoth is loaded globally before initializing the editor plugin
function ensureMammoth(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).mammoth) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = mammothUrl as string
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
}

// Bootstrap app without top-level await
async function bootstrap() {
  try {
    // Wait for mammoth to be available before installing the editor plugin
    await ensureMammoth()
  } catch (e) {
    console.error('Failed to initialize editor dependencies:', e)
  }

  // Custom component for style tags
  app.component('v-style', defineComponent({
    render: function(): VNode { // Specify the return type as VNode
      return h('style', {}, this.$slots.default ? this.$slots.default() : []); // Check if $slots.default exists
    },
  }))

  app.mount('#app')
}

void bootstrap();

export { router }