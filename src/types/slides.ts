import type { AvnacDocumentV1 } from '@avnac/lib/avnac-document'

export type { AvnacDocumentV1 }

/** Payload stored in the backend content field (version 3 = avnac JSON) */
export interface AvnacDeckPayload {
  version: 3
  title: string
  slides: AvnacDocumentV1[]
  notes?: string[]
  theme?: string
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
  firstSlide?: AvnacDocumentV1
}

export interface SlideImportStatus {
  isImporting: boolean
  lastError: string | null
  source?: 'pptx' | 'file'
}
