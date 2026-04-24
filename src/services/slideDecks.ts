/**
 * Slide Decks Service â€” PPTist-backed
 * Fetches SlideDeckSummary list from /api/v1/app-files (file_type: pptx).
 * Persistence (create/save) is handled directly by SlidesEditor via fileStore.
 */

import { ref, computed } from 'vue'
import { apiClient } from './apiClient'
import type { SlideDeckSummary, PPTistDeckPayload } from '@/types/slides'

const slideDecksCache = ref<Map<string, SlideDeckSummary>>(new Map())
const isLoadingList = ref(false)

function parseSummaryFromApiItem(item: any): SlideDeckSummary {
  let slideCount = 0
  let firstSlide

  if (item.content) {
    try {
      const payload: PPTistDeckPayload = typeof item.content === 'string'
        ? JSON.parse(item.content)
        : item.content
      if (payload?.version === 2 && Array.isArray(payload.slides)) {
        slideCount = payload.slides.length
        firstSlide = payload.slides[0]
      }
    } catch { /* non-fatal */ }
  }

  const shareBase = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin
  const shared = Boolean(item.sharing?.share_slug)

  return {
    id: item.id,
    title: item.name || item.title || 'Untitled Presentation',
    slideCount,
    lastModified: item.updated_at || item.created_at || '',
    privacyType: item.privacy_type ?? 1,
    shared,
    shareLink: shared ? `${shareBase}/slides/${item.id}` : undefined,
    thumbnail: item.thumbnail_url || undefined,
    firstSlide,
  }
}

/** Fetch all slide decks for the current user */
export async function fetchSlideDecks(): Promise<SlideDeckSummary[]> {
  if (isLoadingList.value) return Array.from(slideDecksCache.value.values())

  isLoadingList.value = true
  try {
    const response = await apiClient.get('/app-files', {
      params: { file_type: 'pptx', sort: 'updated_at', order: 'desc' },
    })

    const items: any[] = response.data?.data ?? response.data ?? []
    const decks = items.map(parseSummaryFromApiItem)

    slideDecksCache.value.clear()
    decks.forEach(d => slideDecksCache.value.set(d.id, d))
    return decks
  } catch (err) {
    console.error('[slideDecks] fetchSlideDecks failed:', err)
    return Array.from(slideDecksCache.value.values())
  } finally {
    isLoadingList.value = false
  }
}

/** Get a single deck summary (from cache or API) */
export async function fetchSlideDeck(deckId: string): Promise<SlideDeckSummary | null> {
  if (slideDecksCache.value.has(deckId)) return slideDecksCache.value.get(deckId)!

  try {
    const response = await apiClient.get(`/app-files/${deckId}`)
    const item = response.data?.data ?? response.data
    const deck = parseSummaryFromApiItem(item)
    slideDecksCache.value.set(deck.id, deck)
    return deck
  } catch (err) {
    console.error(`[slideDecks] fetchSlideDeck(${deckId}) failed:`, err)
    return null
  }
}

/** Create a new empty deck via the API and return its summary */
export async function createSlideDeck(title: string = 'New Presentation'): Promise<SlideDeckSummary | null> {
  try {
    const payload: PPTistDeckPayload = {
      version: 2,
      title,
      slides: [],
    }
    const response = await apiClient.post('/app-files', {
      name: title,
      file_type: 'pptx',
      content: JSON.stringify(payload),
      privacy_type: 1,
    })
    const item = response.data?.data ?? response.data
    const deck = parseSummaryFromApiItem(item)
    slideDecksCache.value.set(deck.id, deck)
    return deck
  } catch (err) {
    console.error('[slideDecks] createSlideDeck failed:', err)
    return null
  }
}

/** Generate a simple thumbnail data-URL from the deck title (placeholder) */
export function getDeckThumbnail(deck: SlideDeckSummary): string {
  if (deck.thumbnail) return deck.thumbnail

  const colors = ['#d14424', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']
  const color = colors[deck.id.charCodeAt(0) % colors.length]
  const initials = deck.title
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
    <rect width="400" height="225" fill="${color}"/>
    <text x="200" y="130" font-family="system-ui" font-size="72" font-weight="700" fill="white" text-anchor="middle" opacity="0.9">${initials}</text>
    <text x="200" y="185" font-family="system-ui" font-size="14" fill="white" text-anchor="middle" opacity="0.7">${deck.slideCount} slide${deck.slideCount !== 1 ? 's' : ''}</text>
  </svg>`

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/** Reactive list of all cached decks */
export const slideDecks = computed(() => Array.from(slideDecksCache.value.values()))

/** Whether the list is currently loading */
export const isLoading = computed(() => isLoadingList.value)

/** Clear the in-memory cache */
export function clearSlideDecksCache(): void {
  slideDecksCache.value.clear()
}

export function getCachedSlideDecks(): SlideDeckSummary[] {
  return Array.from(slideDecksCache.value.values())
}