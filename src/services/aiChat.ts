/**
 * AI chat service — powers the chat-first Assistant surface.
 *
 * Mirrors the SSE consumption pattern in services/ai.ts (streamDocumentContent)
 * against the /ai/chat-stream endpoint, with a non-streaming /ai/chat fallback.
 */
import { apiClient, withRequestOptions } from "./apiClient";
import { useAuthStore } from "@/store/auth";

export type ChatRole = "user" | "assistant";

export interface ChatApiMessage {
  role: ChatRole;
  content: string;
}

export interface ChatApiDocument {
  name: string;
  content: string;
  role: "primary" | "reference" | "context";
}

export interface ChatPayload {
  messages: ChatApiMessage[];
  documents?: ChatApiDocument[];
  model?: string;
}

function buildAuthRequestConfig() {
  try {
    const authStore = useAuthStore();
    const token = authStore.getToken?.() ?? authStore.token;
    if (token) {
      return withRequestOptions({ auth: { token } });
    }
  } catch (error) {
    console.warn("Failed to resolve auth token for AI chat request:", error);
  }

  return withRequestOptions();
}

/**
 * Stream an assistant reply for the given conversation payload.
 * Chunks arrive as SSE lines: `data: {"content":"..."}` terminated by
 * `data: [DONE]`. Error chunks may be `data: {"error":"..."}`.
 */
export async function streamChat(
  payload: ChatPayload,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  onStage?: (stage: string, label: string) => void,
  onRevise?: () => void,
): Promise<AbortController> {
  const controller = new AbortController();
  try {
    const authStore = useAuthStore();
    const token = authStore.getToken?.() ?? authStore.token;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

    const response = await fetch(`${API_BASE_URL}/ai/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI chat stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    const processStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { onDone(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') { onDone(); return; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                onError(new Error(String(parsed.error)));
                return;
              }
              if (parsed.stage) onStage?.(parsed.stage, parsed.label ?? parsed.stage);
              if (parsed.revise) onRevise?.();
              if (parsed.content) onChunk(parsed.content);
            } catch {
              if (data) onChunk(data);
            }
          }
        }
      }
    };

    processStream().catch(onError);
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Stream failed'));
  }
  return controller;
}

/**
 * Non-streaming fallback — returns the full assistant reply at once.
 */
export async function sendChat(payload: ChatPayload): Promise<string> {
  const requestConfig = buildAuthRequestConfig();
  const response = await apiClient.post<{ data: { content: string } }>(
    "/ai/chat",
    payload,
    { ...requestConfig, timeout: 120000 }
  );
  return response.data.data.content;
}
