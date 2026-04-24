// Type shims for PPTist modules imported by vensuite.
// PPTist source is excluded from vensuite's tsconfig compile scope; this file
// provides opaque `any` stubs so vue-tsc can type-check vensuite without
// walking into the submodule.

declare module '@pptist/types/slides' {
  export type Slide = any
  export type SlideTheme = any
  export type PPTElement = any
  export type PPTAnimation = any
  export type SlideTemplate = any
  export type SlideBackground = any
  export type PPTTextElement = any
  export type PPTImageElement = any
  export type PPTShapeElement = any
  export type PPTLineElement = any
  export type PPTChartElement = any
  export type PPTTableElement = any
  export type PPTLatexElement = any
  export type PPTVideoElement = any
  export type PPTAudioElement = any
}

declare module '@pptist/store' {
  export const useMainStore: any
  export const useScreenStore: any
  export const useSnapshotStore: any
  export const useSlidesStore: any
  export const useKeyboardStore: any
}

declare module '@pptist/utils/database' {
  export const deleteDiscardedDB: any
  export const db: any
}

declare module '@pptist/configs/storage' {
  export const LOCALSTORAGE_KEY_DISCARDED_DB: any
}

declare module '@pptist/i18n' {
  export const i18n: any
  export const t: any
}

declare module '@pptist/directive' {
  const directive: any
  export default directive
}

declare module '@pptist/views/Editor/index.vue' {
  const component: any
  export default component
}

declare module '@pptist/views/Screen/index.vue' {
  const component: any
  export default component
}

// Catch-all for any remaining @pptist/* subpaths not enumerated above.
declare module '@pptist/*' {
  const mod: any
  export = mod
  export default mod
}

// Vendor-prefixed fullscreen API (used by PPTist's utils/fullscreen.ts)
interface HTMLElement {
  mozRequestFullScreen?(): Promise<void>
  webkitRequestFullScreen?(): Promise<void>
  msRequestFullscreen?(): Promise<void>
}

interface Document {
  mozCancelFullScreen?(): Promise<void>
  webkitExitFullscreen?(): Promise<void>
  msExitFullscreen?(): Promise<void>
  mozFullScreenElement?: Element | null
  webkitFullscreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitCurrentFullScreenElement?: Element | null
}
