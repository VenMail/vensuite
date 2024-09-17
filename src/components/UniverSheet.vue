<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">

import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula/lib/index.css";
import diff from "microdiff";
import { IWorkbookData, LocaleType, UnitModel, Univer, UniverInstanceType, Workbook } from '@univerjs/core'
import { defaultTheme } from '@univerjs/design'
import { UniverDocsPlugin } from '@univerjs/docs'
import { UniverDocsUIPlugin } from '@univerjs/docs-ui'
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula'
import { UniverRenderEnginePlugin } from '@univerjs/engine-render'
import { UniverSheetsPlugin } from '@univerjs/sheets'
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula'
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt'
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui'
import { UniverUIPlugin } from '@univerjs/ui'
import { UniverSheetsZenEditorPlugin } from '@univerjs/sheets-zen-editor'
import { FUniver } from '@univerjs/facade'
import { enUS } from 'univer:locales'
//import { setupComment } from './setups/setupComment'
import { onBeforeUnmount, onMounted, ref, toRaw, toRef, watch } from "vue";

const univerRef = ref<Univer | null>(null);
const workBook = ref<Workbook | null>(null);
const container = ref<HTMLElement | null>(null);

function setupUniver(data = {}) {
  const univer = new Univer({
    theme: defaultTheme,
    locale: LocaleType.EN_US,
    locales: {
      [LocaleType.EN_US]: enUS,
    },
  })
  univerRef.value = univer;

  univer.registerPlugin(UniverRenderEnginePlugin)
  univer.registerPlugin(UniverFormulaEnginePlugin)
  univer.registerPlugin(UniverUIPlugin, {
    container: container.value!,
    header: true,
    footer: true,
  })
  univer.registerPlugin(UniverDocsPlugin, {
    hasScroll: false,
  })
  univer.registerPlugin(UniverDocsUIPlugin)

  univer.registerPlugin(UniverSheetsPlugin)
  univer.registerPlugin(UniverSheetsUIPlugin)
  univer.registerPlugin(UniverSheetsFormulaPlugin)
  univer.registerPlugin(UniverSheetsNumfmtPlugin)
  univer.registerPlugin(UniverSheetsZenEditorPlugin)
  const initData = data || {};

workBook.value = univer.createUnit<IWorkbookData, Workbook & UnitModel>(UniverInstanceType.UNIVER_SHEET, initData);

  // In version v0.1.15, please register the comment plugin after calling univer.createUnit.
  // setupComment(univer)

  return FUniver.newAPI(univer)
}

const props = defineProps({
  // workbook data
  data: {
    type: Object,
    default: () => ({}),
  },
});

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
  setupUniver(data);
};

/**
 * Destroy univer instance and workbook instance
 */
const destroyUniver = () => {
  if (workBook.value) {
    toRaw(univerRef.value)?.dispose();
    univerRef.value = null;
    workBook.value = null
  }
};

/**
 * Get workbook data
 */
const getData = () => {
  if (!univerRef.value) {
    throw new Error('Workbook is not initialized');
  }
  return workBook.value?.getSnapshot();
};

/**
 * Set workbook data
 */
const setData = (data: IWorkbookData) => {
  if (!workBook.value) {
    throw new Error('Workbook is not initialized');
  }
  workBook.value.load(data);
  return workBook.value.getSnapshot();
};

const setName = (n: string) => {
  if (!workBook.value) {
    throw new Error('Workbook is not initialized');
  }
  workBook.value.setName(n);
  return n;
};

// Expose methods for use in parent components
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
