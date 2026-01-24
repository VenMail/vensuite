import { defineStore } from 'pinia'
import { useMobileDetection } from '@/composables/useMobileDetection'

export const useSidebarStore = defineStore('sidebar', {
  state: () => {
    const { isMobile } = useMobileDetection({ breakpoint: 1024 })
    return {
      isVisible: isMobile.value ? false : true,
      isCollapsed: isMobile.value ? true : false,
    }
  },
  actions: {
    setVisible(v: boolean) {
      this.isVisible = v
    },
    toggleVisible() {
      this.isVisible = !this.isVisible
    },
    setCollapsed(v: boolean) {
      this.isCollapsed = v
    },
    toggleCollapsed() {
      this.isCollapsed = !this.isCollapsed
    },
    enforceMobileDefaults() {
      this.isVisible = false
      this.isCollapsed = true
    },
    enforceDesktopDefaults() {
      this.isVisible = true
      this.isCollapsed = false
    },
  },
})