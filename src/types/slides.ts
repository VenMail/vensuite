export type { Slide, SlideTheme, PPTElement, SlideBackground } from '@pptist/types/slides'

/** Payload stored in the backend `content` field (version 2 = PPTist JSON) */
export interface PPTistDeckPayload {
  version: 2
  title: string
  theme?: import('@pptist/types/slides').SlideTheme
  slides: import('@pptist/types/slides').Slide[]
}

/** Summary object used in the slide deck list view */
export interface SlideDeckSummary {
  id: string
  title: string
  slideCount: number
  lastModified: string
  privacyType: number
  shared: boolean
  shareLink?: string
  thumbnail?: string
  /** Raw first-slide data for thumbnail generation */
  firstSlide?: import('@pptist/types/slides').Slide
}

export interface SlideImportStatus {
  isImporting: boolean
  lastError: string | null
  source?: 'pptx' | 'file'
}
