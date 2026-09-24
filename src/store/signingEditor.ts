import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SigningField, SigningFieldType, SigningSigner } from '@/types/signing';
import { FIELD_DEFAULTS, SIGNER_COLORS } from '@/types/signing';
import type { PdfFormField } from '@/composables/usePdfRenderer';

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sf_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const DIMENSIONS_KEY = 'vensuite:signing-field-dimensions';

function loadSavedDimensions(): Partial<Record<SigningFieldType, { width: number; height: number }>> {
  try {
    const raw = localStorage.getItem(DIMENSIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveDimensions(type: SigningFieldType, width: number, height: number) {
  try {
    const existing = loadSavedDimensions();
    existing[type] = { width, height };
    localStorage.setItem(DIMENSIONS_KEY, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
}

function getDimensionsForType(type: SigningFieldType): { width: number; height: number } {
  const saved = loadSavedDimensions();
  return saved[type] || FIELD_DEFAULTS[type];
}

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
      if (!field.signerEmail) continue;
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
    const providedSigners = data.signers || [];
    const inferredSigners = providedSigners.length > 0
      ? providedSigners
      : Array.from(new Set((data.fields || []).map((field) => field.signerEmail).filter((email): email is string => Boolean(email))))
          .map((email, index) => ({
            email,
            name: email.split('@')[0],
            color: SIGNER_COLORS[index % SIGNER_COLORS.length],
          }));

    signingRequestId.value = data.signingRequestId;
    documentUrl.value = data.documentUrl;
    documentName.value = data.documentName;
    fields.value = data.fields || [];
    signers.value = inferredSigners;
    isDirty.value = false;
    selectedFieldId.value = null;
    activeSignerEmail.value = inferredSigners[0]?.email || null;
    currentPage.value = 0;
    zoom.value = 1;
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

    const dims = getDimensionsForType(type);
    const field: SigningField = {
      id: generateId(),
      type,
      pageIndex,
      x: Math.max(0, Math.min(100 - dims.width, x)),
      y: Math.max(0, Math.min(100 - dims.height, y)),
      width: dims.width,
      height: dims.height,
      signerEmail,
      required: type === 'signature' || type === 'initials',
    };

    fields.value.push(field);
    selectedFieldId.value = field.id;
    isDirty.value = true;
    return field;
  }

  interface AddImageFieldOptions {
    pageIndex: number;
    x: number;
    y: number;
    assigned: boolean;
    label?: string;
    src?: string;
    path?: string;
  }

  function addImageField(options: AddImageFieldOptions): SigningField | null {
    // Assigned slots belong to the active signer and are required (passport photos).
    // Unassigned slots are document-level decorations the sender already supplied.
    const signerEmail = options.assigned ? activeSignerEmail.value : null;
    if (options.assigned && !signerEmail) return null;

    const dims = getDimensionsForType('image');
    const field: SigningField = {
      id: generateId(),
      type: 'image',
      pageIndex: options.pageIndex,
      x: Math.max(0, Math.min(100 - dims.width, options.x)),
      y: Math.max(0, Math.min(100 - dims.height, options.y)),
      width: dims.width,
      height: dims.height,
      required: Boolean(signerEmail),
    };

    if (signerEmail) {
      field.signerEmail = signerEmail;
      field.label = options.label ?? 'Image';
    }
    if (options.src) field.src = options.src;
    if (options.path) field.path = options.path;

    fields.value.push(field);
    selectedFieldId.value = field.id;
    isDirty.value = true;
    return field;
  }

  function mapFieldType(pdfFieldType: string): SigningFieldType {
    switch (pdfFieldType) {
      case 'Tx': return 'text';
      case 'Btn': return 'checkbox';
      case 'Ch': return 'text';
      case 'Sig': return 'signature';
      default: return 'text';
    }
  }

  function addFieldsFromAnnotations(annotations: PdfFormField[]): number {
    const signerEmail = activeSignerEmail.value;
    if (!signerEmail) return 0;

    const existingNames = new Set(
      fields.value
        .map(f => f.nativeFieldName)
        .filter(Boolean) as string[]
    );

    let added = 0;

    for (const ann of annotations) {
      if (existingNames.has(ann.fieldName)) continue;

      const type = mapFieldType(ann.fieldType);

      // PDF coordinates are bottom-left origin; convert to top-left origin percentages
      const [x1, y1, x2, y2] = ann.rect;
      const xPct = (x1 / ann.pageWidth) * 100;
      // y1 is distance from bottom; convert to distance from top
      const yPct = ((ann.pageHeight - y2) / ann.pageHeight) * 100;
      const wPct = ((x2 - x1) / ann.pageWidth) * 100;
      const hPct = ((y2 - y1) / ann.pageHeight) * 100;

      const field: SigningField = {
        id: generateId(),
        type,
        pageIndex: ann.pageIndex,
        x: Math.max(0, Math.min(100 - wPct, xPct)),
        y: Math.max(0, Math.min(100 - hPct, yPct)),
        width: Math.max(2, wPct),
        height: Math.max(1, hPct),
        signerEmail,
        label: ann.fieldName,
        required: false,
        nativeFieldName: ann.fieldName,
      };

      fields.value.push(field);
      existingNames.add(ann.fieldName);
      added++;
    }

    if (added > 0) {
      isDirty.value = true;
    }

    return added;
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
    // Persist dimensions for this field type so future fields use the same size
    saveDimensions(field.type, field.width, field.height);
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
    addImageField,
    addFieldsFromAnnotations,
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
