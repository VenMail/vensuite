<template>
    <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverSlidesPlugin } from '@univerjs/slides';
import { UniverSlidesUIPlugin } from '@univerjs/slides-ui';
import { UniverUIPlugin } from '@univerjs/ui';

import { LocaleType, SlideDataModel, Univer } from "@univerjs/core";
import { enUS as UniverDesignEnUS } from '@univerjs/design';
import { enUS as UniverDocsUIEnUS } from '@univerjs/docs-ui';
import { enUS as UniverSheetsEnUS } from '@univerjs/sheets';
import { enUS as UniverSheetsUIEnUS } from '@univerjs/sheets-ui';
import { enUS as UniverSlidesUIEnUS } from '@univerjs/slides-ui';
import { enUS as UniverUIEnUS } from '@univerjs/ui';

import { greenTheme, defaultTheme } from "@univerjs/design";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { onBeforeUnmount, onMounted, ref } from "vue";


const { data } = defineProps({
    // workbook data
    data: {
        type: Object,
        default: () => ({}),
    },
});

const univerRef = ref<Univer | null>(null);
const slidemodel = ref<SlideDataModel | null>(null);
const container = ref<HTMLElement | null>(null);

onMounted(() => {
    init(data);
});

onBeforeUnmount(() => {
    destroyUniver();
});

/**
 * Initialize univer instance and workbook instance
 * @param data {IWorkbookData} document see https://univer.work/api/core/interfaces/IWorkbookData.html
 */
const init = (data = {}) => {
    const univer = new Univer({
        theme: greenTheme,
        locale: LocaleType.EN_US,
        locales: {
            [LocaleType.EN_US]: {
                ...UniverSheetsEnUS,
                ...UniverDocsUIEnUS,
                ...UniverSheetsUIEnUS,
                ...UniverSlidesUIEnUS,
                ...UniverUIEnUS,
                ...UniverDesignEnUS,
            },
        },
    });
    univerRef.value = univer;

    univer.registerPlugin(UniverRenderEnginePlugin);
    univer.registerPlugin(UniverUIPlugin, {
        container: 'univer-container',
        header: true,
        footer: true,
    });
    univer.registerPlugin(UniverSlidesPlugin);
    univer.registerPlugin(UniverSlidesUIPlugin);
    // sheet plugins
    // create workbook instance
    slidemodel.value = univer.createUniverSlide({
    });
};

/**
 * Destroy univer instance and workbook instance
 */
const destroyUniver = () => {
    univerRef.value?.dispose();
    univerRef.value = null;
    slidemodel.value = null;
};

/**
 * Get workbook data
 */
const getData = () => {
    if (!slidemodel.value) {
        throw new Error('Workbook is not initialized');
    }
    return slidemodel.value.getSnapshot();
};

defineExpose({
    getData,
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.univer-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
}

/* Also hide the menubar */
:global(.univer-menubar) {
}
</style>