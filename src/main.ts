import { createApp, h } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { useUmoEditor } from '@umoteam/editor'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import { useAuthStore } from './store/auth'
import { useDocumentStore } from './store/document'

// Routes
import Home from './views/Home.vue'
import RunSheet from './views/RunSheet.vue'
import RunDoc from './views/RunDoc.vue'
import Login from './views/Login.vue'
import OauthCallback from './views/OauthCallback.vue'
import AuthenticatedLayout from './layouts/AuthenticatedLayout.vue'

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
      { path: '', name: 'home', component: Home },
      { path: 'sheets', name: 'sheets', component: RunSheet },
      { path: 'sheets/:id', name: 'sheet', component: RunSheet },
      { path: 'docs', name: 'docs', component: RunDoc },
      { path: 'docs/:id', name: 'doc', component: RunDoc },
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
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1"
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

const authStore = useAuthStore(pinia) // Use the store after Pinia is registered
authStore.setupAxiosInterceptor() // Now you can call setupAxiosInterceptor
authStore.setRouter(router) // Now you can call setupAxiosInterceptor

const documentStore = useDocumentStore(pinia)

// Router guard
router.beforeEach(async (to, from, next) => {
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
  onSave: async (content: {html: string, json: string, text: string}, page: any, doc: any) => {
    console.log('doc', doc)
    console.log('page', page)
    return await documentStore.saveDocument({
      id: router.currentRoute.value.params?.id as string,
      title: document.title || 'New Document',
      contents: content.html,
      file_type: "docx"
    })
  }
})

// Custom component for style tags
app.component('v-style', {
  render: function() {
    return h('style', {}, this.$slots.default())
  },
})

app.mount('#app')

export { router }