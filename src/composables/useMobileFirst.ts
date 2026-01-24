import { ref, computed, onMounted, onUnmounted } from 'vue'

// Mobile-first breakpoint system (2026 best practices)
export const BREAKPOINTS = {
  xs: '375px',    // Small phones
  sm: '640px',    // Large phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small desktops
  xl: '1280px',   // Desktops
  '2xl': '1536px' // Large desktops
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export function useMobileFirst() {
  const windowWidth = ref(0)

  const updateWidth = () => {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  // Mobile-first breakpoint detection
  const isXs = computed(() => windowWidth.value < 640)
  const isSm = computed(() => windowWidth.value >= 640 && windowWidth.value < 768)
  const isMd = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024)
  const isLg = computed(() => windowWidth.value >= 1024 && windowWidth.value < 1280)
  const isXl = computed(() => windowWidth.value >= 1280 && windowWidth.value < 1536)
  const is2Xl = computed(() => windowWidth.value >= 1536)

  // Mobile-first helpers
  const isMobile = computed(() => windowWidth.value < 768) // xs and sm
  const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024) // md
  const isDesktop = computed(() => windowWidth.value >= 1024) // lg and up

  // Touch device detection
  const isTouchDevice = computed(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  // Responsive grid columns for file items
  const gridCols = computed(() => {
    if (isXs.value) return 1
    if (isSm.value) return 2
    if (isMd.value) return 3
    if (isLg.value) return 4
    return 5
  })

  // Thumbnail grid columns
  const thumbnailCols = computed(() => {
    if (isXs.value) return 2
    if (isSm.value) return 3
    if (isMd.value) return 4
    if (isLg.value) return 5
    return 6
  })

  // Touch-friendly sizing
  const touchTargetSize = computed(() => {
    // Minimum 44px for accessibility (iOS/Android guidelines)
    return isMobile.value ? '44px' : '32px'
  })

  // Spacing system based on viewport
  const spacing = computed(() => {
    if (isMobile.value) {
      return {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem'
      }
    }
    return {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    }
  })

  // Typography scaling
  const fontSize = computed(() => {
    if (isXs.value) {
      return {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    }
    if (isSm.value) {
      return {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    }
    return {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    }
  })

  return {
    // Raw values
    windowWidth,
    
    // Breakpoint booleans
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    
    // Device categories
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    
    // Responsive helpers
    gridCols,
    thumbnailCols,
    touchTargetSize,
    spacing,
    fontSize,
    
    // Constants
    BREAKPOINTS
  }
}
