import { computed, ref, type Ref, unref } from "vue";
import type { Router } from "vue-router";

import { useFileStore } from "@/store/files";
import type {
  DocumentFormat,
  DocumentSnapshot,
  FileData,
  LoadDocumentOptions,
  LoadDocumentResult,
  SavePayload,
  SaveResponse,
  SaveTrigger,
  SnapshotInput,
  SnapshotSerializer,
} from "@/types";

export interface UseDocumentPersistenceOptions {
  router?: Router;
  /**
   * Optional ref that indicates whether the current document is read-only.
   * When true, save attempts resolve with a failure result.
   */
  readOnly?: Ref<boolean> | (() => boolean);
  /**
   * Provide an initial document format; defaults to 'tiptap'.
   */
  defaultFormat?: DocumentFormat;
  /** Called after a snapshot is applied but before marking clean. */
  onSnapshotApplied?: (snapshot: DocumentSnapshot) => void;
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
  documentFormat: Ref<DocumentFormat>;
  lastSnapshot: Ref<DocumentSnapshot | null>;
  isAutoSaving: Ref<boolean>;
  isInitializing: Ref<boolean>;
  setDocument: (doc: FileData | null, opts?: { markClean?: boolean }) => void;
  setLastSavedAt: (value: Date | null) => void;
  markDirty: () => void;
  applySnapshot: (input: SnapshotInput) => void;
  applyTitle: (title: string) => void;
  ensureDocument: (options: LoadDocumentOptions) => Promise<LoadDocumentResult<FileData>>;
  syncChanges: (trigger?: SaveTrigger, payload?: SavePayload) => Promise<SaveResponse>;
  handleSave: (
    trigger: SaveTrigger,
    options?: { snapshot?: SnapshotInput; payload?: SavePayload }
  ) => Promise<SaveResponse>;
}

const defaultSerializer: SnapshotSerializer = {
  id: "tiptap",
  serialize: (input: DocumentSnapshot) => ({
    // JSON-in-content: if JSON present, serialize to content as JSON string
    content: input.json ? JSON.stringify(input.json) : (input.html ?? ""),
  }),
};

const serializerRegistry = ref<Partial<Record<DocumentFormat, SnapshotSerializer>>>(
  {
    tiptap: defaultSerializer,
  }
);

export function registerSnapshotSerializer(serializer: SnapshotSerializer) {
  serializerRegistry.value = {
    ...serializerRegistry.value,
    [serializer.id]: serializer,
  };
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
  const documentFormat = ref<DocumentFormat>(options.defaultFormat ?? "tiptap");
  const lastSnapshot = ref<DocumentSnapshot | null>(null);
  const isAutoSaving = ref(false);
  const isInitializing = ref(false);

  let latestSavePromise: Promise<SaveResponse> | null = null;
  let ensureDocPromise: Promise<LoadDocumentResult<FileData>> | null = null;

  const isReadOnlyComputed = computed(() => {
    const source = options.readOnly;
    if (!source) return false;
    if (typeof source === "function") return source();
    return unref(source);
  });

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

  const applySnapshot = (input: SnapshotInput) => {
    const targetDoc = currentDoc.value;
    if (!targetDoc) return;

    const snapshot: DocumentSnapshot = {
      html: input.html ?? targetDoc.content ?? "",
      json: input.json ?? null,
      raw: input.raw,
      format: input.format ?? documentFormat.value,
    };

    const serializer = serializerRegistry.value[snapshot.format] ?? defaultSerializer;
    const serialized = serializer.serialize(snapshot);

    currentDoc.value = {
      ...targetDoc,
      // If JSON present, store JSON string in content; otherwise store HTML
      content: serialized.content ?? targetDoc.content ?? "",
    } as FileData;

    documentFormat.value = snapshot.format;
    lastSnapshot.value = snapshot;
    markDirty();
    options.onSnapshotApplied?.(snapshot);
  };

  const applyTitle = (title: string) => {
    const doc = currentDoc.value;
    if (!doc) return;
    const nextTitle = title.trim() || "New Document";
    if (doc.title === nextTitle) return;
    currentDoc.value = {
      ...doc,
      title: nextTitle,
    } as FileData;
    markDirty();
  };

  const ensureDocument = async (
    options: LoadDocumentOptions
  ): Promise<LoadDocumentResult<FileData>> => {
    if (ensureDocPromise) return ensureDocPromise;

    ensureDocPromise = (async () => {
      try {
        isInitializing.value = true;
        const result = await fileStore.ensureDocument(options);
        if (result.document) {
          setDocument(result.document, { markClean: result.markClean ?? !result.created });
        }
        documentFormat.value = result.format ?? documentFormat.value;
        if (result.document?.updated_at) {
          try {
            setLastSavedAt(new Date(result.document.updated_at));
          } catch {}
        }
        return result;
      } finally {
        isInitializing.value = false;
        ensureDocPromise = null;
      }
    })();

    return ensureDocPromise;
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

    if (isReadOnlyComputed.value) {
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
        const snapshotPayload = (payload.content)
          ? payload
          : (serializerRegistry.value[documentFormat.value] ?? defaultSerializer).serialize({
              format: documentFormat.value,
              html: lastSnapshot.value?.html ?? currentDoc.value?.content ?? "",
              json: lastSnapshot.value?.json ?? null,
              raw: lastSnapshot.value?.raw,
            }) ?? { content: currentDoc.value?.content ?? "" };

        // Persist JSON-as-string in content when provided by serializer or payload
        const content = payload.content ?? (snapshotPayload as any).content ?? currentDoc.value?.content ?? "";

        const documentToSave: FileData = {
          ...currentDoc.value,
          content,
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

        // If we're still on a new-doc path, update the URL to the saved document id
        try {
          const r = options.router;
          const path = r?.currentRoute?.value?.path || "";
          if (r && savedDoc?.id && (path === "/docs/new" || path === "/docs")) {
            await r.replace(`/docs/${savedDoc.id}`);
          }
        } catch {}

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

  const handleSave = async (
    trigger: SaveTrigger,
    options: { snapshot?: SnapshotInput; payload?: SavePayload } = {}
  ): Promise<SaveResponse> => {
    if (options.snapshot) {
      applySnapshot(options.snapshot);
    }

    if (trigger === "auto") {
      isAutoSaving.value = true;
    }

    try {
      return await syncChanges(trigger, options.payload);
    } finally {
      if (trigger === "auto") {
        isAutoSaving.value = false;
      }
    }
  };

  return {
    currentDoc,
    hasUnsavedChanges,
    isSyncing,
    lastSavedAt,
    lastSaveResult,
    lastTrigger,
    documentFormat,
    lastSnapshot,
    isAutoSaving,
    isInitializing,
    setDocument,
    setLastSavedAt,
    markDirty,
    applySnapshot,
    applyTitle,
    ensureDocument,
    syncChanges,
    handleSave,
  };
}
