import { computed, ref } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { FileData } from '@/types';
import type { useFileStore } from '@/store/files';

type ConflictContext = 'initial' | 'reconnect';

interface NotifyAdapter {
  info?: (message: string) => void;
  success?: (message: string) => void;
  error?: (message: string) => void;
}

export interface UseDocumentConflictResolverOptions {
  fileStore: ReturnType<typeof useFileStore>;
  applyLocalVersion: (localDoc: FileData) => FileData | Promise<FileData | null | void>;
  applyRemoteVersion: (remoteDoc: FileData) => FileData | Promise<FileData | null | void>;
  notify?: NotifyAdapter;
  differenceThreshold?: number;
}

export interface DocumentConflictResolver {
  conflictDialogOpen: Ref<boolean>;
  conflictDialogMessage: ComputedRef<string>;
  conflictLocalLength: ComputedRef<number>;
  conflictRemoteLength: ComputedRef<number>;
  conflictDeltaLength: ComputedRef<number>;
  conflictLocalPreview: ComputedRef<string>;
  conflictRemotePreview: ComputedRef<string>;
  evaluateLoadedDocument: (doc: FileData, context?: ConflictContext) => Promise<void>;
  checkConflictsAfterReconnect: (docId: string, fileType?: string | null) => Promise<void>;
  keepLocalVersion: () => Promise<void>;
  keepRemoteVersion: () => Promise<void>;
  clearConflictState: () => void;
  hasSignificantDifference: (a?: string | null, b?: string | null) => boolean;
}

export function useDocumentConflictResolver(options: UseDocumentConflictResolverOptions): DocumentConflictResolver {
  const {
    fileStore,
    applyLocalVersion,
    applyRemoteVersion,
    notify,
    differenceThreshold = 20,
  } = options;

  const conflictDialogOpen = ref(false);
  const conflictLocalDoc = ref<FileData | null>(null);
  const conflictRemoteDoc = ref<FileData | null>(null);
  const conflictContext = ref<ConflictContext>('initial');
  const pendingLocalDoc = ref<FileData | null>(null);

  const contentLength = (doc: FileData | null) => (typeof doc?.content === 'string' ? doc.content.length : 0);

  const conflictLocalLength = computed(() => contentLength(conflictLocalDoc.value));
  const conflictRemoteLength = computed(() => contentLength(conflictRemoteDoc.value));
  const conflictDeltaLength = computed(() => Math.abs(conflictLocalLength.value - conflictRemoteLength.value));

  const conflictDialogMessage = computed(() =>
    conflictContext.value === 'reconnect'
      ? 'We detected differences after reconnecting. Choose which version to keep.'
      : 'A saved local copy is different from the online version. Pick the source you prefer.'
  );

  const buildPreview = (doc: FileData | null): string => {
    if (!doc) return 'Preview unavailable.';

    const raw = typeof doc.content === 'string' ? doc.content : '';
    if (!raw || !raw.trim()) return 'No content available.';

    const type = (doc.file_type || '').toLowerCase();
    const looksJson = raw.trim().startsWith('{') || raw.trim().startsWith('[');

    if (type.includes('xlsx') || type.includes('sheet') || looksJson) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const name = (parsed as any).name || (parsed as any).title;
          const sheetCount = Array.isArray((parsed as any).sheets) ? (parsed as any).sheets.length : undefined;
          if (name && sheetCount !== undefined) {
            return `Spreadsheet "${name}" with ${sheetCount} sheet${sheetCount === 1 ? '' : 's'}.`;
          }
        }
      } catch {
        /* ignore */
      }
      return 'Preview not available for spreadsheet content.';
    }

    const stripped = raw
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (!stripped) return 'Content contains formatting without text preview.';

    return stripped.length > 600 ? `${stripped.slice(0, 600)}…` : stripped;
  };

  const conflictLocalPreview = computed(() => buildPreview(conflictLocalDoc.value));
  const conflictRemotePreview = computed(() => buildPreview(conflictRemoteDoc.value));

  const isSyncInProgress = (docId: string | undefined): boolean => {
    if (!docId) return false;
    const status = fileStore.syncStatus.get(docId);
    return status === 'pending' || status === 'syncing';
  };

  const hasSignificantDifference = (a?: string | null, b?: string | null) => {
    const left = (a ?? '').trim();
    const right = (b ?? '').trim();
    if (left === right) return false;
    const diff = Math.abs(left.length - right.length);
    if (diff > differenceThreshold) return true;
    return (left.length === 0 && right.length > 0) || (right.length === 0 && left.length > 0);
  };

  const openConflictDialog = (localDoc: FileData, remoteDoc: FileData, context: ConflictContext) => {
    conflictLocalDoc.value = { ...localDoc };
    conflictRemoteDoc.value = { ...remoteDoc };
    conflictContext.value = context;
    conflictDialogOpen.value = true;
  };

  const clearConflictState = () => {
    conflictDialogOpen.value = false;
    conflictLocalDoc.value = null;
    conflictRemoteDoc.value = null;
    conflictContext.value = 'initial';
  };

  const evaluateLoadedDocument = async (doc: FileData, context: ConflictContext = 'initial') => {
    if (!doc?.id) return;

    const localSnapshot = fileStore.loadFromLocalStorage(doc.id, doc.file_type || undefined) as FileData | null;
    if (!localSnapshot) {
      pendingLocalDoc.value = null;
      return;
    }

    if (isSyncInProgress(doc.id)) {
      pendingLocalDoc.value = { ...localSnapshot };
      return;
    }

    if (!fileStore.isOnline) {
      pendingLocalDoc.value = { ...localSnapshot };
      return;
    }

    try {
      const remoteDoc = await fileStore.loadFromAPI(doc.id);
      const effectiveRemote = remoteDoc ?? doc;
      if (hasSignificantDifference(localSnapshot.content, effectiveRemote.content)) {
        openConflictDialog(localSnapshot, effectiveRemote, context);
      } else {
        pendingLocalDoc.value = null;
      }
    } catch (error) {
      console.error('Failed to check document differences:', error);
      pendingLocalDoc.value = { ...localSnapshot };
    }
  };

  const checkConflictsAfterReconnect = async (docId: string, fileType?: string | null) => {
    if (!docId || !fileStore.isOnline) return;

    const localSnapshot = pendingLocalDoc.value
      ?? (fileStore.loadFromLocalStorage(docId, (fileType ?? undefined)) as FileData | null);

    if (!localSnapshot) {
      pendingLocalDoc.value = null;
      return;
    }

    if (isSyncInProgress(docId)) {
      pendingLocalDoc.value = { ...localSnapshot };
      return;
    }

    try {
      const remoteDoc = await fileStore.loadFromAPI(docId);
      if (!remoteDoc) return;

      if (hasSignificantDifference(localSnapshot.content, remoteDoc.content)) {
        openConflictDialog(localSnapshot, remoteDoc, 'reconnect');
      } else {
        pendingLocalDoc.value = null;
      }
    } catch (error) {
      console.error('Reconnect diff check failed:', error);
    }
  };

  const keepLocalVersion = async () => {
    const localDoc = conflictLocalDoc.value;
    if (!localDoc) {
      clearConflictState();
      return;
    }

    let applied: FileData | null | void;
    try {
      applied = await applyLocalVersion({ ...localDoc });
    } catch (error) {
      notify?.error?.('Failed to apply local version.');
      console.error('Failed to apply local version:', error);
      clearConflictState();
      return;
    }

    if (!applied) {
      clearConflictState();
      return;
    }

    try {
      fileStore.saveToLocalCache(applied);
    } catch (error) {
      console.warn('Failed to cache local document snapshot:', error);
    }

    pendingLocalDoc.value = { ...applied };

    if (fileStore.isOnline) {
      try {
        const result = await fileStore.saveDocument({ ...applied, isDirty: false });
        if (result?.document) {
          pendingLocalDoc.value = null;
          await applyRemoteVersion(result.document);
          clearConflictState();
          notify?.success?.('Local changes synced online.');
          return;
        }
      } catch (error) {
        console.error('Immediate online sync failed:', error);
      }
    }

    const queuedDoc: FileData = { ...applied, isDirty: true };
    fileStore.queueForSync(queuedDoc);
    if (fileStore.isOnline) {
      await fileStore.syncPendingChanges();
    }
    clearConflictState();
    notify?.info?.('Keeping local copy. It should sync shortly.');
  };

  const keepRemoteVersion = async () => {
    const remoteDoc = conflictRemoteDoc.value;
    if (!remoteDoc) {
      clearConflictState();
      return;
    }

    try {
      const applied = await applyRemoteVersion({ ...remoteDoc });
      pendingLocalDoc.value = null;
      clearConflictState();

      const cacheDoc = applied ?? remoteDoc;
      fileStore.saveToLocalCache({ ...cacheDoc });
      notify?.success?.('Online version applied.');
    } catch (error) {
      notify?.error?.('Failed to apply online version.');
      console.error('Failed to apply online version:', error);
    }
  };

  return {
    conflictDialogOpen,
    conflictDialogMessage,
    conflictLocalLength,
    conflictRemoteLength,
    conflictDeltaLength,
    conflictLocalPreview,
    conflictRemotePreview,
    evaluateLoadedDocument,
    checkConflictsAfterReconnect,
    keepLocalVersion,
    keepRemoteVersion,
    clearConflictState,
    hasSignificantDifference,
  };
}
