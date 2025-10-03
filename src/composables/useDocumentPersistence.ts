import { ref, type Ref } from "vue";
import type { Router } from "vue-router";

import { useFileStore } from "@/store/files";
import type { FileData, SavePayload, SaveResponse, SaveTrigger } from "@/types";

export interface UseDocumentPersistenceOptions {
  router?: Router;
  /**
   * Optional ref that indicates whether the current document is read-only.
   * When true, save attempts resolve with a failure result.
   */
  readOnly?: Ref<boolean>;
  /** Callback invoked after a successful save with the persisted document. */
  onAfterSave?: (doc: FileData, context: { trigger: SaveTrigger; payload: SavePayload }) => void;
  /** Callback invoked when the server returns a new identifier for the document. */
  onRedirect?: (newId: string, doc: FileData) => Promise<void> | void;
}

export interface UseDocumentPersistenceState {
  currentDoc: Ref<FileData | null>;
  hasUnsavedChanges: Ref<boolean>;
  isSyncing: Ref<boolean>;
  lastSavedAt: Ref<Date | null>;
  lastSaveResult: Ref<SaveResponse | null>;
  lastTrigger: Ref<SaveTrigger | null>;
  setDocument: (doc: FileData | null, opts?: { markClean?: boolean }) => void;
  setLastSavedAt: (value: Date | null) => void;
  markDirty: () => void;
  syncChanges: (trigger?: SaveTrigger, payload?: SavePayload) => Promise<SaveResponse>;
}

export function useDocumentPersistence(
  options: UseDocumentPersistenceOptions = {}
): UseDocumentPersistenceState {
  const fileStore = useFileStore();

  const currentDoc = ref<FileData | null>(null);
  const hasUnsavedChanges = ref(false);
  const isSyncing = ref(false);
  const lastSavedAt = ref<Date | null>(null);
  const lastSaveResult = ref<SaveResponse | null>(null);
  const lastTrigger = ref<SaveTrigger | null>(null);

  let latestSavePromise: Promise<SaveResponse> | null = null;

  const setDocument = (doc: FileData | null, opts: { markClean?: boolean } = {}) => {
    currentDoc.value = doc;
    if (opts.markClean) {
      hasUnsavedChanges.value = false;
    }
  };

  const setLastSavedAt = (value: Date | null) => {
    lastSavedAt.value = value;
  };

  const markDirty = () => {
    hasUnsavedChanges.value = true;
  };

  const syncChanges = async (
    trigger: SaveTrigger = "manual",
    payload: SavePayload = {}
  ): Promise<SaveResponse> => {
    const failure = (error: string): SaveResponse => {
      const offline = !fileStore.isOnline;
      const response: SaveResponse = { success: false, offline, error };
      lastSaveResult.value = response;
      return response;
    };

    if (options.readOnly?.value) {
      return failure("Document is read-only");
    }

    if (!currentDoc.value) {
      return failure("Document not loaded");
    }

    if (isSyncing.value && latestSavePromise) {
      return latestSavePromise;
    }

    const performSave = async (): Promise<SaveResponse> => {
      isSyncing.value = true;
      lastTrigger.value = trigger;

      try {
        const titleSource = payload.titleOverride ?? currentDoc.value?.title ?? "";
        const nextTitle = titleSource.trim() || "New Document";
        const content = payload.content ?? currentDoc.value?.content ?? "";
        const contentJson = payload.contentJson ?? (currentDoc.value as any)?.content_json ?? null;

        const documentToSave: FileData = {
          ...currentDoc.value,
          content,
          ...(contentJson ? { content_json: contentJson } : {}),
          title: nextTitle,
          file_type: currentDoc.value?.file_type || "docx",
          is_folder: false,
          last_viewed: new Date(),
        };

        const result = await fileStore.saveDocument(documentToSave);
        let savedDoc = result.document;

        if (!savedDoc) {
          throw new Error("Save operation returned no document data");
        }

        if (result.shouldRedirect && result.redirectId && options.router) {
          await options.router.replace(`/docs/${result.redirectId}`);
          savedDoc = result.document;
          if (options.onRedirect) {
            await Promise.resolve(options.onRedirect(result.redirectId, savedDoc));
          }
        }

        currentDoc.value = savedDoc;
        hasUnsavedChanges.value = false;
        lastSavedAt.value = new Date();

        const response: SaveResponse = {
          success: true,
          offline: !fileStore.isOnline,
          error: null,
        };

        lastSaveResult.value = response;
        options.onAfterSave?.(savedDoc, { trigger, payload });
        return response;
      } catch (error: unknown) {
        console.error("Document sync failed", error);
        const message = error instanceof Error ? error.message : "Sync failed";
        return failure(message);
      } finally {
        isSyncing.value = false;
        latestSavePromise = null;
      }
    };

    latestSavePromise = performSave();
    return latestSavePromise;
  };

  return {
    currentDoc,
    hasUnsavedChanges,
    isSyncing,
    lastSavedAt,
    lastSaveResult,
    lastTrigger,
    setDocument,
    setLastSavedAt,
    markDirty,
    syncChanges,
  };
}
