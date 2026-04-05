import { apiClient } from './apiClient';
import type {
  SigningTemplate,
  SigningSession,
  SigningField,
  SigningFieldValue,
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
): Promise<void> {
  await apiClient.post(
    `${SIGNING_API_BASE}/api/signing/complete/${signerToken}`,
    { field_values: fieldValues }
  );
}

export const signingApi = {
  fetchEditorSession,
  saveFields,
  fetchSignerSession,
  submitCompletion,
};
