/**
 * Type shims for PPTist internals.
 * Suppresses vendor-prefixed DOM API errors and NodeJS/browser Timeout conflicts.
 */

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
