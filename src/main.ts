import { createApp, h } from 'vue'
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
import { sluggify } from './utils/lib'
import Editor from './components/forms/Editor.vue'
import Forms from './views/Forms.vue'

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
      { path: 'forms', name: 'forms', component: Forms },
      { path: 'forms/:id', name: 'form', component: Editor },
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
  onSave: async (content: {html: string, json: string, text: string}, page: any, doc: any) => {
    console.log('doc', doc)
    console.log('page', page)
    return await documentStore.saveDocument({
      id: router.currentRoute.value.params?.id as string,
      title: document.title || 'New Document',
      file_name: sluggify(document.title),
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