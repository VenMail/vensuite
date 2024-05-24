import { createApp, h } from "vue";
import App from "./App.vue";
import { createRouter, createWebHistory, Router } from "vue-router";
import store from "./store";
import "./packages/cassie/index.css";
import "v-calendar/dist/style.css";
import VCalendar from "v-calendar";

// Custom components
import CustomHline from "./packages/cassie/design/components/custom-hline/index.vue";
import CustomVline from "./packages/cassie/design/components/custom-vline/index.vue";
import CustomText from "./packages/cassie/design/components/custom-text/index.vue";
import CustomImage from "./packages/cassie/design/components/custom-image/index.vue";
import CustomLogo from "./packages/cassie/design/components/custom-logo/index.vue";
import CustomSelect from "./packages/cassie/design/components/custom-select/index.vue";
import PageCount from "./packages/cassie/design/components/page-count/index.vue";

// Routes
import RunSheet from './RunSheet.vue';
import RunDoc from './RunDoc.vue';
import RunSlide from './RunSlide.vue';
import Home from './Home.vue';
import OauthCallback from './services/OauthCallback.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/sheets', component: RunSheet },
  { path: '/sheets/:id', component: RunSheet },
  { path: '/slides', component: RunSlide },
  { path: '/docs', component: RunDoc },
  { path: '/docs/:id', component: RunDoc },
  { path: '/oauth/callback', component: OauthCallback }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const app = createApp(App);

// Use Vue plugins
app.use(router);
app.use(store);
app.use(VCalendar, {});
app.component(CustomHline.name || 'CustomHline', CustomHline);
app.component(CustomVline.name || 'CustomVline', CustomVline);
app.component(CustomText.name || 'CustomText', CustomText);
app.component(CustomImage.name || 'CustomImage', CustomImage);
app.component(CustomLogo.name || 'CustomLogo', CustomLogo);
app.component(CustomSelect.name || 'CustomSelect', CustomSelect);
app.component(PageCount.name || 'PageCount', PageCount);

// Custom component for style tags
app.component("v-style", {
  render() {
    return h("style", {}, this.$slots.default());
  }
});

app.mount("#app");

export default router as Router;
