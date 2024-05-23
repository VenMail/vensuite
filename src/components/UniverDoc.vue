<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";

import { DocumentDataModel, IDocumentData, LocaleType, Univer, UniverInstanceType } from "@univerjs/core";
import { enUS as UniverDesignEnUS } from '@univerjs/design';
import { enUS as UniverDocsUIEnUS } from '@univerjs/docs-ui';
import { enUS as UniverUIEnUS } from '@univerjs/ui';

import { defaultTheme } from "@univerjs/design";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { UniverUIPlugin } from "@univerjs/ui";
import { onBeforeUnmount, onMounted, ref } from "vue";


const { data } = defineProps({
  // workbook data
  data: {
    type: Object,
    default: () => ({}),
  },
});

const univerRef = ref<Univer | null>(null);
const docmodel = ref<Document & DocumentDataModel | null>(null);
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
    theme: defaultTheme,
    locale: LocaleType.EN_US,
    locales: {
      [LocaleType.EN_US]: {
        ...UniverDocsUIEnUS,
        ...UniverUIEnUS,
        ...UniverDesignEnUS,
      },
    },
  });
  univerRef.value = univer;


  // core plugins
  univer.registerPlugin(UniverRenderEnginePlugin);
  univer.registerPlugin(UniverFormulaEnginePlugin);
  univer.registerPlugin(UniverUIPlugin, {
    container: container.value || undefined,
    header: true,
    footer: true,
  });

  // doc plugins
  univer.registerPlugin(UniverDocsPlugin, {
  });


  univer.registerPlugin(UniverDocsUIPlugin, {
    container: 'univerdoc',
    layout: {
      docContainerConfig: {
        innerLeft: false,
      },
    },
  });
  // sheet plugins
  // create workbook instance
  docmodel.value = univer.createUnit<IDocumentData, Document & DocumentDataModel>(UniverInstanceType.UNIVER_DOC, data);
};

/**
 * Destroy univer instance and workbook instance
 */
const destroyUniver = () => {
  univerRef.value?.dispose();
  univerRef.value = null;
  docmodel.value = null;
};

/**
 * Get document data
 */
const getData = () => {
  if (!docmodel.value) {
    throw new Error('Document is not initialized');
  }
  return docmodel.value.getSnapshot();
};

/**
 * Set workbook data
 */
const setData = (data: IDocumentData) => {
  if (!docmodel.value) {
    throw new Error('Document is not initialized');
  }
  docmodel.value.reset(data);
};

const setTitle = (n: string) => {
  if (!docmodel.value) {
    throw new Error('Document is not initialized');
  }
  docmodel.value.title = n;
  return n;
};

defineExpose({
  getData,
  setTitle,
  setData,
  univerRef,
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
:global(.univer-menubar) {}
</style>