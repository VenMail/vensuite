export type SaveTrigger = "manual" | "auto" | "title" | "external";

export interface SavePayload {
  content?: string;
  contentJson?: string;
  titleOverride?: string;
}

export interface SaveResponse {
  success: boolean;
  offline: boolean;
  error: string | null;
}

export type DocumentFormat = "tiptap" | "univer" | "umodoc" | (string & {});

export interface DocumentSnapshot {
  html: string;
  json: unknown;
  raw?: unknown;
  format: DocumentFormat;
}

export interface SnapshotInput {
  html?: string;
  json?: unknown;
  raw?: unknown;
  format?: DocumentFormat;
}

export interface SnapshotSerializerResult {
  content?: string;
  contentJson?: string;
  metadata?: Record<string, unknown>;
}

export interface SnapshotSerializer {
  id: DocumentFormat;
  serialize: (snapshot: DocumentSnapshot) => SnapshotSerializerResult;
}

export interface EditorSnapshot {
  html: string;
  json: unknown;
}

export interface SaveResultState extends SaveResponse {
  timestamp: number;
}

export interface LoadDocumentOptions {
  id?: string | null;
  fileType?: string;
  title?: string;
  template?: {
    title: string;
    content: string;
    format?: DocumentFormat;
  };
  initialContent?: string;
  createIfMissing?: boolean;
}

export interface LoadDocumentResult<TDoc> {
  document: TDoc | null;
  created: boolean;
  format?: DocumentFormat;
  markClean?: boolean;
}
