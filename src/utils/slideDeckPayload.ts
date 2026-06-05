import { cloneAvnacPlain, type AvnacDocumentV1 } from '@avnac/lib/avnac-document'

export interface MigratedDeckPayload {
  slides: AvnacDocumentV1[]
  notes: string[]
  title: string
}

function parseRawDeckPayload(rawContent: unknown): unknown {
  if (!rawContent) return null
  if (typeof rawContent !== 'string') return rawContent
  try {
    return JSON.parse(rawContent)
  } catch {
    return null
  }
}

function isValidAvnacDocument(value: unknown): value is AvnacDocumentV1 {
  if (!value || typeof value !== 'object') return false
  const doc = value as Partial<AvnacDocumentV1>
  return (
    !!doc.artboard &&
    typeof doc.artboard.width === 'number' &&
    typeof doc.artboard.height === 'number' &&
    !!doc.fabric &&
    typeof doc.fabric === 'object'
  )
}

export function migrateDeckPayload(rawContent: unknown): MigratedDeckPayload {
  const fallback: MigratedDeckPayload = { slides: [], notes: [], title: '' }
  const parsed = parseRawDeckPayload(rawContent)
  if (!parsed || typeof parsed !== 'object') return fallback

  const payload = parsed as Record<string, unknown>
  let slidesIn: unknown[] = []
  if (Array.isArray(payload.slides)) slidesIn = payload.slides
  else if (Array.isArray(payload.documents)) slidesIn = payload.documents
  else if (Array.isArray(parsed)) slidesIn = parsed

  const slides = slidesIn
    .filter(isValidAvnacDocument)
    .map((slide) => cloneAvnacPlain(slide))

  const notes = Array.isArray(payload.notes)
    ? payload.notes.map((note) => (typeof note === 'string' ? note : ''))
    : []

  while (notes.length < slides.length) notes.push('')
  if (notes.length > slides.length) notes.length = slides.length

  return {
    slides,
    notes,
    title: typeof payload.title === 'string' ? payload.title : '',
  }
}
