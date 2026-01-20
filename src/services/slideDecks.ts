/**
 * Slide Decks Service
 * Manages fetching and caching of slide deck data from the API
 */

import { ref, computed } from 'vue';
import { apiClient } from './apiClient';
import type { SlidevSlide } from '@/utils/slidevMarkdown';
import { generateDeckThumbnail, createPlaceholderThumbnail } from '@/utils/thumbnailGenerator';

export interface SlideDeck {
  id: string;
  title: string;
  theme: string;
  slides: SlidevSlide[];
  thumbnail?: string;
  slideCount: number;
  lastModified: string;
  shared: boolean;
  privacyType: number;
  shareLink?: string;
}

export interface SlideDeckListResponse {
  data: SlideDeck[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

// Cache for slide decks
const slideDecksCache = ref<Map<string, SlideDeck>>(new Map());
const loadingDecks = ref<Set<string>>(new Set());
const isLoadingList = ref(false);

/**
 * Fetch all slide decks for the current user
 */
export async function fetchSlideDecks(): Promise<SlideDeck[]> {
  if (isLoadingList.value) return [];
  
  isLoadingList.value = true;
  
  try {
    console.log('🔍 Fetching slide decks - trying multiple approaches...');
    
    // Try multiple approaches to find slide decks
    let allItems: any[] = [];
    let fetchMethods: string[] = [];
    
    // Method 1: Try file_type: 'slides'
    try {
      console.log('🔄 Trying file_type: slides');
      const response1 = await apiClient.get('/app-files', {
        params: {
          file_type: 'slides',
          sort: 'updated_at',
          order: 'desc'
        }
      });
      if (response1.data.data?.length > 0) {
        allItems.push(...response1.data.data);
        fetchMethods.push('file_type: slides');
      }
    } catch (error) {
      console.log('❌ file_type: slides failed');
    }
    
    // Method 2: Try file_type: 'pptx' (since slides are being saved as pptx)
    try {
      console.log('🔄 Trying file_type: pptx');
      const response2 = await apiClient.get('/app-files', {
        params: {
          file_type: 'pptx',
          sort: 'updated_at',
          order: 'desc'
        }
      });
      if (response2.data.data?.length > 0) {
        allItems.push(...response2.data.data);
        fetchMethods.push('file_type: pptx');
      }
    } catch (error) {
      console.log('❌ file_type: pptx failed');
    }
    
    // Method 3: Try type: 'slides'
    try {
      console.log('🔄 Trying type: slides');
      const response3 = await apiClient.get('/app-files', {
        params: {
          type: 'slides',
          sort: 'updated_at',
          order: 'desc'
        }
      });
      if (response3.data.data?.length > 0) {
        allItems.push(...response3.data.data);
        fetchMethods.push('type: slides');
      }
    } catch (error) {
      console.log('❌ type: slides failed');
    }
    
    // Method 4: Try type: 'pptx'
    try {
      console.log('🔄 Trying type: pptx');
      const response4 = await apiClient.get('/app-files', {
        params: {
          type: 'pptx',
          sort: 'updated_at',
          order: 'desc'
        }
      });
      if (response4.data.data?.length > 0) {
        allItems.push(...response4.data.data);
        fetchMethods.push('type: pptx');
      }
    } catch (error) {
      console.log('❌ type: pptx failed');
    }

    // Remove duplicates by ID
    const uniqueItems = allItems.filter((item, index, self) => 
      index === self.findIndex((t) => t.id === item.id)
    );

    console.log('📄 Combined results from methods:', fetchMethods.join(', '));
    console.log('📄 Total unique items found:', uniqueItems.length);
    console.log('📄 Items:', uniqueItems.map(item => ({
      id: item.id,
      title: item.title,
      file_type: item.file_type,
      hasContent: !!item.content,
      hasMetadata: !!item.metadata
    })));

    const decks: SlideDeck[] = uniqueItems.map((item: any) => {
      console.log('🔍 Processing item:', {
        id: item.id,
        title: item.title,
        file_type: item.file_type,
        hasContent: !!item.content,
        hasMetadata: !!item.metadata,
        metadataKeys: item.metadata ? Object.keys(item.metadata) : []
      });
      
      const slides = parseSlidesFromMetadata(item.metadata, item.content);
      console.log('📊 Parsed slides count:', slides.length, 'for item:', item.id);
      
      return {
        id: item.id,
        title: item.title || 'Untitled Presentation',
        theme: item.metadata?.theme || 'default',
        slides: slides,
        slideCount: slides.length,
        lastModified: item.updated_at,
        shared: item.sharing?.share_slug ? true : false,
        privacyType: item.privacy_type || 7,
        shareLink: item.sharing?.share_slug ? `${window.location.origin}/slides/${item.sharing.share_slug}` : undefined
      };
    });

    console.log('🎯 Final decks array:', decks);
    console.log('🎯 Number of decks processed:', decks.length);

    // Clear cache and update with fresh data
    slideDecksCache.value.clear();
    decks.forEach(deck => {
      slideDecksCache.value.set(deck.id, deck);
    });
    console.log('🗑️ Cache cleared and updated with', decks.length, 'decks');

    return decks;
  } catch (error) {
    console.error('Failed to fetch slide decks:', error);
    return [];
  } finally {
    isLoadingList.value = false;
  }
}

/**
 * Fetch a single slide deck by ID
 */
export async function fetchSlideDeck(deckId: string): Promise<SlideDeck | null> {
  if (slideDecksCache.value.has(deckId)) {
    return slideDecksCache.value.get(deckId)!;
  }

  if (loadingDecks.value.has(deckId)) {
    return null; // Skip for now, will be available later
  }

  loadingDecks.value.add(deckId);

  try {
    const response = await apiClient.get(`/app-files/${deckId}`);

    const item = response.data.data;
    const slides = parseSlidesFromMetadata(item.metadata, item.content);
    const deck: SlideDeck = {
      id: item.id,
      title: item.title || 'Untitled Presentation',
      theme: item.metadata?.theme || 'default',
      slides: slides,
      slideCount: slides.length,
      lastModified: item.updated_at,
      shared: item.sharing?.share_slug ? true : false,
      privacyType: item.privacy_type || 7,
      shareLink: item.sharing?.share_slug ? `${window.location.origin}/slides/${item.sharing.share_slug}` : undefined
    };

    // Cache the result
    slideDecksCache.value.set(deckId, deck);

    return deck;
  } catch (error) {
    console.error(`Failed to fetch slide deck ${deckId}:`, error);
    return null;
  } finally {
    loadingDecks.value.delete(deckId);
  }
}

/**
 * Generate or get cached thumbnail for a slide deck
 */
export async function getDeckThumbnail(deck: SlideDeck): Promise<string> {
  // If deck already has a thumbnail URL, return it
  if (deck.thumbnail) {
    return deck.thumbnail;
  }

  // Try to generate a thumbnail from the first slide
  if (deck.slides.length > 0) {
    try {
      const thumbnail = await generateDeckThumbnail(deck.slides, deck.title, {
        width: 400,
        height: 300,
        scale: 0.5
      });

      if (thumbnail) {
        // Update deck with generated thumbnail
        deck.thumbnail = thumbnail;
        return thumbnail;
      }
    } catch (error) {
      console.warn('Failed to generate thumbnail for deck:', deck.id, error);
    }
  }

  // Fallback to placeholder
  return createPlaceholderThumbnail(deck.title, {
    width: 400,
    height: 300,
    color: '#3b82f6'
  });
}

/**
 * Parse slides from metadata or content
 */
function parseSlidesFromMetadata(metadata: any, content?: string): SlidevSlide[] {
  console.log('🔧 parseSlidesFromMetadata called with:', {
    hasMetadata: !!metadata,
    hasContent: !!content,
    metadataSlides: metadata?.slides,
    contentType: typeof content,
    contentPreview: content ? (content.length > 100 ? content.substring(0, 100) + '...' : content) : null
  });
  
  // First try to get from content (where persistence saves it)
  if (content) {
    try {
      const data: any = JSON.parse(content);
      console.log('📖 Parsed content data:', {
        hasSlides: !!data.slides,
        slidesType: typeof data.slides,
        slidesIsArray: Array.isArray(data.slides),
        slidesLength: data.slides?.length || 0,
        dataKeys: Object.keys(data)
      });
      
      if (data.slides && Array.isArray(data.slides)) {
        console.log('✅ Returning slides from content:', data.slides.length);
        return data.slides;
      }
    } catch (error) {
      console.warn('Failed to parse slides from content:', error);
    }
  }
  
  // For PPTX files, check if content contains slide data in different format
  if (content) {
    try {
      const data: any = JSON.parse(content);
      // Check if it's a slide deck structure (from persistence)
      if (data.title && data.theme && data.slides) {
        console.log('✅ Found slide deck structure in content:', data.slides.length);
        return data.slides;
      }
    } catch (error) {
      console.warn('Content is not JSON, checking for other formats...');
    }
  }
  
  // Fallback to metadata.slides
  if (!metadata || !metadata.slides) {
    console.log('❌ No metadata.slides found, checking for PPTX indicators...');
    
    // For PPTX files, create a default slide if we can't find any
    if (content && (content.includes('pptx') || content.includes('presentation'))) {
      console.log('🔄 PPTX file detected but no slides found, creating default slide');
      return [{
        id: 'slide-1-default',
        content: '# Untitled Presentation\n\nYour presentation content here',
        notes: '',
        frontmatter: {
          layout: 'default'
        }
      }];
    }
    
    return [];
  }

  console.log('🔄 Trying metadata.slides fallback:', {
    metadataSlidesType: typeof metadata.slides,
    metadataSlidesIsString: typeof metadata.slides === 'string',
    metadataSlidesIsArray: Array.isArray(metadata.slides)
  });

  try {
    if (typeof metadata.slides === 'string') {
      // Parse from JSON string
      const parsed = JSON.parse(metadata.slides);
      console.log('✅ Parsed metadata.slides from string:', parsed.length);
      return parsed;
    } else if (Array.isArray(metadata.slides)) {
      // Already parsed
      console.log('✅ Using metadata.slides array directly:', metadata.slides.length);
      return metadata.slides;
    }
  } catch (error) {
    console.warn('Failed to parse slides from metadata:', error);
  }

  console.log('❌ All parsing attempts failed, returning empty array');
  return [];
}

/**
 * Create a new slide deck
 */
export async function createSlideDeck(title: string, theme: string = 'default'): Promise<SlideDeck | null> {
  try {
    const response = await apiClient.post('/app-files', {
      title,
      type: 'slides',
      metadata: {
        theme,
        slides: createDefaultSlides(),
        slide_count: 1
      },
      privacy_type: 7
    });

    const item = response.data.data;
    const slides = parseSlidesFromMetadata(item.metadata, item.content);
    const deck: SlideDeck = {
      id: item.id,
      title: item.title || title,
      theme: item.metadata?.theme || theme,
      slides: slides,
      slideCount: slides.length,
      lastModified: item.updated_at,
      shared: false,
      privacyType: item.privacy_type || 7,
      shareLink: undefined
    };

    // Cache the result
    slideDecksCache.value.set(deck.id, deck);

    return deck;
  } catch (error) {
    console.error('Failed to create slide deck:', error);
    return null;
  }
}

/**
 * Create default slides for a new presentation
 */
function createDefaultSlides(): SlidevSlide[] {
  return [
    {
      id: 'slide-1-default',
      content: '# Welcome\n\nStart creating your presentation',
      notes: '',
      frontmatter: {
        layout: 'default'
      }
    }
  ];
}

/**
 * Update a slide deck
 */
export async function updateSlideDeck(deckId: string, updates: Partial<SlideDeck>): Promise<boolean> {
  try {
    const existingDeck = slideDecksCache.value.get(deckId);
    if (!existingDeck) return false;

    const payload: any = {
      title: updates.title || existingDeck.title,
      metadata: {
        theme: updates.theme || existingDeck.theme,
        slides: updates.slides || existingDeck.slides,
        slide_count: updates.slideCount || existingDeck.slideCount
      }
    };

    if (updates.privacyType !== undefined) {
      payload.privacy_type = updates.privacyType;
    }

    await apiClient.put(`/app-files/${deckId}`, payload);

    // Update cache
    const updatedDeck = { ...existingDeck, ...updates };
    slideDecksCache.value.set(deckId, updatedDeck);

    return true;
  } catch (error) {
    console.error(`Failed to update slide deck ${deckId}:`, error);
    return false;
  }
}

/**
 * Delete a slide deck
 */
export async function deleteSlideDeck(deckId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/app-files/${deckId}`);

    // Remove from cache
    slideDecksCache.value.delete(deckId);

    return true;
  } catch (error) {
    console.error(`Failed to delete slide deck ${deckId}:`, error);
    return false;
  }
}

/**
 * Get slide decks from cache
 */
export function getCachedSlideDecks(): SlideDeck[] {
  return Array.from(slideDecksCache.value.values());
}

/**
 * Get a specific slide deck from cache
 */
export function getCachedSlideDeck(deckId: string): SlideDeck | null {
  return slideDecksCache.value.get(deckId) || null;
}

/**
 * Clear slide decks cache
 */
export function clearSlideDecksCache(): void {
  slideDecksCache.value.clear();
}

/**
 * Computed properties for reactive access
 */
export const slideDecks = computed(() => getCachedSlideDecks());
export const isLoading = computed(() => isLoadingList.value);

/**
 * Preload thumbnails for multiple decks
 */
export async function preloadDeckThumbnails(decks: SlideDeck[]): Promise<void> {
  const promises = decks.slice(0, 10).map(deck => getDeckThumbnail(deck));
  await Promise.allSettled(promises);
}
