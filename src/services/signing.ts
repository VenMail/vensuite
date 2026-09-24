import { apiClient } from './apiClient';
import type {
  SigningTemplate,
  SigningSession,
  SigningField,
  SigningFieldValue,
  SigningCompletionResponse,
} from '@/types/signing';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const EDITOR_TOKEN_HEADER = 'X-Signing-Editor-Token';

// Signing API calls go to the mailer_web backend (not the VenSuite API)
// The base URL may differ from VenSuite's own API
const SIGNING_API_BASE = import.meta.env.VITE_SIGNING_API_BASE_URL || API_BASE.replace('/api/v1', '');

const DEFAULT_RETRY_DELAY_MS = 2000;
const MIN_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function firstValidationMessage(errors: unknown): string | null {
  if (!isRecord(errors)) return null;

  for (const messages of Object.values(errors)) {
    if (!Array.isArray(messages)) continue;
    const message = messages.find(value => typeof value === 'string' && value.trim() !== '');
    if (typeof message === 'string') return message.trim();
  }

  return null;
}

/**
 * Extracts the most useful user-facing text from the normalized API error shape.
 * Validation responses often include a generic top-level message, so include
 * the first field detail when one is available to make the error actionable.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isRecord(error)) {
    const data = error.data;
    if (isRecord(data)) {
      const explicitError = typeof data.error === 'string' ? data.error.trim() : '';
      if (explicitError) return explicitError;

      const message = typeof data.message === 'string' ? data.message.trim() : '';
      const validationMessage = firstValidationMessage(data.errors);
      if (message && validationMessage) return `${message} ${validationMessage}`;
      if (message) return message;
      if (validationMessage) return validationMessage;
    }

    const directMessage = typeof error.message === 'string' ? error.message.trim() : '';
    if (directMessage) return directMessage;
  }

  return fallback;
}

function headerValue(headers: unknown, name: string): unknown {
  if (!isRecord(headers)) return undefined;

  const lowerName = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowerName) return headers[key];
  }

  const get = headers.get;
  if (typeof get === 'function') {
    try {
      return get.call(headers, name);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/** Returns a bounded retry delay, honoring a numeric Retry-After response header. */
export function getRetryAfterDelayMs(error: unknown): number {
  const rawValue = headerValue(isRecord(error) ? error.headers : undefined, 'retry-after');
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const seconds = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_RETRY_DELAY_MS;

  return Math.min(MAX_RETRY_DELAY_MS, Math.max(MIN_RETRY_DELAY_MS, seconds * 1000));
}

async function fetchEditorSession(
  signingRequestId: string,
  token?: string
): Promise<SigningTemplate> {
  const headers: Record<string, string> = {};
  if (token) {
    headers[EDITOR_TOKEN_HEADER] = token;
  }
  const response = await apiClient.get(
    `${SIGNING_API_BASE}/api/signing/editor/${signingRequestId}`,
    { headers }
  );
  return response.data;
}

async function saveFields(
  signingRequestId: string,
  fields: SigningField[],
  signers: Array<{ email: string; name: string }>,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) {
    headers[EDITOR_TOKEN_HEADER] = token;
  }
  await apiClient.post(
    `${SIGNING_API_BASE}/api/composer/signing/${signingRequestId}/save-template`,
    { signing_fields: fields, signers },
    { headers }
  );
}

export interface UploadedSigningImage {
  url: string;
  path: string;
}

async function uploadEditorImage(
  signingRequestId: string,
  file: File,
  token?: string
): Promise<UploadedSigningImage> {
  const headers: Record<string, string> = {};
  if (token) {
    headers[EDITOR_TOKEN_HEADER] = token;
  }

  const formData = new FormData();
  formData.append('image', file);

  // Let the browser/axios set Content-Type automatically (multipart boundary).
  const response = await apiClient.post(
    `${SIGNING_API_BASE}/api/composer/signing/${signingRequestId}/image`,
    formData,
    { headers }
  );
  return response.data;
}

async function uploadSignerImage(
  signerToken: string,
  fieldId: string,
  file: File
): Promise<UploadedSigningImage> {
  const formData = new FormData();
  formData.append('fieldId', fieldId);
  formData.append('image', file);

  const response = await apiClient.post(
    `${SIGNING_API_BASE}/api/signing/upload-image/${signerToken}`,
    formData
  );
  return response.data;
}

// Signer-uploaded image values are stored as public-disk paths (not URLs), so the
// player rebuilds a displayable URL from the same mailer origin it calls the API on.
function storageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SIGNING_API_BASE}/storage/${pathOrUrl.replace(/^\/+/, '')}`;
}

async function fetchSignerSession(signerToken: string): Promise<SigningSession> {
  // This is a public endpoint — no auth header needed, the token IS the auth
  const response = await apiClient.get(
    `${SIGNING_API_BASE}/api/signing/session/${signerToken}`
  );
  return response.data;
}

async function submitCompletion(
  signerToken: string,
  fieldValues: SigningFieldValue[],
  filledPdfBytes?: Uint8Array | ArrayBuffer | null
): Promise<SigningCompletionResponse> {
  if (filledPdfBytes) {
    // Send filled PDF as multipart form data
    const formData = new FormData();
    // Send field_values as JSON string — backend will decode it
    formData.append('field_values', JSON.stringify(fieldValues));
    // Create a fresh ArrayBuffer copy for Blob (avoids SharedArrayBuffer type issues)
    const bytes = filledPdfBytes instanceof ArrayBuffer
      ? new Uint8Array(filledPdfBytes)
      : new Uint8Array(filledPdfBytes);
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    const blob = new Blob([ab], { type: 'application/pdf' });
    formData.append('filled_pdf', blob, 'filled.pdf');

    // Let the browser/axios set Content-Type automatically — it must include
    // the multipart boundary, which a manual header would strip.
    const response = await apiClient.post(
      `${SIGNING_API_BASE}/api/signing/complete/${signerToken}`,
      formData
    );
    return response.data;
  }

  const response = await apiClient.post(
    `${SIGNING_API_BASE}/api/signing/complete/${signerToken}`,
    { field_values: fieldValues }
  );
  return response.data;
}

async function fetchSignedDocumentStatus(statusUrl: string): Promise<SigningCompletionResponse> {
  const response = await apiClient.get(statusUrl);
  return response.data;
}

// --- Signing request management (dashboard) ---

export interface SigningRequestSummary {
  id: string;
  document_name: string;
  original_file_name: string | null;
  status: string;
  signers: Array<{ name: string; email: string; status?: string; signed_at?: string | null }>;
  message: string | null;
  mail_id: string | null;
  signed_document_url: string | null;
  audit_trail_url: string | null;
  created_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
}

export interface SigningRequestListResponse {
  data: SigningRequestSummary[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface PrepareSigningRequestParams {
  document: File;
  document_name: string;
  signers?: Array<{ name: string; email: string }>;
  message?: string;
  mail_id?: string;
  send_email?: boolean;
}

export interface PrepareSigningRequestResponse {
  id: string;
  document_name: string;
  status: string;
  document_url: string;
  editor_url: string;
  editor_token: string;
  signers: Array<{ name: string; email: string; status: string }>;
  created_at: string;
}

async function listSigningRequests(page = 1, perPage = 20): Promise<SigningRequestListResponse> {
  const response = await apiClient.get(
    `${SIGNING_API_BASE}/api/v1/signing-requests`,
    { params: { page, per_page: perPage } }
  );
  return response.data;
}

async function prepareSigningRequest(params: PrepareSigningRequestParams): Promise<PrepareSigningRequestResponse> {
  const formData = new FormData();
  formData.append('document', params.document);
  formData.append('document_name', params.document_name);
  if (params.signers && params.signers.length > 0) {
    params.signers.forEach((s, i) => {
      formData.append(`signers[${i}][name]`, s.name);
      formData.append(`signers[${i}][email]`, s.email);
    });
  }
  if (params.message) formData.append('message', params.message);
  if (params.mail_id) formData.append('mail_id', params.mail_id);
  if (params.send_email !== undefined) formData.append('send_email', String(params.send_email));

  // Let the browser/axios set Content-Type automatically (boundary must be included)
  const response = await apiClient.post(
    `${SIGNING_API_BASE}/api/v1/signing-requests/prepare`,
    formData
  );
  return response.data.data;
}

async function sendSigningRequest(
  id: string,
  signers?: Array<{ name: string; email: string }>,
  sendEmail?: boolean
): Promise<SigningRequestSummary> {
  const payload: Record<string, unknown> = {};
  if (signers && signers.length > 0) {
    payload.signers = signers;
  }
  if (sendEmail !== undefined) {
    payload.send_email = sendEmail;
  }
  const response = await apiClient.post(
    `${SIGNING_API_BASE}/api/v1/signing-requests/${id}/send`,
    payload
  );
  return response.data.data;
}

async function getSigningRequestStatus(id: string): Promise<SigningRequestSummary> {
  const response = await apiClient.get(
    `${SIGNING_API_BASE}/api/v1/signing-requests/${id}/status`
  );
  return response.data.data;
}

async function deleteSigningRequest(id: string): Promise<void> {
  await apiClient.delete(`${SIGNING_API_BASE}/api/v1/signing-requests/${id}`);
}

async function getSignerUrl(id: string, email?: string): Promise<{ signing_url: string; slug: string }> {
  const params: Record<string, string> = {};
  if (email) params.email = email;
  const response = await apiClient.get(
    `${SIGNING_API_BASE}/api/v1/signing-requests/${id}/signer-url`,
    { params }
  );
  return response.data.data;
}

export const signingApi = {
  fetchEditorSession,
  saveFields,
  uploadEditorImage,
  uploadSignerImage,
  storageUrl,
  fetchSignerSession,
  submitCompletion,
  fetchSignedDocumentStatus,
  listSigningRequests,
  prepareSigningRequest,
  sendSigningRequest,
  getSigningRequestStatus,
  deleteSigningRequest,
  getSignerUrl,
};
