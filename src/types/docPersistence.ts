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

export interface EditorSnapshot {
  html: string;
  json: unknown;
}

export interface SaveResultState extends SaveResponse {
  timestamp: number;
}
