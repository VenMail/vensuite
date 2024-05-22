import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory, Router } from 'vue-router'
import RunSheet from './RunSheet.vue'
import RunDoc from './RunDoc.vue'
import RunSlide from './RunSlide.vue'
import Home from './Home.vue'
import OauthCallback from './services/OauthCallback.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/sheets', component: RunSheet },
    { path: '/sheets/:id', component: RunSheet },
    { path: '/slides', component: RunSlide },
    { path: '/docs', component: RunDoc },
    { path: '/oauth/callback', component: OauthCallback }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')

export default router as Router;
