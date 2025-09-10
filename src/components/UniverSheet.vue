<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula/lib/index.css";
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
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import { DEFAULT_WORKBOOK_DATA } from "@/assets/default-workbook-data";
import { IWebsocketService } from "@/lib/wsService";

// Univer 0.10 locale modules: import from each package under /locale/en-US
import designEnUs from '@univerjs/design/locale/en-US'
import uiEnUs from '@univerjs/ui/locale/en-US'
import docsUiEnUs from '@univerjs/docs-ui/locale/en-US'
import sheetsUiEnUs from '@univerjs/sheets-ui/locale/en-US'
import sheetsEnUs from '@univerjs/sheets/locale/en-US'
import sheetsFormulaEnUs from '@univerjs/sheets-formula/locale/en-US'
import zenEditorEnUs from '@univerjs/sheets-zen-editor/locale/en-US'

// Merge EN US locales; cast to any to satisfy ILanguagePack typing differences across packages
const enLocales: any = {
  ...designEnUs,
  ...uiEnUs,
  ...docsUiEnUs,
  ...sheetsUiEnUs,
  ...sheetsEnUs,
  ...sheetsFormulaEnUs,
  ...zenEditorEnUs,
}

const univerRef = ref<Univer | null>(null);
const workBook = ref<Workbook | null>(null);
const container = ref<HTMLElement | null>(null);
const fUniver = ref<FUniver | null>(null);

const props = defineProps({
  data: {
    type: Object as () => IWorkbookData | null,
    required: false,
    default: null,
  },
  ws: {
    type: Object as () => IWebsocketService,
    required: true,
  },
  changesPending: {
    type: Boolean,
    required: true,
  },
  sheetId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['univerRefChange']);

function setupUniver(data: IWorkbookData) {
  try {
    const univer = new Univer({
      theme: defaultTheme,
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: enLocales,
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

    workBook.value = univer.createUnit<IWorkbookData, Workbook & UnitModel>(
      UniverInstanceType.UNIVER_SHEET,
      data || DEFAULT_WORKBOOK_DATA
    );

    // Prefer the indirect approach: pass injector to facade to avoid direct Univer type coupling
    // fUniver.value = FUniver.newAPI(univer);
    fUniver.value = (FUniver as any).newAPI((univer as any).__getInjector()) as any

    setupCollaboration();

    return fUniver.value;
  } catch (error) {
    console.error('Error setting up Univer:', error);
    return null;
  }
}

function setupCollaboration() {
  if (!props.ws || !fUniver.value) return;

  fUniver.value.onCommandExecuted((command) => {
    if (props.changesPending) return
    if (command.id.startsWith('sheet.mutation')) {
      console.log("Command executed:", command)
      props.ws?.sendMessage(props.sheetId, 'change', { command }, props.userId, props.userName);
    }
  });

  fUniver.value.getActiveWorkbook()?.onSelectionChange((selection: any) => {
    props.ws?.sendMessage(props.sheetId,
      'cursor', {
      userId: props.userId,
      userName: props.userName,
      selection,
    },
      props.userId,
      props.userName
    )
  });
}

watch(() => props.data, (newValue, oldValue) => {
  // Handle initialization when data becomes available
  if (newValue && !oldValue) {
    console.log('Data became available, initializing UniverSheet')
    init(newValue)
    return
  }
  
  // Handle data updates with different IDs
  if (newValue && (!workBook.value || newValue.id !== workBook.value.getUnitId())) {
    console.log('Data ID changed, reinitializing UniverSheet')
    init(newValue)
    return
  }
  
  // Handle case where data becomes null (shouldn't happen normally)
  if (!newValue && oldValue) {
    console.log('Data became null, using default data')
    init(DEFAULT_WORKBOOK_DATA)
  }
}, { immediate: false })

onMounted(() => {
  // Initialize with provided data or wait for data to be provided
  if (props.data) {
    console.log('UniverSheet: Initializing with provided data')
    init(props.data)
  } else {
    console.log('UniverSheet: No initial data, will wait for data prop to be set')
    // The watch will handle initialization when data becomes available
  }
})

onBeforeUnmount(() => {
  destroyUniver();
});

const init = (data: IWorkbookData | null) => {
  try {
    // Clean up any existing instance first
    if (workBook.value) {
      destroyUniver()
    }
    
    // Use provided data or fall back to default
    const workbookData = data || DEFAULT_WORKBOOK_DATA
    console.log('Initializing UniverSheet with data:', {
      hasData: !!data,
      dataId: workbookData.id,
      dataName: workbookData.name,
      hasSheets: !!workbookData.sheets
    })
    
    const api = setupUniver(workbookData)
    if (api) {
      emit('univerRefChange', api)
    } else {
      console.error('Failed to initialize Univer')
    }
  } catch (error) {
    console.error('Error initializing Univer:', error)
  }
}

const destroyUniver = () => {
  try {
    if (workBook.value) {
      toRaw(univerRef.value)?.dispose();
      univerRef.value = null;
      workBook.value = null;
      fUniver.value = null;
    }
  } catch (error) {
    console.error('Error destroying Univer:', error);
  }
};

const getData = () => {
  try {
    return workBook.value?.getSnapshot();
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
};

const setData = (data: IWorkbookData) => {
  try {
    if (!workBook.value) {
      throw new Error('Workbook is not initialized');
    }
    workBook.value.load(data);
    return workBook.value.getSnapshot();
  } catch (error) {
    console.error('Error setting data:', error);
    return null;
  }
};

const setName = (n: string) => {
  try {
    if (!workBook.value) {
      throw new Error('Workbook is not initialized');
    }
    workBook.value.setName(n);
    return n;
  } catch (error) {
    console.error('Error setting name:', error);
    return null;
  }
};

defineExpose({
  getData,
  setName,
  setData,
  fUniver,
});
</script>

<style scoped>
.univer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

:global(.univer-menubar) {
  display: none;
}
</style>