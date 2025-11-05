import { apiClient, withRequestOptions, type RequestOptions } from "./apiClient";
import type {
  FormDefinition,
  FormQuestion,
  FormResponse,
  FormResponseData,
} from "@/types";

const PUBLIC_BASE_PATH = "/forms";

export interface SubmitResponsePayload {
  answers: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SubmitResponseResult {
  response: FormResponse;
  nextQuestionId?: string | null;
  requiresPayment?: boolean;
  paymentIntentId?: string | null;
}

export const fetchPublicForm = async (
  slug: string,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.get(
    `${PUBLIC_BASE_PATH}/${slug}`,
    withRequestOptions(options),
  );
  return response.data?.data as FormDefinition;
};

export const submitResponse = async (
  slug: string,
  payload: SubmitResponsePayload,
  options?: RequestOptions,
): Promise<SubmitResponseResult> => {
  const response = await apiClient.post(
    `${PUBLIC_BASE_PATH}/${slug}/responses`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data as SubmitResponseResult;
};

export const updateResponseDraft = async (
  slug: string,
  responseId: string,
  payload: SubmitResponsePayload,
  options?: RequestOptions,
): Promise<SubmitResponseResult> => {
  const response = await apiClient.patch(
    `${PUBLIC_BASE_PATH}/${slug}/responses/${responseId}`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data as SubmitResponseResult;
};

export const fetchResponseAnalytics = async (
  formId: string,
  options?: RequestOptions,
): Promise<FormResponseData> => {
  const response = await apiClient.get(
    `/app-forms/${formId}/responses`,
    withRequestOptions(options),
  );
  return response.data as FormResponseData;
};

export interface QuestionPrefillPayload {
  form: FormDefinition;
  questions: FormQuestion[];
}

export const prefillQuestions = async (
  slug: string,
  payload: QuestionPrefillPayload,
  options?: RequestOptions,
): Promise<Record<string, unknown>> => {
  const response = await apiClient.post(
    `${PUBLIC_BASE_PATH}/${slug}/prefill`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data as Record<string, unknown>;
};
