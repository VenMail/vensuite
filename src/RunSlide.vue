<template>
    <div id="app" class="h-screen flex flex-col">
        <SlideMenu />
        <UniverSlide id="slide" ref="univerRef" :data="data" />
    </div>
</template>

<script setup lang="ts">
import { DEFAULT_DOCUMENT_DATA } from './assets/default-document-data'
import { onMounted, ref } from 'vue';

import "./assets/index.css"
import SlideMenu from './components/menu/SlideMenu.vue'
import UniverSlide from './components/UniverSlide.vue';

const data = ref(DEFAULT_DOCUMENT_DATA);
const univerRef = ref<InstanceType<typeof UniverSlide> | null>(null);
    
onMounted(() => {
    document.title = 'New Slide';
});

const getData = () => {
    const result = univerRef.value?.getData();
    console.log(JSON.stringify(result, null, 2));
}
</script>

<style>
html,
body {
    margin: 0;
    padding: 0;
}

#app {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

#sheet {
    /** The height of the Union uses the height of the parent container */
    flex: 1;
}
</style>
