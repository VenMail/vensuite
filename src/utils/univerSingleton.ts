import type { IWorkbookData } from '@univerjs/core'

// Global singleton instance with module-level lock
let globalUniverAPI: any = null
let globalUniverInstance: any = null
let isInitializing = false
let initPromise: Promise<any> | null = null
let initCount = 0
let activeComponentCount = 0
let initializationError: Error | null = null

// Queue for pending initialization requests
const pendingQueue: Array<(api: any) => void> = []

// Module-level flag to prevent double initialization
let moduleInitialized = false

/**
 * Register a component (track active components)
 */
export function registerComponent(): string {
  activeComponentCount++
  return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Unregister a component and dispose global instance if last one
 */
export function unregisterComponent() {
  activeComponentCount--
  if (activeComponentCount <= 0) {
    disposeGlobalUniver()
    activeComponentCount = 0
  }
}

/**
 * Get or create the global Univer instance (singleton pattern)
 */
export async function getOrCreateUniver(container: HTMLElement, data: IWorkbookData): Promise<any> {
  // Return cached error if initialization failed before
  if (initializationError) {
    throw initializationError
  }

  // If we already have an instance, return it
  if (globalUniverAPI && globalUniverInstance) {
    console.log('Reusing existing Univer instance')
    // Create a new workbook for this component
    const workbook = globalUniverAPI.createWorkbook(data)
    return { univer: globalUniverInstance, workbook, univerAPI: globalUniverAPI }
  }

  // If currently initializing, wait for it
  if (isInitializing && initPromise) {
    console.log('Waiting for Univer initialization...')
    try {
      return await initPromise
    } catch (error) {
      initializationError = error as Error
      throw error
    }
  }

  // Prevent multiple initializations at module level
  if (moduleInitialized) {
    console.warn('Univer already attempted to initialize, waiting for completion...')
    // Wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 100))
    if (globalUniverAPI && globalUniverInstance) {
      const workbook = globalUniverAPI.createWorkbook(data)
      return { univer: globalUniverInstance, workbook, univerAPI: globalUniverAPI }
    }
  }

  // Start initialization
  if (!isInitializing) {
    isInitializing = true
    moduleInitialized = true
    initCount++
    console.log(`Starting Univer initialization ${initCount}`)

    initPromise = initializeUniver(container, data)
    
    try {
      const result = await initPromise
      initializationError = null
      return result
    } catch (error) {
      initializationError = error as Error
      throw error
    } finally {
      isInitializing = false
      initPromise = null
    }
  }

  // Fallback (shouldn't reach here)
  throw new Error('Failed to initialize Univer')
}

/**
 * Initialize the global Univer instance
 */
async function initializeUniver(container: HTMLElement, data: IWorkbookData): Promise<any> {
  try {
    console.log('🚀 Starting Univer initialization with container:', container)
    console.log('📊 Initial data:', data)
    
    // Dynamic import all UniverJS modules to prevent immediate DI registration
    const [
      { createUniver, defaultTheme, LocaleType, mergeLocales },
      { UniverSheetsCorePreset },
      UniverPresetSheetsCoreEnUS,
      // Import UI locales for proper font family names and UI text
      UniverUIEnUS,
      UniverSheetsUIEnUS
    ] = await Promise.all([
      import('@univerjs/presets'),
      import('@univerjs/preset-sheets-core'),
      import('@univerjs/preset-sheets-core/locales/en-US'),
      import('@univerjs/ui/lib/locale/en-US').catch(() => {
        console.warn('Univer UI locale not found, font names may not be localized')
        return null
      }),
      import('@univerjs/sheets-ui/lib/locale/en-US').catch(() => {
        console.warn('Univer Sheets UI locale not found')
        return null
      })
    ])

    console.log('✅ All UniverJS modules loaded dynamically')
    console.log('🏗️ Creating Univer instance...')

    // Merge locales properly for complete localization using mergeLocales
    const locales = [UniverPresetSheetsCoreEnUS]
    if (UniverUIEnUS) locales.push(UniverUIEnUS)
    if (UniverSheetsUIEnUS) locales.push(UniverSheetsUIEnUS)
    
    const mergedLocales = {
      enUS: mergeLocales(...locales)
    }

    console.log('🌍 Locales merged with', locales.length, 'packets')

    // Create Univer instance using preset with proper locales
    const univer = createUniver({
      locale: LocaleType.EN_US,
      locales: mergedLocales,
      theme: defaultTheme,
      presets: [
        UniverSheetsCorePreset({
          container: container,
        }),
      ],
    })

    console.log('✅ Univer instance created')
    
    globalUniverInstance = univer
    globalUniverAPI = univer.univerAPI

    console.log('✅ Global Univer instance stored')

    // Create workbook for the initial request
    const workbook = globalUniverAPI.createWorkbook(data)
    console.log('✅ Workbook created')

    // Process any pending requests
    pendingQueue.forEach(callback => callback(globalUniverAPI))
    pendingQueue.length = 0

    console.log('🎉 Univer initialization completed successfully')

    return { univer: univer, workbook, univerAPI: globalUniverAPI }
  } catch (error) {
    console.error('❌ Error initializing global Univer:', error)
    globalUniverInstance = null
    globalUniverAPI = null
    throw error
  }
}

/**
 * Reset the singleton (for debugging or error recovery)
 */
export function resetUniverSingleton() {
  console.log('Resetting Univer singleton...')
  globalUniverInstance = null
  globalUniverAPI = null
  isInitializing = false
  initPromise = null
  initializationError = null
  moduleInitialized = false
  activeComponentCount = 0
  initCount = 0
  pendingQueue.length = 0
}

/**
 * Dispose the global Univer instance (only when last component unmounts)
 */
export function disposeGlobalUniver() {
  if (globalUniverInstance && globalUniverAPI) {
    try {
      if (typeof globalUniverAPI.dispose === 'function') {
        globalUniverAPI.dispose()
      }
    } catch (e) {
      console.warn('Failed to dispose global Univer API:', e)
    }
    
    globalUniverInstance = null
    globalUniverAPI = null
    console.log('Global Univer instance disposed')
  }
}

/**
 * Check if global Univer instance exists
 */
export function hasGlobalUniver(): boolean {
  return !!(globalUniverInstance && globalUniverAPI)
}

/**
 * Get active component count
 */
export function getActiveComponentCount(): number {
  return activeComponentCount
}
