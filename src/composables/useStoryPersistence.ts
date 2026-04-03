/**
 * Story persistence composable
 * Handles save, load, autosave, and sharing operations for StoryTeller documents
 */
import { ref, onUnmounted, computed } from 'vue';
import { useFileStore } from '@/store/files';
import { useAuthStore } from '@/store/auth';
import { toast } from 'vue-sonner';
import axios from 'axios';
import type { FileData, DocumentMetadata } from '@/types';
import {
  createDefaultDocument,
  type StoryDocument,
} from '@/types/story';
import type { StoryEditorReturn } from './useStoryEditor';
import type { ShareMember, ShareLevel } from '@/utils/sharing';
import { parseSharingInfoString, serializeSharingInfoString } from '@/utils/sharing';

export interface UseStoryPersistenceOptions {
  editor: StoryEditorReturn;
  autosaveDelay?: number;
}

export interface StoryData {
  title: string;
  themeId: string;
  scenes: StoryDocument['scenes'];
  settings: StoryDocument['settings'];
  version: number;
}

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;

export function useStoryPersistence(options: UseStoryPersistenceOptions) {
  const { editor, autosaveDelay = 3000 } = options;
  const fileStore = useFileStore();

  // State
  const storyId = ref<string | null>(null);
  const storyTitle = ref('Untitled Story');
  const isSaving = ref(false);
  const isLoading = ref(false);
  const hasUnsavedChanges = ref(false);
  const lastSavedAt = ref<Date | null>(null);
  const autosaveDebounce = ref<NodeJS.Timeout | null>(null);
  const hasUserMadeChanges = ref(false);
  const saveQueue = ref<((value: boolean) => void)[]>([]);

  // Sharing state
  const shareLink = ref('');
  const privacyType = ref(7);
  const shareMembers = ref<ShareMember[]>([]);
  const isOffline = ref(!navigator.onLine);

  // Auth store for user info
  const authStore = useAuthStore();

  // Computed properties
  const canShare = computed(() => authStore.isAuthenticated && storyId.value);
  const shareLinkDoc = computed(() => {
    if (!storyId.value) return '';
    const baseUrl = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;
    return `${baseUrl}/stories/${storyId.value}`;
  });

  // ─── Network Status Handlers ────────────────────────────────────────
  function setOnline() {
    isOffline.value = false;
    if (hasUnsavedChanges.value) {
      persistStory().catch(err => console.warn('Reconnect save failed:', err));
    }
  }

  function setOffline() {
    isOffline.value = true;
    cancelAutosave();
  }

  // ─── Mark Dirty & Autosave ──────────────────────────────────────────
  function markDirty() {
    hasUnsavedChanges.value = true;

    if (!hasUserMadeChanges.value) {
      hasUserMadeChanges.value = true;

      // Auto-guess title from document if still untitled
      if (storyTitle.value === 'Untitled Story') {
        const guessedTitle = guessTitleFromDocument();
        if (guessedTitle && guessedTitle !== 'Untitled Story') {
          storyTitle.value = guessedTitle;
          toast.info(`Auto-detected title: "${guessedTitle}"`);
        }
      }
    }

    scheduleAutosave();
  }

  // ─── Persist Story ──────────────────────────────────────────────────
  async function persistStory(): Promise<boolean> {
    if (isSaving.value) {
      return new Promise<boolean>((resolve) => {
        saveQueue.value.push(resolve);
      });
    }

    try {
      isSaving.value = true;

      const wasNewStory = !storyId.value || storyId.value === 'new';

      const storyDocument: StoryDocument = editor.document.value;

      // Synchronise the document title with the persistence title
      storyDocument.title = storyTitle.value;

      const storyData: StoryData = {
        title: storyTitle.value,
        themeId: storyDocument.theme.id,
        scenes: storyDocument.scenes,
        settings: storyDocument.settings,
        version: storyDocument.version,
      };

      // Get existing document if we have a real ID, otherwise create new
      let existingDoc: FileData | null = null;
      if (storyId.value && storyId.value !== 'new') {
        existingDoc = await fileStore.loadDocument(storyId.value, 'story');
      }

      const filePayload: FileData = existingDoc
        ? {
            ...existingDoc,
            content: JSON.stringify(storyData),
            metadata: {
              ...existingDoc.metadata,
              scene_count: storyDocument.scenes.length,
              theme_id: storyDocument.theme.id,
            } as DocumentMetadata,
            last_viewed: new Date(),
          }
        : {
            title: storyTitle.value,
            file_type: 'story',
            content: JSON.stringify(storyData),
            metadata: {
              scene_count: storyDocument.scenes.length,
              theme_id: storyDocument.theme.id,
            } as DocumentMetadata,
            is_folder: false,
            last_viewed: new Date(),
          };

      const result = await fileStore.saveDocument(filePayload as any);

      if (result.document?.id) {
        storyId.value = result.document.id;

        if (result.shouldRedirect && result.redirectId) {
          storyId.value = result.redirectId;
        }

        // Handle reload for new stories
        if (wasNewStory && storyId.value && storyId.value !== 'new') {
          setTimeout(() => {
            window.location.href = `/stories/${storyId.value}`;
          }, 100);
        }
      }

      hasUnsavedChanges.value = false;
      lastSavedAt.value = new Date();

      // Process any queued saves
      if (saveQueue.value.length > 0) {
        const queued = saveQueue.value.splice(0);
        queued.forEach(resolve => resolve(true));
      }

      return true;
    } catch (error) {
      console.error('Failed to save story:', error);
      toast.error('Failed to save story');

      if (saveQueue.value.length > 0) {
        const queued = saveQueue.value.splice(0);
        queued.forEach(resolve => resolve(false));
      }

      return false;
    } finally {
      isSaving.value = false;
    }
  }

  function scheduleAutosave() {
    if (autosaveDebounce.value) {
      clearTimeout(autosaveDebounce.value);
    }

    autosaveDebounce.value = setTimeout(() => {
      if (hasUnsavedChanges.value && !isSaving.value) {
        persistStory().catch(err => console.warn('Autosave failed:', err));
      }
    }, Math.max(autosaveDelay, 1000));
  }

  function cancelAutosave() {
    if (autosaveDebounce.value) {
      clearTimeout(autosaveDebounce.value);
      autosaveDebounce.value = null;
    }
  }

  // ─── Load Story ─────────────────────────────────────────────────────
  async function loadStory(id: string): Promise<boolean> {
    try {
      isLoading.value = true;

      const file = await fileStore.loadDocument(id, 'story');
      if (!file) {
        throw new Error('Story not found');
      }

      storyId.value = file.id || id;
      storyTitle.value = file.title || 'Untitled Story';

      if (file.content) {
        try {
          const data: StoryData = JSON.parse(file.content);
          const doc: StoryDocument = {
            id: storyId.value || crypto.randomUUID(),
            title: storyTitle.value,
            scenes: data.scenes || createDefaultDocument().scenes,
            theme: editor.document.value.theme, // preserve current theme
            settings: data.settings || editor.document.value.settings,
            version: data.version || 1,
          };

          // Apply theme from metadata if available
          if (file.metadata?.theme_id) {
            doc.theme = { ...doc.theme, id: file.metadata.theme_id as string };
          }

          editor.setDocument(doc);
        } catch {
          editor.setDocument(createDefaultDocument(storyTitle.value));
        }
      } else {
        editor.setDocument(createDefaultDocument(storyTitle.value));
      }

      hasUnsavedChanges.value = false;
      lastSavedAt.value = new Date();
      hasUserMadeChanges.value = false;

      await hydrateSharing(id);
      return true;
    } catch (error) {
      console.error('Failed to load story:', error);
      toast.error('Failed to load story');
      editor.setDocument(createDefaultDocument());
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // ─── Sharing ────────────────────────────────────────────────────────
  async function hydrateSharing(id: string) {
    try {
      const file = await fileStore.loadDocument(id, 'story') as any;
      if (file) {
        shareLink.value = file.file_public_url || shareLinkDoc.value;
        privacyType.value = Number(file.privacy_type ?? 7);

        if (file.sharing_info) {
          const sharing = parseSharingInfoString(file.sharing_info);
          shareMembers.value = (sharing as any).members || [];
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate sharing:', error);
    }
  }

  async function updateVisibility(value: number): Promise<boolean> {
    if (!storyId.value) {
      toast.info('Save the story first');
      return false;
    }
    try {
      const payload: any = { privacy_type: value };
      if (shareMembers.value.length > 0) {
        payload.sharing_info = serializeSharingInfoString({
          members: shareMembers.value,
          level: value as unknown as ShareLevel,
        } as any);
      }

      await axios.patch(`${FILES_ENDPOINT}/${storyId.value}`, payload, {
        headers: { Authorization: `Bearer ${fileStore.getToken()}` },
      });
      privacyType.value = value;
      toast.success('Visibility updated');
      return true;
    } catch (error) {
      console.error('Failed to update visibility:', error);
      toast.error('Failed to update visibility');
      return false;
    }
  }

  // ─── Title ──────────────────────────────────────────────────────────
  function setTitle(title: string) {
    storyTitle.value = title;
    markDirty();
  }

  function guessTitleFromDocument(): string {
    const doc = editor.document.value;
    if (!doc || !doc.scenes || doc.scenes.length === 0) {
      return 'Untitled Story';
    }

    const firstScene = doc.scenes[0];

    // Look through blocks for a heading block
    for (const block of firstScene.blocks) {
      if (block.type === 'heading' || block.type === 'text') {
        const content = block.content as { html?: string };
        if (content.html) {
          // Strip HTML tags and get text
          const text = content.html.replace(/<[^>]+>/g, '').trim();
          if (text.length > 0 && text.length < 80) {
            return text;
          }
        }
      }
    }

    // Fallback to scene name if it's not the default
    if (firstScene.name && firstScene.name !== 'Untitled Scene' && firstScene.name !== 'Scene 1') {
      return firstScene.name;
    }

    return 'Untitled Story';
  }

  // ─── Initialize New Story ───────────────────────────────────────────
  function initializeNewStory(initialDocument?: StoryDocument) {
    storyId.value = 'new';

    if (initialDocument) {
      editor.setDocument(initialDocument);
    }

    const guessedTitle = guessTitleFromDocument();
    if (guessedTitle && guessedTitle !== 'Untitled Story') {
      storyTitle.value = guessedTitle;
      toast.info(`Auto-detected title: "${guessedTitle}"`);
    }

    hasUserMadeChanges.value = false;
    hasUnsavedChanges.value = false;
  }

  // ─── Network Listeners ──────────────────────────────────────────────
  function setupNetworkListeners() {
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
  }

  function cleanupNetworkListeners() {
    window.removeEventListener('online', setOnline);
    window.removeEventListener('offline', setOffline);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────
  onUnmounted(() => {
    cancelAutosave();
    cleanupNetworkListeners();
  });

  return {
    // State
    storyId,
    storyTitle,
    isSaving,
    isLoading,
    hasUnsavedChanges,
    lastSavedAt,
    isOffline,

    // Sharing
    shareLink,
    privacyType,
    shareMembers,
    canShare,
    shareLinkDoc,
    hasUserMadeChanges,

    // Core operations
    markDirty,
    persistStory,
    loadStory,
    setTitle,
    updateVisibility,

    // Lifecycle
    setupNetworkListeners,
    cleanupNetworkListeners,
    cancelAutosave,

    // Sharing operations
    hydrateSharing,

    // Title guessing
    guessTitleFromDocument,

    // Initialize new story
    initializeNewStory,
  };
}

export type StoryPersistenceReturn = ReturnType<typeof useStoryPersistence>;
