<template>
    <div id="app" class="h-screen flex flex-col">
        <div class="flex items-center gap-2 pl-2">
            <defaultIcons.IconMicrosoftWord class="w-[1.5rem] h-[3rem] text-blue-600" ref="iconRef"
                xmlns='http://www.w3.org/2000/svg'/>
            <div class="flex flex-col">
                <div class="flex" @mouseover="togglePencil(true)" @mouseleave="togglePencil(false)">
                    <p class="mt-2 ml-3 font-bold">New Document</p>
                    <PencilIcon class="mt-3.5 ml-2 h-3 w-3" v-if="isTitleEdit" />
                </div>
                <DocMenu />
            </div>
        </div>
        <UniverDoc id="document" ref="univerRef" :data="data" />
    </div>
</template>

<script setup lang="ts">
import UniverDoc from './components/UniverDoc.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import { ref, onMounted } from 'vue';

import "./assets/index.css"
import DocMenu from './components/menu/DocMenu.vue'
import { PencilIcon } from 'lucide-vue-next';
import { useFavicon } from '@vueuse/core';

const isTitleEdit = ref(false);
const togglePencil = (v: boolean) => {
    isTitleEdit.value = v;
}

//todo: retrieve from local cache if possible or load based on document id in route
const data = ref();
const univerRef = ref<InstanceType<typeof UniverDoc> | null>(null);

const iconRef = ref<HTMLElement | null>(null);
onMounted(() => {
    document.title = 'New Document';

    const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, "#4d7cfe").replace(/1em/g, "");

    const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || "")}`;
    console.log(iconDataURL)
    useFavicon(iconDataURL)
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
