<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula/lib/index.css";

import { IWorkbookData, LocaleType, UnitModel, Univer, UniverInstanceType, Workbook } from "@univerjs/core";
import { enUS as UniverDesignEnUS } from '@univerjs/design';
import { enUS as UniverDocsUIEnUS } from '@univerjs/docs-ui';
import { enUS as UniverSheetsEnUS } from '@univerjs/sheets';
import { enUS as UniverSheetsUIEnUS } from '@univerjs/sheets-ui';
import { enUS as UniverSheetsFormulaUIEnUS } from '@univerjs/sheets-formula';
import { enUS as UniverUIEnUS } from '@univerjs/ui';

import { defaultTheme } from "@univerjs/design";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import { UniverSheetsFormulaPlugin } from "@univerjs/sheets-formula";
import { UniverSheetsUIPlugin } from "@univerjs/sheets-ui";
import { UniverUIPlugin } from "@univerjs/ui";
import { onBeforeUnmount, onMounted, ref, watch, defineEmits, toRef } from "vue";
import diff from "microdiff";

const props = defineProps({
  // workbook data
  data: {
    type: Object,
    default: () => ({}),
  },
});

const univerRef = ref<Univer | null>(null);
const workbook = ref<Workbook & UnitModel | null>(null);
const container = ref<HTMLElement | null>(null);
const emit = defineEmits(['univerRefChange']);

watch(univerRef, (newValue) => {
  emit('univerRefChange', newValue);
});

const dataRef = toRef(props, 'data');

watch(dataRef, (newValue, oldValue) => {
  if (oldValue == null || newValue.id !== oldValue.id) {
    console.log("Data value changed")
    // Reinitialize with the new data
    init(newValue);
  } else {
    console.log(oldValue);
    //sync changes probably
    const differences = diff(newValue, oldValue);
    console.log("diff", differences);
  }
});

// Function to send changes to the backend
const sendChangesToBackend = async (changes: any) => {
  try {
    await fetch('https://app.venmail.io/api/v1/office/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(changes)
    });
    console.log('Changes sent to the backend');
  } catch (error) {
    console.error('Failed to send changes to the backend', error);
  }
};

onMounted(() => {
  init(props.data);
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
        ...UniverSheetsEnUS,
        ...UniverDocsUIEnUS,
        ...UniverSheetsUIEnUS,
        ...UniverUIEnUS,
        ...UniverDesignEnUS,
        ...UniverSheetsFormulaUIEnUS
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
    hasScroll: false,
  });
  univer.registerPlugin(UniverDocsUIPlugin);

  // sheet plugins
  univer.registerPlugin(UniverSheetsPlugin);
  univer.registerPlugin(UniverSheetsUIPlugin);
  univer.registerPlugin(UniverSheetsFormulaPlugin);

  // create workbook instance
  workbook.value = univer.createUnit<IWorkbookData, Workbook & UnitModel>(UniverInstanceType.UNIVER_SHEET, data);
  workbook.value.save();
  console.log("initialize..." + data);
};

/**
 * Destroy univer instance and workbook instance
 */
const destroyUniver = () => {
  univerRef.value?.dispose();
  univerRef.value = null;
  workbook.value = null;
};

/**
 * Get workbook data
 */
const getData = () => {
  if (!workbook.value) {
    throw new Error('Workbook is not initialized');
  }
  workbook.value.save();
  return workbook.value.getSnapshot();
};

/**
 * Set workbook data
 */
const setData = (data: IWorkbookData) => {
  if (!workbook.value) {
    throw new Error('Workbook is not initialized');
  }
  workbook.value.load(data);
  return workbook.value.getSnapshot();
};

const setName = (n: string) => {
  if (!workbook.value) {
    throw new Error('Workbook is not initialized');
  }
  workbook.value.setName(n);
  return n;
};

defineExpose({
  getData,
  setName,
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
