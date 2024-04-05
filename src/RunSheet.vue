<template>
    <div id="app" class="h-screen flex flex-col">
        <div class="flex items-center gap-2 pl-2">
            <defaultIcons.IconMicrosoftExcel class="w-[1.5rem] h-[3rem] text-green-600" ref="iconRef"
                xmlns='http://www.w3.org/2000/svg'/>
            <div class="flex flex-col">
                <div class="flex" @mouseover="togglePencil(true)" @mouseleave="togglePencil(false)">
                    <p class="mt-2 ml-3 font-bold">New Spreadsheet</p>
                    <PencilIcon class="mt-3.5 ml-2 h-3 w-3" v-if="isTitleEdit" />
                </div>
                <SheetMenu />
            </div>
        </div>
        <UniverSheet id="sheet" ref="univerRef" :data="data" />
    </div>

</template>

<script setup lang="ts">
import UniverSheet from './components/UniverSheet.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import { DEFAULT_WORKBOOK_DATA } from './assets/default-workbook-data'
import { onMounted, ref } from 'vue';

import "./assets/index.css"
import SheetMenu from './components/menu/SheetMenu.vue'
import { PencilIcon } from 'lucide-vue-next';
import { useFavicon } from '@vueuse/core';

//todo: load from cache/document id
const data = ref(DEFAULT_WORKBOOK_DATA);
const univerRef = ref<InstanceType<typeof UniverSheet> | null>(null);

const isTitleEdit = ref(false);
const togglePencil = (v: boolean) => {
    isTitleEdit.value = v;
}

const iconRef = ref<HTMLElement | null>(null);
onMounted(() => {
    document.title = 'New Spreadsheet';
    
    const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, "#38a169").replace(/1em/g, "");

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