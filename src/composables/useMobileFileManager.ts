import { ref } from 'vue'
import { toast } from '@/composables/useToast'
import { t } from '@/i18n';

export function useMobileFileManager() {
  // Mobile UI state
  const showMobileSearch = ref(false)
  const activeMobileTab = ref<'files' | 'recent' | 'search' | 'settings'>('files')
  const isRefreshing = ref(false)
  const hasMoreFiles = ref(false)
  const showFab = ref(true)

  // Mobile search state (separate from desktop)
  const mobileSearchQuery = ref("")

  // Mobile-specific handlers
  const handleMobileRefresh = async (refreshFn: () => Promise<void>) => {
    isRefreshing.value = true
    try {
      await refreshFn()
      toast.success('Files refreshed')
    } catch (error) {
      toast.error(t('Composables.UseMobileFileManager.toast.failed_to_refresh_files'))
    } finally {
      isRefreshing.value = false
    }
  }

  const handleMobileTabNavigation = (tab: 'files' | 'recent' | 'search' | 'settings', setShowRecent: (show: boolean) => void) => {
    activeMobileTab.value = tab
    
    switch (tab) {
      case 'files':
        setShowRecent(false)
        break
      case 'recent':
        setShowRecent(true)
        break
      case 'search':
        showMobileSearch.value = true
        break
      case 'settings':
        setShowRecent(false)
        break
    }
  }

  const handleSwipeAction = async ({ 
    fileId, 
    action, 
    openFileFn, 
    deleteFileFn 
  }: { 
    fileId: string
    action: 'delete' | 'open'
    openFileFn: (id: string) => Promise<void>
    deleteFileFn: (ids: string[]) => Promise<void>
  }) => {
    switch (action) {
      case 'open':
        await openFileFn(fileId)
        break
      case 'delete':
        await deleteFileFn([fileId])
        break
    }
  }

  const handleLoadMore = async (loadMoreFn?: () => Promise<void>) => {
    if (hasMoreFiles.value && !isRefreshing.value) {
      isRefreshing.value = true
      try {
        if (loadMoreFn) {
          await loadMoreFn()
        } else {
          hasMoreFiles.value = false
        }
      } catch (error) {
        toast.error(t('Composables.UseMobileFileManager.toast.failed_to_load_more'))
      } finally {
        isRefreshing.value = false
      }
    }
  }

  const toggleMobileSearch = () => {
    showMobileSearch.value = !showMobileSearch.value
    if (!showMobileSearch.value) {
      mobileSearchQuery.value = ''
    }
  }

  const clearMobileSearch = () => {
    mobileSearchQuery.value = ''
    showMobileSearch.value = false
  }

  return {
    // Mobile UI state
    showMobileSearch,
    activeMobileTab,
    isRefreshing,
    hasMoreFiles,
    showFab,
    mobileSearchQuery,

    // Mobile actions
    handleMobileTabNavigation,
    handleSwipeAction,
    handleMobileRefresh,
    handleLoadMore,
    toggleMobileSearch,
    clearMobileSearch,
  }
}
