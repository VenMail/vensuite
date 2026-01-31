<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";

import { type IWorkbookData, UserManagerService, Univer, UniverInstanceType, LocaleType } from "@univerjs/core";
import { defaultTheme } from "@univerjs/design";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import { UniverSheetsFormulaPlugin } from "@univerjs/sheets-formula";
import { UniverSheetsUIPlugin } from "@univerjs/sheets-ui";
import { UniverUIPlugin } from "@univerjs/ui";
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data'
import type { IWebsocketService } from '@/lib/wsService'

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
})

const emit = defineEmits(['univerRefChange'])

const univerInstance = ref<any>(null)
const workbook = ref<any>(null)
const container = ref<HTMLElement | null>(null)
const collaborationDisposers: Array<() => void> = []
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
  // Add small delay to ensure DOM is ready
  setTimeout(() => {
    if (data) {
      init(data)
    }
  }, 100)
})

onBeforeUnmount(() => {
  destroyUniver()
})

watch(() => data, (newData) => {
  if (newData && isMounted.value && univerInstance.value) {
    setData(newData)
  }
}, { deep: true })

/**
 * Initialize univer instance and workbook instance
 * Following official Vue 3 example pattern
 */
async function init(data: IWorkbookData = DEFAULT_WORKBOOK_DATA) {
  try {
    if (!container.value) {
      throw new Error('Container element is missing')
    }

    // Prevent duplicate initialization
    if (univerInstance.value) {
      console.warn('Univer already initialized')
      return
    }

    // Create Univer instance
    const univer = new Univer()

    // Register core plugins
    univer.registerPlugin(UniverRenderEnginePlugin)
    univer.registerPlugin(UniverFormulaEnginePlugin)
    univer.registerPlugin(UniverUIPlugin, {
      container: container.value,
      header: false,
      toolbar: true,
      footer: false,
    })

    // Register doc plugins
    univer.registerPlugin(UniverDocsPlugin, {
      hasScroll: false,
    })
    univer.registerPlugin(UniverDocsUIPlugin)

    // Register sheet plugins
    univer.registerPlugin(UniverSheetsPlugin)
    univer.registerPlugin(UniverSheetsUIPlugin)
    univer.registerPlugin(UniverSheetsFormulaPlugin)

    // Initialize locale after plugins are registered
    univer.setLocale(LocaleType.EN_US)

    // Set up user management
    try {
      const injector = univer.__getInjector()
      if (injector) {
        const userManager = injector.get(UserManagerService)
        if (userManager) {
          userManager.setCurrentUser({
            userID: 'Owner_qxVnhPbQ',
            name: userName,
            anonymous: false,
            canBindAnonymous: false,
          } as any)
        }
      }
    } catch (error) {
      console.warn('Failed to set up user management:', error)
    }

    // Create workbook instance using official example approach
    workbook.value = univer.createUnit(UniverInstanceType.UNIVER_SHEET, data)
    univerInstance.value = univer

    emit('univerRefChange', { univer, workbook })
  } catch (error) {
    console.error('Error initializing Univer:', error)
  }
}

/**
 * Destroy univer instance and workbook instance
 */
function destroyUniver() {
  if (univerInstance.value) {
    try {
      // Dispose all units first
      const univer = univerInstance.value
      const instanceService = univer.__getInjector()?.get('UniverInstanceService')
      if (instanceService) {
        const allUnits = instanceService.getAllUnitsForType(UniverInstanceType.UNIVER_SHEET)
        allUnits.forEach((unit: any) => {
          try {
            instanceService.disposeUnit(unit.getUnitId())
          } catch (e) {
            console.warn('Failed to dispose unit:', e)
          }
        })
      }
      
      // Then dispose the univer instance
      univerInstance.value.dispose()
    } catch (error) {
      console.warn('Error during Univer disposal:', error)
    } finally {
      univerInstance.value = null
      workbook.value = null
    }
  }
  cleanupCollaboration()
}

/**
 * Get workbook data
 */
async function getData(): Promise<IWorkbookData | null> {
  if (!workbook.value) {
    console.warn('Workbook is not initialized')
    return null
  }
  try {
    return await workbook.value.save()
  } catch (error) {
    console.error('Error getting data:', error)
    return null
  }
}

/**
 * Set workbook data
 */
async function setData(data: IWorkbookData) {
  try {
    if (!univerInstance.value) {
      await init(data)
      return await getData()
    }

    if (!workbook.value) {
      workbook.value = univerInstance.value.createUnit(UniverInstanceType.UNIVER_SHEET, data)
      return await getData()
    }

    // Update existing workbook data instead of creating new one
    if (typeof workbook.value.fromJSON === 'function') {
      await workbook.value.fromJSON(data)
    } else {
      // If fromJSON is not available, we need to dispose the old workbook first
      try {
        // Try to dispose the old workbook
        if (workbook.value && typeof workbook.value.dispose === 'function') {
          workbook.value.dispose()
        }
      } catch (e) {
        console.warn('Failed to dispose old workbook:', e)
      }
      
      // Create new workbook with unique ID
      const newData = { ...data }
      if (newData.id) {
        // Generate unique ID to avoid conflicts
        newData.id = `${newData.id}_${Date.now()}`
      }
      workbook.value = univerInstance.value.createUnit(UniverInstanceType.UNIVER_SHEET, newData)
    }

    return await getData()
  } catch (error) {
    console.error('Error setting data:', error)
    return null
  }
}

/**
 * Set workbook name
 */
function setName(n: string) {
  try {
    if (!workbook.value) {
      throw new Error('Workbook is not initialized')
    }
    workbook.value.setName(n)
    return n
  } catch (error) {
    console.error('Error setting name:', error)
    return null
  }
}

/**
 * Cleanup collaboration
 */
function cleanupCollaboration() {
  collaborationDisposers.forEach((dispose) => dispose())
  collaborationDisposers.length = 0
}

/**
 * Schedule collaboration (simplified for plugin approach)
 */
function scheduleCollaboration() {
  cleanupCollaboration()
  // Note: Collaboration setup would need to be adapted for plugin approach
  // The official example doesn't include collaboration features
}

defineExpose({
  getData,
  setData,
  setName,
  univer: univerInstance,
  workbook,
})
</script>

<style scoped>
.univer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Hide the menubar to match our UI needs */
:global(.univer-menubar) {
  display: none;
}

/* Fix for cell positioning and freeze pane styling */
:global(.univer-sheet-container) {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
}

:global(.univer-sheet-canvas) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}

:global(.univer-sheet-viewport) {
  position: relative !important;
  overflow: auto !important;
}

:global(.univer-sheet-row-header) {
  position: sticky !important;
  left: 0 !important;
  z-index: 10 !important;
  background: #f8f9fa !important;
}

:global(.univer-sheet-column-header) {
  position: sticky !important;
  top: 0 !important;
  z-index: 11 !important;
  background: #f8f9fa !important;
}

:global(.univer-sheet-corner) {
  position: sticky !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 12 !important;
  background: #f8f9fa !important;
}

/* Dark mode fixes */
:global(.dark .univer-sheet-row-header),
:global(.dark .univer-sheet-column-header),
:global(.dark .univer-sheet-corner) {
  background: #374151 !important;
  color: #f3f4f6 !important;
}

/* Freeze pane fixes */
:global(.univer-sheet-frozen-row) {
  position: sticky !important;
  top: 0 !important;
  z-index: 5 !important;
  background: inherit !important;
}

:global(.univer-sheet-frozen-column) {
  position: sticky !important;
  left: 0 !important;
  z-index: 5 !important;
  background: inherit !important;
}

:global(.univer-sheet-frozen-corner) {
  position: sticky !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 6 !important;
  background: inherit !important;
}
</style>