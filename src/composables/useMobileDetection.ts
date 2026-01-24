import { ref, onMounted, onUnmounted } from 'vue'

export interface MobileDetectionOptions {
  breakpoint?: number
  initialWidth?: number
}

export function useMobileDetection(options: MobileDetectionOptions = {}) {
  const {
    breakpoint = 1024,
    initialWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  } = options

  const isMobile = ref(initialWidth < breakpoint)

  const handleResize = () => {
    if (typeof window !== 'undefined') {
      isMobile.value = window.innerWidth < breakpoint
    }
  }

  onMounted(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    isMobile,
    breakpoint,
    handleResize
  }
}
