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

async function fetchSignerSession(signerToken: string): Promise<SigningSession> {
  // This is a public endpoint — no auth header needed, the token IS the auth
  const response = await apiClient.get(
    `${SIGNING_API_BASE}/api/signing/session/${signerToken}`
  );
  return response.data;
}

async function submitCompletion(
  signerToken: string,
  fieldValues: SigningFieldValue[]
): Promise<SigningCompletionResponse> {
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

  const response = await apiClient.post(
    `${SIGNING_API_BASE}/api/v1/signing-requests/prepare`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
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
