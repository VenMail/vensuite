<template>
  <div ref="container" class="univer-container"></div>
</template>

<script setup lang="ts">
import '@univerjs/preset-sheets-core/lib/index.css'
import { createUniver, LocaleType, mergeLocales, type FUniver, type Univer } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import sheetsCoreEnUs from '@univerjs/preset-sheets-core/locales/en-US'
import { UserManagerService, type IWorkbookData } from '@univerjs/core'
import { onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data'
import type { IWebsocketService } from '@/lib/wsService'

const univerRef = ref<Univer | null>(null)
const fUniver = ref<FUniver | null>(null)
const container = ref<HTMLElement | null>(null)
const collaborationDisposers: Array<() => void> = []

const props = defineProps({
  data: {
    type: Object as () => IWorkbookData | null,
    required: false,
    default: null,
  },
  ws: {
    type: Object as () => IWebsocketService | null,
    required: false,
    default: null,
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
})

const emit = defineEmits(['univerRefChange'])

const activeWorkbook = ref<ReturnType<FUniver['getActiveWorkbook']> | null>(null)

function setupUniver(data: IWorkbookData) {
  try {
    if (!container.value) {
      throw new Error('Container element is missing')
    }

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(sheetsCoreEnUs),
      },
      presets: [
        UniverSheetsCorePreset({
          container: container.value,
        }),
      ],
    })

    univerRef.value = univer
    fUniver.value = univerAPI

    try {
      const injector = univer.__getInjector()
      const userManager = injector.get(UserManagerService)
      userManager.setCurrentUser({
        userID: props.userId,
        name: props.userName,
        anonymous: false,
        canBindAnonymous: false,
      } as any)
    } catch {}

    const workbook = activeWorkbook.value ?? univerAPI.createWorkbook(data || DEFAULT_WORKBOOK_DATA, { makeCurrent: true })
    activeWorkbook.value = workbook

    scheduleCollaboration()

    return univerAPI
  } catch (error) {
    console.error('Error setting up Univer:', error)
    return null
  }
}

function scheduleCollaboration() {
  cleanupCollaboration()

  if (!props.ws || !fUniver.value || !activeWorkbook.value) {
    return
  }

  const commandDisposer = fUniver.value.onCommandExecuted(command => {
    if (!props.ws) return
    if (props.changesPending) {
      return
    }
    if (command.id.startsWith('sheet.')) {
      let serializedParams: any = undefined
      if (command.params !== undefined) {
        try {
          serializedParams = JSON.parse(JSON.stringify(command.params))
        } catch (error) {
          console.warn('Unable to serialize command params for broadcast, skipping command.', error)
          return
        }
      }
      const payload = {
        command: {
          id: command.id,
          params: serializedParams,
        },
      }
      props.ws?.sendMessage(props.sheetId, 'change', payload, props.userId, props.userName)
    }
  }) as any

  addCollaborationDisposer(commandDisposer)

  const workbook = fUniver.value.getActiveWorkbook()
  const selectionDisposer = workbook?.onSelectionChange(selection => {
    props.ws?.sendMessage(
      props.sheetId,
      'cursor',
      {
        userId: props.userId,
        userName: props.userName,
        selection,
      },
      props.userId,
      props.userName,
    )
  }) as any

  addCollaborationDisposer(selectionDisposer)
}

function addCollaborationDisposer(disposer: any) {
  if (!disposer) return
  if (typeof disposer === 'function') {
    collaborationDisposers.push(disposer)
  } else if (typeof disposer.dispose === 'function') {
    collaborationDisposers.push(() => disposer.dispose())
  }
}

function cleanupCollaboration() {
  while (collaborationDisposers.length) {
    const dispose = collaborationDisposers.pop()
    try {
      dispose?.()
    } catch (error) {
      console.error('Error cleaning collaboration handler:', error)
    }
  }
}

watch(
  () => props.data,
  async next => {
    if (!next) {
      if (!fUniver.value) {
        init(DEFAULT_WORKBOOK_DATA)
      }
      return
    }

    if (!fUniver.value) {
      init(next)
      return
    }

    await setData(next)
  },
  { immediate: true },
)

watch(
  () => props.ws,
  newWs => {
    if (newWs && fUniver.value) {
      scheduleCollaboration()
    }
  },
  { immediate: false },
)

onBeforeUnmount(() => {
  destroyUniver()
})

function init(data: IWorkbookData | null) {
  try {
    activeWorkbook.value = null
    const api = setupUniver(data || DEFAULT_WORKBOOK_DATA)
    if (api) {
      emit('univerRefChange', api)
    }
  } catch (error) {
    console.error('Error initializing Univer:', error)
  }
}

function destroyUniver() {
  try {
    cleanupCollaboration()
    if (fUniver.value) {
      fUniver.value.dispose()
      fUniver.value = null
    }
    if (univerRef.value) {
      toRaw(univerRef.value)?.dispose()
      univerRef.value = null
    }
    activeWorkbook.value = null
  } catch (error) {
    console.error('Error destroying Univer:', error)
  }
}

async function getData() {
  try {
    const workbook = fUniver.value?.getActiveWorkbook()
    if (!workbook) {
      return null
    }
    if (typeof (workbook as any).save === 'function') {
      return await (workbook as any).save()
    }
    if (typeof (workbook as any).getSnapshot === 'function') {
      return (workbook as any).getSnapshot()
    }
    return null
  } catch (error) {
    console.error('Error getting data:', error)
    return null
  }
}

async function setData(data: IWorkbookData) {
  try {
    if (!fUniver.value) {
      init(data)
      return await getData()
    }

    let workbook = fUniver.value.getActiveWorkbook()
    if (!workbook) {
      workbook = fUniver.value.createWorkbook(data, { makeCurrent: true })
      activeWorkbook.value = workbook
      scheduleCollaboration()
      return await getData()
    }

    if (typeof (workbook as any).fromJSON === 'function') {
      await (workbook as any).fromJSON(data)
    } else {
      workbook = fUniver.value.createWorkbook(data, { makeCurrent: true })
      activeWorkbook.value = workbook
      scheduleCollaboration()
    }

    return await getData()
  } catch (error) {
    console.error('Error setting data:', error)
    return null
  }
}

function setName(n: string) {
  try {
    const workbook = fUniver.value?.getActiveWorkbook()
    if (!workbook) {
      throw new Error('Workbook is not initialized')
    }
    workbook.setName(n)
    return n
  } catch (error) {
    console.error('Error setting name:', error)
    return null
  }
}

defineExpose({
  getData,
  setName,
  setData,
  fUniver,
})
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