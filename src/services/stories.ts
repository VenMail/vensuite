/**
 * Stories Service
 * Manages fetching and caching of story data from the API
 */

import { ref, computed } from 'vue';
import { apiClient } from './apiClient';

const STORIES_DEBUG = Boolean(import.meta.env.DEV);
const logStoriesDebug = (...args: unknown[]) => {
  if (!STORIES_DEBUG) return;
  console.log(...args);
};

export interface StoryListItem {
  id: string;
  title: string;
  thumbnail?: string;
  sceneCount: number;
  lastModified: string;
  shared: boolean;
  privacyType: number;
  shareLink?: string;
}

export interface StoryListResponse {
  data: StoryListItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

// Cache for stories
const storiesCache = ref<Map<string, StoryListItem>>(new Map());
const loadingStories = ref<Set<string>>(new Set());
const isLoadingList = ref(false);

/**
 * Fetch all stories for the current user
 */
export async function fetchStories(): Promise<StoryListItem[]> {
  if (isLoadingList.value) return [];

  isLoadingList.value = true;

  try {
    logStoriesDebug('Fetching stories...');

    const response = await apiClient.get('/app-files', {
      params: {
        file_type: 'story',
        sort: 'updated_at',
        order: 'desc',
      },
    });

    const items: any[] = response.data.data || [];
    logStoriesDebug('Stories fetched:', items.length);

    const storyItems: StoryListItem[] = items.map((item: any) => {
      let sceneCount = 0;

      // Try to get scene count from metadata
      if (item.metadata?.scene_count) {
        sceneCount = Number(item.metadata.scene_count);
      } else if (item.content) {
        // Parse from content as fallback
        try {
          const data = JSON.parse(item.content);
          sceneCount = data.scenes?.length || 0;
        } catch {
          sceneCount = 0;
        }
      }

      return {
        id: item.id,
        title: item.title || 'Untitled Story',
        thumbnail: item.metadata?.thumbnail || undefined,
        sceneCount,
        lastModified: item.updated_at,
        shared: item.sharing?.share_slug ? true : false,
        privacyType: item.privacy_type || 7,
        shareLink: item.sharing?.share_slug
          ? `${window.location.origin}/stories/${item.sharing.share_slug}`
          : undefined,
      };
    });

    // Clear cache and update with fresh data
    storiesCache.value.clear();
    storyItems.forEach(story => {
      storiesCache.value.set(story.id, story);
    });
    logStoriesDebug('Cache updated with', storyItems.length, 'stories');

    return storyItems;
  } catch (error) {
    console.error('Failed to fetch stories:', error);
    return [];
  } finally {
    isLoadingList.value = false;
  }
}

/**
 * Fetch a single story by ID
 */
export async function fetchStory(storyId: string): Promise<StoryListItem | null> {
  if (storiesCache.value.has(storyId)) {
    return storiesCache.value.get(storyId)!;
  }

  if (loadingStories.value.has(storyId)) {
    return null;
  }

  loadingStories.value.add(storyId);

  try {
    const response = await apiClient.get(`/app-files/${storyId}`);
    const item = response.data.data;

    let sceneCount = 0;
    if (item.metadata?.scene_count) {
      sceneCount = Number(item.metadata.scene_count);
    } else if (item.content) {
      try {
        const data = JSON.parse(item.content);
        sceneCount = data.scenes?.length || 0;
      } catch {
        sceneCount = 0;
      }
    }

    const story: StoryListItem = {
      id: item.id,
      title: item.title || 'Untitled Story',
      thumbnail: item.metadata?.thumbnail || undefined,
      sceneCount,
      lastModified: item.updated_at,
      shared: item.sharing?.share_slug ? true : false,
      privacyType: item.privacy_type || 7,
      shareLink: item.sharing?.share_slug
        ? `${window.location.origin}/stories/${item.sharing.share_slug}`
        : undefined,
    };

    storiesCache.value.set(storyId, story);
    return story;
  } catch (error) {
    console.error(`Failed to fetch story ${storyId}:`, error);
    return null;
  } finally {
    loadingStories.value.delete(storyId);
  }
}

/**
 * Create a new story
 */
export async function createStory(title: string): Promise<StoryListItem | null> {
  try {
    const response = await apiClient.post('/app-files', {
      title,
      file_type: 'story',
      content: JSON.stringify({
        title,
        themeId: 'default',
        scenes: [],
        settings: {},
        version: 1,
      }),
      metadata: {
        scene_count: 0,
        theme_id: 'default',
      },
      privacy_type: 7,
    });

    const item = response.data.data;

    const story: StoryListItem = {
      id: item.id,
      title: item.title || title,
      sceneCount: 0,
      lastModified: item.updated_at,
      shared: false,
      privacyType: item.privacy_type || 7,
    };

    storiesCache.value.set(story.id, story);
    return story;
  } catch (error) {
    console.error('Failed to create story:', error);
    return null;
  }
}

/**
 * Delete a story
 */
export async function deleteStory(storyId: string): Promise<boolean> {
  try {
    await apiClient.post(`/app-files/${storyId}/trash`, {});
    storiesCache.value.delete(storyId);
    return true;
  } catch (error) {
    console.error(`Failed to delete story ${storyId}:`, error);
    return false;
  }
}

/**
 * Get stories from cache
 */
export function getCachedStories(): StoryListItem[] {
  return Array.from(storiesCache.value.values());
}

/**
 * Clear stories cache
 */
export function clearStoriesCache(): void {
  storiesCache.value.clear();
}

/**
 * Computed properties for reactive access
 */
export const stories = computed(() => getCachedStories());
export const isLoading = computed(() => isLoadingList.value);
