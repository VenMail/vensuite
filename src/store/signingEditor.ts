import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SigningField, SigningFieldType, SigningSigner } from '@/types/signing';
import { FIELD_DEFAULTS, SIGNER_COLORS } from '@/types/signing';

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sf_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const useSigningEditorStore = defineStore('signing-editor', () => {
  const signingRequestId = ref<string | null>(null);
  const documentUrl = ref('');
  const documentName = ref('');
  const fields = ref<SigningField[]>([]);
  const signers = ref<SigningSigner[]>([]);
  const selectedFieldId = ref<string | null>(null);
  const activeSignerEmail = ref<string | null>(null);
  const currentPage = ref(0);
  const zoom = ref(1);
  const isDirty = ref(false);

  const fieldsByPage = computed(() => {
    const grouped: Record<number, SigningField[]> = {};
    for (const field of fields.value) {
      if (!grouped[field.pageIndex]) grouped[field.pageIndex] = [];
      grouped[field.pageIndex].push(field);
    }
    return grouped;
  });

  const currentPageFields = computed(() =>
    fieldsByPage.value[currentPage.value] || []
  );

  const fieldsBySigner = computed(() => {
    const grouped: Record<string, SigningField[]> = {};
    for (const field of fields.value) {
      if (!grouped[field.signerEmail]) grouped[field.signerEmail] = [];
      grouped[field.signerEmail].push(field);
    }
    return grouped;
  });

  const selectedField = computed(() =>
    fields.value.find(f => f.id === selectedFieldId.value) || null
  );

  function initEditor(data: {
    signingRequestId: string;
    documentUrl: string;
    documentName: string;
    fields?: SigningField[];
    signers?: SigningSigner[];
  }) {
    signingRequestId.value = data.signingRequestId;
    documentUrl.value = data.documentUrl;
    documentName.value = data.documentName;
    fields.value = data.fields || [];
    signers.value = data.signers || [];
    isDirty.value = false;
    selectedFieldId.value = null;
    currentPage.value = 0;
  }

  function addSigner(email: string, name: string) {
    if (signers.value.find(s => s.email === email)) return;
    const color = SIGNER_COLORS[signers.value.length % SIGNER_COLORS.length];
    signers.value.push({ email, name, color });
    if (!activeSignerEmail.value) {
      activeSignerEmail.value = email;
    }
  }

  function removeSigner(email: string) {
    signers.value = signers.value.filter(s => s.email !== email);
    fields.value = fields.value.filter(f => f.signerEmail !== email);
    if (activeSignerEmail.value === email) {
      activeSignerEmail.value = signers.value[0]?.email || null;
    }
    isDirty.value = true;
  }

  function addField(type: SigningFieldType, pageIndex: number, x: number, y: number): SigningField | null {
    const signerEmail = activeSignerEmail.value;
    if (!signerEmail) return null;

    const defaults = FIELD_DEFAULTS[type];
    const field: SigningField = {
      id: generateId(),
      type,
      pageIndex,
      x: Math.max(0, Math.min(100 - defaults.width, x)),
      y: Math.max(0, Math.min(100 - defaults.height, y)),
      width: defaults.width,
      height: defaults.height,
      signerEmail,
      required: type === 'signature' || type === 'initials',
    };

    fields.value.push(field);
    selectedFieldId.value = field.id;
    isDirty.value = true;
    return field;
  }

  function moveField(fieldId: string, x: number, y: number) {
    const field = fields.value.find(f => f.id === fieldId);
    if (!field) return;
    field.x = Math.max(0, Math.min(100 - field.width, x));
    field.y = Math.max(0, Math.min(100 - field.height, y));
    isDirty.value = true;
  }

  function resizeField(fieldId: string, width: number, height: number) {
    const field = fields.value.find(f => f.id === fieldId);
    if (!field) return;
    field.width = Math.max(2, Math.min(100 - field.x, width));
    field.height = Math.max(1, Math.min(100 - field.y, height));
    isDirty.value = true;
  }

  function removeField(fieldId: string) {
    fields.value = fields.value.filter(f => f.id !== fieldId);
    if (selectedFieldId.value === fieldId) {
      selectedFieldId.value = null;
    }
    isDirty.value = true;
  }

  function selectField(fieldId: string | null) {
    selectedFieldId.value = fieldId;
  }

  function setActiveSigner(email: string) {
    activeSignerEmail.value = email;
  }

  function setCurrentPage(page: number) {
    currentPage.value = page;
  }

  function setZoom(z: number) {
    zoom.value = Math.max(0.5, Math.min(3, z));
  }

  function reset() {
    signingRequestId.value = null;
    documentUrl.value = '';
    documentName.value = '';
    fields.value = [];
    signers.value = [];
    selectedFieldId.value = null;
    activeSignerEmail.value = null;
    currentPage.value = 0;
    zoom.value = 1;
    isDirty.value = false;
  }

  return {
    // State
    signingRequestId,
    documentUrl,
    documentName,
    fields,
    signers,
    selectedFieldId,
    activeSignerEmail,
    currentPage,
    zoom,
    isDirty,
    // Getters
    fieldsByPage,
    currentPageFields,
    fieldsBySigner,
    selectedField,
    // Actions
    initEditor,
    addSigner,
    removeSigner,
    addField,
    moveField,
    resizeField,
    removeField,
    selectField,
    setActiveSigner,
    setCurrentPage,
    setZoom,
    reset,
  };
});
