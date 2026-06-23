export type SigningFieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox';

export interface SigningField {
  id: string;
  type: SigningFieldType;
  pageIndex: number;        // 0-based PDF page
  x: number;                // percentage of page width (0-100)
  y: number;                // percentage of page height (0-100)
  width: number;            // percentage of page width
  height: number;           // percentage of page height
  signerEmail: string;      // which signer this field is assigned to
  label?: string;
  required: boolean;
  value?: string | boolean; // filled value (for player)
}

export interface SigningSigner {
  email: string;
  name: string;
  color: string;
}

export interface SigningTemplate {
  id: string;               // signing_request_id
  documentUrl: string;
  documentName: string;
  pageCount: number;
  fields: SigningField[];
  signers: SigningSigner[];
}

export interface SigningSession {
  token: string;
  signerEmail: string;
  signerName: string;
  signingRequestId: string;
  documentUrl: string;
  documentName: string;
  pageCount: number;
  fields: SigningField[];   // only fields for this signer
}

export interface SigningFieldValue {
  fieldId: string;
  value: string | boolean;  // base64 PNG for signatures, string for text/date, boolean for checkbox
}

export interface SigningCompletionResponse {
  status: string;
  message: string;
  signedDocumentStatusUrl?: string;
  signedDocumentReady?: boolean;
  downloadUrl?: string | null;
}

// Default field dimensions (percentage of page)
export const FIELD_DEFAULTS: Record<SigningFieldType, { width: number; height: number }> = {
  signature: { width: 20, height: 5 },
  initials: { width: 10, height: 5 },
  date: { width: 15, height: 3 },
  text: { width: 20, height: 3 },
  checkbox: { width: 3, height: 3 },
};

// Signer colors for visual distinction
export const SIGNER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
];
