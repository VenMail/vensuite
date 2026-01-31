<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import { type IWorkbookData } from '@univerjs/presets';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data';
import type { IWebsocketService } from '@/lib/wsService';
import { useSheetCollaboration } from '@/composables/useSheetCollaboration';
import { getOrCreateUniver, registerComponent, unregisterComponent } from '@/utils/univerSingleton';

const { data, ws, changesPending, userName } = defineProps({
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
const instanceId = ref<string>('');

onMounted(() => {
  isMounted.value = true;
  instanceId.value = registerComponent();
  if (data) {
    init(data);
  }
});

onBeforeUnmount(() => {
  destroyUniver();
});

// Initialize collaboration
const collaboration = useSheetCollaboration(univerAPI);

watch(() => data, (newData) => {
  if (newData && isMounted.value && isInitialized.value) {
    setData(newData);
  }
}, { deep: true });

/**
 * Initialize univer instance using singleton pattern
 */
async function init(data: IWorkbookData = DEFAULT_WORKBOOK_DATA) {
  try {
    if (!container.value) {
      throw new Error('Container element is missing');
    }

    console.log(`Initializing component ${instanceId.value}`);

    // Use singleton to get or create Univer instance
    const result = await getOrCreateUniver(container.value, data);
    
    univerAPI.value = result.univerAPI;
    workbook.value = result.workbook;
    isInitialized.value = true;

    console.log(`Component ${instanceId.value} initialized successfully`);

    // Initialize collaboration after Univer is ready
    scheduleCollaboration();

    emit('ready', { univer: result.univer, workbook, univerAPI: result.univerAPI });
  } catch (error) {
    console.error('Error initializing Univer component:', error);
    // Reset state on error
    univerAPI.value = null;
    workbook.value = null;
    isInitialized.value = false;
    instanceId.value = '';
  }
}

/**
 * Destroy univer instance and clean up all resources
 */
function destroyUniver() {
  try {
    console.log(`Destroying component ${instanceId.value}`);
    
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
    
    // Clear component references
    univerAPI.value = null;
    isInitialized.value = false;
    instanceId.value = '';
    
    // Clear container to prevent memory leaks
    if (container.value) {
      container.value.innerHTML = '';
    }
    
    // Unregister component (will dispose global instance if last one)
    unregisterComponent();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

/**
 * Get workbook data
 */
async function getData(): Promise<IWorkbookData | null> {
  if (!workbook.value) {
    console.warn('Workbook is not initialized');
    return null;
  }
  try {
    return await workbook.value.save();
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
        newData.id = `${newData.id}_${instanceId.value}_${Date.now()}`;
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