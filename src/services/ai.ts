import { apiClient, withRequestOptions } from "./apiClient";
import type { FormBlock } from "@/components/forms/blocks/types";
import { useAuthStore } from "@/store/auth";

export interface AIGenerateFormRequest {
  description: string;
  context?: string;
}

function buildAuthRequestConfig() {
  try {
    const authStore = useAuthStore();
    const token = authStore.getToken?.() ?? authStore.token;
    if (token) {
      return withRequestOptions({ auth: { token } });
    }
  } catch (error) {
    console.warn("Failed to resolve auth token for AI request:", error);
  }

  return withRequestOptions();
}

export interface AIGenerateFormResponse {
  title: string;
  description: string;
  blocks: FormBlock[];
}

/**
 * Generate form blocks using AI based on a natural language description
 * @param description - Natural language description of the form
 * @param context - Optional additional context
 * @returns Promise with generated form blocks
 */
export async function generateFormBlocks(
  description: string,
  context?: string
): Promise<FormBlock[]> {
  try {
    const requestConfig = buildAuthRequestConfig();
    const response = await apiClient.post<{ data: AIGenerateFormResponse }>(
      "/ai/generate-form",
      {
        description,
        context,
      },
      requestConfig
    );

    return response.data.data.blocks;
  } catch (error) {
    console.error("AI generation failed:", error);
    throw new Error("Failed to generate form blocks");
  }
}

/**
 * Generate a complete form structure using AI
 * @param description - Natural language description of the form
 * @returns Promise with complete form structure
 */
export async function generateCompleteForm(
  description: string
): Promise<AIGenerateFormResponse> {
  try {
    const requestConfig = buildAuthRequestConfig();
    const response = await apiClient.post<{ data: AIGenerateFormResponse }>(
      "/ai/generate-form",
      {
        description,
      },
      requestConfig
    );

    return response.data.data;
  } catch (error) {
    console.error("AI generation failed:", error);
    throw new Error("Failed to generate form");
  }
}

// ── Document AI Writing ──────────────────────────────────────────────

export type AIWriteAction =
  | 'generate'
  | 'rewrite'
  | 'expand'
  | 'shorten'
  | 'improve'
  | 'fix_grammar'
  | 'change_tone'
  | 'translate'
  | 'summarize'
  | 'continue';

export interface AIWriteRequest {
  action: AIWriteAction;
  prompt?: string;
  selectedText?: string;
  surroundingContext?: string;
  tone?: string;
  language?: string;
}

export interface AIWriteResponse {
  content: string;
  html?: string;
}

/**
 * Generate or transform document content using AI
 */
export async function generateDocumentContent(
  request: AIWriteRequest
): Promise<AIWriteResponse> {
  try {
    const requestConfig = buildAuthRequestConfig();
    const response = await apiClient.post<{ data: AIWriteResponse }>(
      "/ai/write",
      request,
      { ...requestConfig, timeout: 60000 }
    );
    return response.data.data;
  } catch (error) {
    console.error("AI document generation failed:", error);
    throw new Error("Failed to generate content");
  }
}

/**
 * Stream AI-generated document content for real-time display
 */
export async function streamDocumentContent(
  request: AIWriteRequest,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
): Promise<AbortController> {
  const controller = new AbortController();
  try {
    const authStore = useAuthStore();
    const token = authStore.getToken?.() ?? authStore.token;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

    const response = await fetch(`${API_BASE_URL}/ai/write-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI stream failed: ${response.status}`);
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
