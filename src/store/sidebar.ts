import { defineStore } from 'pinia'

export const useSidebarStore = defineStore('sidebar', {
  state: () => ({
    isVisible: true,
    isCollapsed: false,
  }),
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
  },
})