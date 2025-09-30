import { createApp, defineComponent, h, VNode } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

//@ts-ignore
import { useUmoEditor } from '@umoteam/editor'
// Load mammoth browser build as a script asset (works reliably with Umo Editor v8)
// Vite will emit a URL for the browser build; we inject it before initializing the editor
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite url import
import mammothUrl from 'mammoth/mammoth.browser.min.js?url'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import { useAuthStore } from './store/auth'
import { useFileStore } from './store/files'

// Routes
import Home from './views/Home.vue'
import RunSheet from './views/RunSheet.vue'
import RunDoc from './views/RunDoc.vue'
import MediaViewer from './views/MediaViewer.vue'
import Sheets from './views/Sheets.vue'
import Documents from './views/Documents.vue'
import Bin from './views/Bin.vue'
import Login from './views/Login.vue'
import OauthCallback from './views/OauthCallback.vue'
import AuthenticatedLayout from './layouts/AuthenticatedLayout.vue'
// Import utils as needed
import Editor from './components/forms/Editor.vue'
import Forms from './views/Forms.vue'
import { FileData } from './types'

const routes = [
  { 
    path: '/login', 
    name: 'login', 
    component: Login 
  },
  { 
    path: '/oauth/callback', 
    name: 'oauthCallback', 
    component: OauthCallback 
  },
  {
    path: '/',
    component: AuthenticatedLayout,
    children: [
      { path: 'sheets', name: 'sheets-view', component: Sheets },
      { path: 'bin', name: 'bin-view', component: Bin },
      { path: 'sheets/new', name: 'sheets', component: RunSheet, meta: { hideLayout: true } },
      { path: 'sheets/:id', name: 'sheet', component: RunSheet, meta: { hideLayout: true } },
      { path: 'sheets/t/:template', name: 'sheet-template', component: RunSheet, meta: { hideLayout: true } },
      { path: 'docs', name: 'docs-view', component: Documents },
      { path: 'docs/new', name: 'docs', component: RunDoc, meta: { hideLayout: true } },
      { path: 'docs/t/:template', name: 'doc-template', component: RunDoc, meta: { hideLayout: true } },
      { path: 'docs/:id', name: 'doc', component: RunDoc, meta: { hideLayout: true } },
      { path: 'files/:id', name: 'file', component: MediaViewer, meta: { hideLayout: true } },
      { path: 'forms', name: 'forms', component: Forms },
      { path: 'forms/:id', name: 'form', component: Editor },
      { path: 'media', name: 'media', component: () => import('./views/Media.vue') },
      { path: 'import/:id', name: 'import', component: Home },
      { path: '', name: 'home', component: Home },
    ]
  }
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

const documentStore = useFileStore(pinia)

// Router guard
router.beforeEach(async (to, _from, next) => {
  // Allow unauthenticated viewing of public docs/sheets by direct link
  const isPublicViewer = (
    (to.name === 'doc' && typeof to.params.id === 'string' && to.params.id !== 'new') ||
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

// Suppress Umo Editor banner logs globally during initialization
const __originalConsoleInfo = console.info;
console.info = (...args: any[]) => {
  const msg = args.join(' ');
  if (msg.includes('Thanks for using Umo Editor') || msg.includes('Current version:') || msg.includes('More info:')) {
    return;
  }
  __originalConsoleInfo.apply(console, args);
};

// UmoEditor setup
// Define hooks separately to ensure proper function identity
function onFileDelete(fileInfo: any): void {
  try {
    let id: string | undefined = fileInfo?.id;
    const url: string | undefined = fileInfo?.url || fileInfo?.src;
    if (!id && typeof url === 'string') {
      const match = url.match(/\/app-files\/([\w-]+)/);
      if (match && match[1]) id = match[1];
    }
    if (id) {
      // fire and forget to avoid returning a promise
      documentStore.moveToTrash(id).catch((e: any) => console.warn('onFileDelete delete failed:', e));
    }
  } catch (e) {
    console.warn('onFileDelete failed:', e);
  }
}

// Bootstrap app without top-level await
async function bootstrap() {
  try {
    // Wait for mammoth to be available before installing the editor plugin
    await ensureMammoth()

    app.use(useUmoEditor, {
      onSave: async (content: { html: string }, _page: any, doc: any) => {
        const routeId = router.currentRoute.value.params.id as string;
        let currentDoc = routeId && routeId !== "undefined" ? await documentStore.loadDocument(routeId) : null;
        console.log('currentDoc:', currentDoc);
        console.log('current content length:', content.html.length);

        const updatedDoc: FileData = currentDoc
          ? { ...currentDoc, title: doc?.title || currentDoc.title, content: content.html, last_viewed: new Date() }
          : { 
              id: undefined, 
              title: doc?.title || "New Document", 
              content: content.html, 
              file_type: "docx", 
              last_viewed: new Date(), 
              isNew: true,
              url: false, // Add required url property as boolean
              thumbnail_url: undefined // Add required thumbnail_url property
            };

        console.log('updatedDoc:', updatedDoc);
        const saved = await documentStore.saveDocument(updatedDoc);
        console.log('saved:', saved);
        if (saved.document.id !== routeId) {
          console.log('redirecting to:', `/docs/${saved.document.id}`);
          router.replace(`/docs/${saved.document.id}`);
        }
        return { success: !!saved, offline: !navigator.onLine, error: documentStore.lastError };
      },
      // v8+: ensure server-side deletion of assets when editor removes/replaces them
      onFileDelete,
    });
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

  // Restore console.info after initialization (2s buffer)
  setTimeout(() => {
    console.info = __originalConsoleInfo;
  }, 2000);
}

void bootstrap();

export { router }