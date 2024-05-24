<template>
    <div id="app" class="h-screen flex flex-col">
        <div class="flex items-center gap-2 pl-2">
            <defaultIcons.IconMicrosoftWord class="w-[1.5rem] h-[3rem] text-blue-600" ref="iconRef"
                xmlns='http://www.w3.org/2000/svg' />
            <div class="flex flex-col">
                <div class="flex" @mouseover="togglePencil(true)" @mouseleave="togglePencil(false)">
                    <div id="docHead" :contenteditable="isTitleEdit" @input="updateTitle" @blur="saveTitle"
                        @keydown.enter.prevent="saveTitle"
                        class="mt-2 ml-3 font-bold border-b border-dotted border-gray-300"
                        :class="{ 'cursor-text': isTitleEdit }" ref="titleRef" @click="editTitle">
                        {{ title }}
                    </div>
                    <PencilIcon class="mt-3.5 ml-2 h-3 w-3" v-if="isTitleEdit" />
                </div>
                <DocMenu :univerRef="univerRef" :coreRef="(univerCoreRef as Univer | null)" @updateData="updateData" />
            </div>
        </div>
        <UniverDoc id="doc" ref="univerRef" :data="(data as any)" />
    </div>
</template>

<script setup lang="ts">
import UniverDoc from './components/UniverDoc.vue'
import QuillDoc from './components/QuillDoc.vue';
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import { DEFAULT_DOCUMENT_DATA } from './assets/default-document-data'
import { nextTick, onMounted, ref, Ref, watchEffect } from 'vue';

import "./assets/index.css"
import DocMenu from './components/menu/DocMenu.vue'
import { PencilIcon } from 'lucide-vue-next';
import { useFavicon } from '@vueuse/core';
import { IDocumentData, Univer } from '@univerjs/core';
import { useRoute, useRouter } from 'vue-router';

// Router setup
const router = useRouter();
const route = useRoute();

// Reactive references
const data = ref<Partial<IDocumentData> | null>(null);
const univerRef: Ref<InstanceType<typeof UniverDoc> | null> = ref(null);
const univerCoreRef = ref<Univer | null>(null);
const title = ref('New Document');
const isTitleEdit = ref(false);

// Handler for univerRefChange event
const onUniverRefChange = (childUniverRef: Univer | null) => {
    univerCoreRef.value = childUniverRef;
};

// Load data function
function loadData(id: string) {
    console.log("Loading.. ", id);
    const savedData = localStorage.getItem(id);
    console.log("Loaded.. ", savedData)
    return savedData ? JSON.parse(savedData) : DEFAULT_DOCUMENT_DATA;
}

// Update data handler
function updateData(newData: IDocumentData) {
    data.value = newData;
}

const titleRef = ref<HTMLElement | null>(null);

const editTitle = () => {
    isTitleEdit.value = true;
    nextTick(() => {
        const titleEl = titleRef.value;
        if (titleEl) {
            titleEl.focus();
        }
    });
}

const updateTitle = (event: Event) => {
    const target = event.target as HTMLElement;
    title.value = target.innerText;
}

const saveTitle = () => {
    isTitleEdit.value = false;
    document.title = title.value || "New Document";
    univerRef.value?.setTitle(title.value);
}

const togglePencil = (v: boolean) => {
    isTitleEdit.value = v;
    if (v) {
        editTitle()
    }
}

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null);
onMounted(() => {
    watchEffect(() => {
        if (route.params.id && title.value == "New Document") {
            console.log('efffect change', route.params.id);
            // Load data after route is initialized
            data.value = loadData(route.params.id as string);

            const docId = data.value?.id;
            if (route.params.id !== docId) {
                router.replace({ path: `/docs/${docId}` });
            }
            document.title = data.value?.title || "New Document";
            title.value = document.title;

            const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, "#4d7cfe").replace(/1em/g, "");
            const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || "")}`;
            useFavicon(iconDataURL);
        }
    });
});

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

#doc {
    /** The height of the Union uses the height of the parent container */
    flex: 1;
}

.ql-toolbar.ql-snow + .ql-container.ql-snow {
    margin-left: 5%;
    margin-right: 5%;
}
/* For small screens (up to 480px) */
@media (max-width: 480px) {
    .ql-toolbar.ql-snow + .ql-container.ql-snow {
        margin-left: 5%;
        margin-right: 5%;
    }
}

/* For small to medium screens (481px to 768px) */
@media (min-width: 481px) and (max-width: 768px) {
    .ql-toolbar.ql-snow + .ql-container.ql-snow {
        margin-left: 8%;
        margin-right: 8%;
    }
}

/* For medium screens (769px to 1024px) */
@media (min-width: 769px) and (max-width: 1024px) {
    .ql-toolbar.ql-snow + .ql-container.ql-snow {
        margin-left: 10%;
        margin-right: 10%;
    }
}

/* For medium to large screens (1025px to 1440px) */
@media (min-width: 1025px) and (max-width: 1440px) {
    .ql-toolbar.ql-snow + .ql-container.ql-snow {
        margin-left: 15%;
        margin-right: 15%;
    }
}

/* For large screens (1441px to 1920px) */
@media (min-width: 1441px) and (max-width: 1920px) {
    .ql-toolbar.ql-snow + .ql-container.ql-snow {
        margin-left: 20%;
        margin-right: 20%;
    }
}

/* For extra large screens (1921px and above) */
@media (min-width: 1921px) {
    .ql-toolbar.ql-snow + .ql-container.ql-snow {
        margin-left: 25%;
        margin-right: 25%;
    }
}

#docHead>[contenteditable="true"] {
    outline: 2px dotted #1e3a8a;
}
</style>
