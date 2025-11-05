import { apiClient } from "./apiClient";
import type { FormBlock } from "@/components/forms/blocks/types";

export interface AIGenerateFormRequest {
  description: string;
  context?: string;
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
    const response = await apiClient.post<{ data: AIGenerateFormResponse }>(
      "/api/v1/ai/generate-form",
      {
        description,
        context,
      }
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
    const response = await apiClient.post<{ data: AIGenerateFormResponse }>(
      "/api/v1/ai/generate-form",
      {
        description,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("AI generation failed:", error);
    throw new Error("Failed to generate form");
  }
}
