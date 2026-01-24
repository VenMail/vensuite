import { ref } from 'vue'
import { useFileStore } from '@/store/files'
import { toast } from '@/composables/useToast'

export function useMobileFileManager() {
  const fileStore = useFileStore()

  // Mobile UI state
  const showMobileSearch = ref(false)
  const activeMobileTab = ref<'files' | 'recent' | 'search' | 'settings'>('files')
  const isRefreshing = ref(false)
  const hasMoreFiles = ref(false)
  const showFab = ref(true)

  // Mobile search state (separate from desktop)
  const mobileSearchQuery = ref("")

  // Share functionality
  const handleShareFile = async (fileId: string) => {
    try {
      const file = fileStore.allFiles.find(item => item.id === fileId)
      if (!file) {
        toast.error('File not found')
        return
      }

      const shareUrl = file.file_public_url || file.download_url || file.file_url
      if (!shareUrl) {
        toast.info('This file does not have a shareable link yet')
        return
      }

      // Try native share first (mobile)
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ 
          title: file.title, 
          text: `Check out this file: ${file.title}`,
          url: shareUrl 
        })
        toast.success('File shared successfully')
        return
      }

      // Fallback to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard')
        return
      }

      // Last resort fallback
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast.success('Link copied to clipboard')
    } catch (error) {
      console.error('Share failed:', error)
      toast.error('Failed to share file')
    }
  }

  // Mobile-specific handlers
  const handleMobileRefresh = async (refreshFn: () => Promise<void>) => {
    isRefreshing.value = true
    try {
      await refreshFn()
      toast.success('Files refreshed')
    } catch (error) {
      toast.error('Failed to refresh files')
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
        // Handle settings navigation
        toast.info('Settings coming soon')
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
    action: 'delete' | 'share' | 'open'
    openFileFn: (id: string) => Promise<void>
    deleteFileFn: (ids: string[]) => Promise<void>
  }) => {
    switch (action) {
      case 'open':
        await openFileFn(fileId)
        break
      case 'share':
        await handleShareFile(fileId)
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
          // Default implementation - could be extended to load more files from API
          console.log('Load more files...')
          hasMoreFiles.value = false // Prevent further calls until implemented
        }
      } catch (error) {
        toast.error('Failed to load more files')
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
