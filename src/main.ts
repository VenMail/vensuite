import { createApp, defineComponent, h, VNode } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
//@ts-ignore
import { useUmoEditor } from '@umoteam/editor'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import { useAuthStore } from './store/auth'
import { useFileStore } from './store/files'

// Routes
import Home from './views/Home.vue'
import RunSheet from './views/RunSheet.vue'
import RunDoc from './views/RunDoc.vue'
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
      { path: 'sheets', name: 'sheets', component: RunSheet, meta: { hideLayout: true } },
      { path: 'sheets/:id', name: 'sheet', component: RunSheet, meta: { hideLayout: true } },
      { path: 'sheets/t/:template', name: 'sheet-template', component: RunSheet, meta: { hideLayout: true } },
      { path: 'docs', name: 'docs', component: RunDoc, meta: { hideLayout: true } },
      { path: 'docs/t/:template', name: 'doc-template', component: RunDoc, meta: { hideLayout: true } },
      { path: 'docs/:id', name: 'doc', component: RunDoc, meta: { hideLayout: true } },
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

const documentStore = useFileStore(pinia)

// Router guard
router.beforeEach(async (to, _from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

// UmoEditor setup
app.use(useUmoEditor, {
  onSave: async (content: { html: string }, _page: any, doc: any) => {
    const routeId = router.currentRoute.value.params.id as string;
    let currentDoc = routeId && routeId !== "undefined" ? await documentStore.loadDocument(routeId) : null;
    console.log('currentDoc:', currentDoc);
    console.log('current content length:', content.html.length);

    const updatedDoc: FileData = currentDoc
      ? { ...currentDoc, title: doc?.title || currentDoc.title, content: content.html, last_viewed: new Date() }
      : { id: undefined, title: doc?.title || "New Document", content: content.html, file_type: "docx", last_viewed: new Date(), isNew: true };

    console.log('updatedDoc:', updatedDoc);
    const saved = await documentStore.saveDocument(updatedDoc);
    console.log('saved:', saved);
    if (saved.document.id !== routeId) {
      console.log('redirecting to:', `/docs/${saved.document.id}`);
      router.replace(`/docs/${saved.document.id}`);
    }
    return { success: !!saved, offline: !navigator.onLine, error: documentStore.lastError };
  },
});

// Custom component for style tags
app.component('v-style', defineComponent({
  render: function(): VNode { // Specify the return type as VNode
    return h('style', {}, this.$slots.default ? this.$slots.default() : []); // Check if $slots.default exists
  },
}))

app.mount('#app')

export { router }