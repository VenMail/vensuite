<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import { type IWorkbookData, LocaleType, merge } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data';
import type { IWebsocketService } from '@/lib/wsService';
import { useSheetCollaboration } from '@/composables/useSheetCollaboration';

const { data, ws } = defineProps({
  // workbook data
  data: {
    type: Object as () => IWorkbookData | null,
    required: false,
    default: () => DEFAULT_WORKBOOK_DATA,
  },
  ws: {
    type: Object as () => IWebsocketService | null,
    required: false,
    default: null,
  },
  changesPending: {
    type: Boolean,
    required: false,
    default: false,
  },
  userName: {
    type: String,
    required: false,
    default: 'User',
  },
});

const emit = defineEmits(['ready', 'change']);

const univerAPI = ref<any>(null);
const workbook = ref<any>(null);
const container = ref<HTMLElement | null>(null);
const collaborationDisposers: Array<() => void> = [];
const isMounted = ref(false);
const isInitialized = ref(false);

onMounted(() => {
  isMounted.value = true;
  if (data) {
    init(data);
  }
});

onBeforeUnmount(() => {
  destroyUniver();
});

// Initialize collaboration
const collaboration = useSheetCollaboration(univerAPI);

// Remove problematic deep watch that causes double mutations
// The parent component will handle data synchronization

// Global instance tracker to prevent multiple Univer instances
let univerInstanceCount = 0
let globalUniverAPI: any = null

/**
 * Initialize univer instance using simplified preset approach
 */
async function init(data: IWorkbookData = DEFAULT_WORKBOOK_DATA) {
  try {
    if (!container.value) {
      throw new Error('Container element is missing');
    }

    // Prevent duplicate initialization globally
    if (globalUniverAPI) {
      console.warn('Univer already initialized globally, reusing instance');
      univerAPI.value = globalUniverAPI;
      
      // Create new workbook with unique ID
      const workbookData = { ...data };
      if (workbookData.id) {
        workbookData.id = `${workbookData.id}_${Date.now()}_${univerInstanceCount++}`;
      }
      workbook.value = univerAPI.value.createWorkbook(workbookData);
      isInitialized.value = true;
      
      // Initialize collaboration after Univer is ready
      scheduleCollaboration();
      emit('ready', { univer: { univerAPI: globalUniverAPI }, workbook, univerAPI: globalUniverAPI });
      return;
    }

    // Dynamic import to avoid SSR issues
    const { createUniver, defaultTheme } = await import('@univerjs/presets');

    // Ensure unique workbook ID by adding timestamp if needed
    const workbookData = { ...data };
    if (workbookData.id) {
      workbookData.id = `${workbookData.id}_${Date.now()}_${univerInstanceCount++}`;
    }

    // Create Univer instance using preset (much simpler!)
    const univer = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        enUS: merge({}, UniverPresetSheetsCoreEnUS),
      },
      theme: defaultTheme,
      presets: [
        UniverSheetsCorePreset({
          container: container.value,
        }),
      ],
    });

    univerAPI.value = univer.univerAPI;
    globalUniverAPI = univer.univerAPI; // Store global reference
    
    // Create workbook with unique ID and validate data
    if (!workbookData.sheets || Object.keys(workbookData.sheets).length === 0) {
      console.warn('No sheets found in workbook data, creating default sheet')
      workbookData.sheets = {
        'Sheet1': {
          id: 'Sheet1',
          name: 'Sheet1',
          cellData: {},
          rowCount: 1000,
          columnCount: 26,
          defaultColumnWidth: 100,
          defaultRowHeight: 25,
          rowData: [],
          columnData: [],
        }
      }
    }
    
    // Ensure all sheets have required properties and valid column data
    Object.keys(workbookData.sheets).forEach(sheetKey => {
      const sheet = workbookData.sheets[sheetKey]
      
      // Only set essential properties that are actually missing
      if (!sheet.columnData) {
        sheet.columnData = Array.from({ length: sheet.columnCount || 26 }, () => ({ 
          w: sheet.defaultColumnWidth || 100, 
          hd: 0 
        }));
      } else {
        // Ensure columnData is an array and has valid width for all columns
        const columnArray = Array.isArray(sheet.columnData) ? sheet.columnData : [];
        const targetLength = sheet.columnCount || 26;
        
        // Fill missing columns
        while (columnArray.length < targetLength) {
          columnArray.push({ w: sheet.defaultColumnWidth || 100, hd: 0 });
        }
        
        // Fix any invalid width values
        for (let i = 0; i < columnArray.length; i++) {
          if (!columnArray[i] || columnArray[i].w <= 0) {
            columnArray[i] = { w: sheet.defaultColumnWidth || 100, hd: 0 };
          }
        }
        
        sheet.columnData = columnArray;
      }
    })
    
    workbook.value = univerAPI.value.createWorkbook(workbookData);
    isInitialized.value = true;

    // Initialize collaboration after Univer is ready
    scheduleCollaboration();

    emit('ready', { univer: univer.univer, workbook, univerAPI: univerAPI.value });
  } catch (error) {
    console.error('Error initializing Univer:', error);
  }
}

/**
 * Destroy univer instance and clean up all resources
 */
function destroyUniver() {
  try {
    // Cleanup collaboration first
    cleanupCollaboration();
    
    // Dispose workbook if it exists
    if (workbook.value) {
      try {
        if (typeof workbook.value.dispose === 'function') {
          workbook.value.dispose();
        }
      } catch (e) {
        console.warn('Failed to dispose workbook:', e);
      }
      workbook.value = null;
    }
    
    // Only dispose univer instance if this is the last component using it
    if (univerAPI.value === globalUniverAPI) {
      // Check if other components might be using this instance
      // For now, we'll keep it alive to prevent re-initialization issues
      console.log('Keeping global Univer instance alive to prevent re-initialization conflicts');
    }
    
    univerAPI.value = null;
    
    // Reset initialization state
    isInitialized.value = false;
    
    // Clear container to prevent memory leaks
    if (container.value) {
      container.value.innerHTML = '';
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

/**
 * Get workbook data
 */
async function getData(): Promise<IWorkbookData | null> {
  if (!univerAPI.value) {
    console.warn('Univer API is not initialized');
    return null;
  }
  
  try {
    // Try to get active workbook first (new 0.15.2 pattern)
    const activeWorkbook = univerAPI.value.getActiveWorkbook();
    if (!activeWorkbook) {
      console.warn('No active workbook found');
      return null;
    }
    
    // Try save method first, fallback to snapshot
    if (typeof (activeWorkbook as any).save === 'function') {
      return await (activeWorkbook as any).save();
    }
    
    if (typeof (activeWorkbook as any).getSnapshot === 'function') {
      return (activeWorkbook as any).getSnapshot();
    }
    
    // Fallback to our workbook ref
    if (workbook.value && typeof (workbook.value as any).save === 'function') {
      return await (workbook.value as any).save();
    }
    
    console.warn('No save method available on workbook');
    return null;
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
}

/**
 * Set workbook data
 */
async function setData(data: IWorkbookData) {
  try {
    if (!univerAPI.value) {
      await init(data);
      return await getData();
    }

    if (!workbook.value) {
      workbook.value = univerAPI.value.createWorkbook(data);
      return await getData();
    }

    // Update existing workbook data
    if (typeof workbook.value.fromJSON === 'function') {
      await workbook.value.fromJSON(data);
    } else {
      // Dispose old workbook and create new one with unique ID
      try {
        if (workbook.value && typeof workbook.value.dispose === 'function') {
          workbook.value.dispose();
        }
      } catch (e) {
        console.warn('Failed to dispose old workbook:', e);
      }
      
      // Ensure unique ID for new workbook
      const newData = { ...data };
      if (newData.id) {
        newData.id = `${newData.id}_${Date.now()}_${univerInstanceCount++}`;
      }
      workbook.value = univerAPI.value.createWorkbook(newData);
    }

    return await getData();
  } catch (error) {
    console.error('Error setting data:', error);
    return null;
  }
}

/**
 * Set workbook name
 */
function setName(n: string) {
  try {
    if (!workbook.value) {
      throw new Error('Workbook is not initialized');
    }
    workbook.value.setName(n);
    return n;
  } catch (error) {
    console.error('Error setting name:', error);
    return null;
  }
}

/**
 * Cleanup collaboration
 */
function cleanupCollaboration() {
  collaborationDisposers.forEach((dispose) => dispose());
  collaborationDisposers.length = 0;
}

/**
 * Schedule collaboration (integrated with custom WebSocket)
 */
function scheduleCollaboration() {
  cleanupCollaboration();
  // Initialize collaboration if WebSocket service is provided
  if (ws) {
    collaboration.initializeWebSocketAndJoinSheet();
    collaborationDisposers.push(() => {
      collaboration.leaveSheet();
    });
  }
}

defineExpose({
  getData,
  setData,
  setName,
  univer: univerAPI,
  workbook,
  collaboration,
});
</script>

<style scoped>
.univer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>