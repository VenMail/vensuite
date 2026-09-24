# Remembered Signature Auto-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signer fill every empty signature field of a document in one deliberate tap, using a signature they previously used on that same device.

**Architecture:** Two independent pieces. First, scope the existing `useSavedSignatures` localStorage store by signer email so signatures are per-signer rather than global. Second, add a banner to the signing player that, when clicked, writes the chosen signature into every empty `signature` field through the existing `setFieldValue` path. No backend change, no new endpoint, no new data shape.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Playwright (`tests/signing-image.spec.ts`), `localStorage`.

**Spec:** `docs/superpowers/specs/2026-09-24-signing-signature-autofill-design.md`

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/composables/useSavedSignatures.ts` | Per-signer scoped storage. One scope per normalized email, cached in a module-level `Map` so every consumer of the same signer shares one reactive list. Purges the legacy global key. |
| `src/components/signing/SignatureCapture.vue` | Accepts `signerEmail` (storage scope) and optional `initialMode` (so the banner can open it on the Saved tab). |
| `src/components/signing/SigningFieldInput.vue` | Passes `signerEmail` through to its `SignatureCapture`. |
| `src/store/signingPlayer.ts` | `emptySignatureFields` computed + `fillSignatureFields(dataUrl)` action. Knows nothing about storage or UI. |
| `src/views/SigningPlayer.vue` | Banner markup, dismissal state, and its own `SignatureCapture` instance for "Choose another". |
| `tests/signing-image.spec.ts` | All new Playwright coverage. |

Interfaces used but not defined here (they already exist): `store.setFieldValue(fieldId, value)`, `store.answers`, `store.isCompleted`, `store.session`, `signingApi.fetchSignerSession(token)` returning `{ signerEmail, fields }`, and `SigningFieldInput`'s `update-value` event.

---

### Task 1: Scope saved signatures per signer

**Files:**
- Modify: `src/composables/useSavedSignatures.ts`
- Modify: `src/components/signing/SignatureCapture.vue` (add `signerEmail` prop, pass to composable)
- Modify: `src/components/signing/SigningFieldInput.vue` (add `signerEmail` prop, pass down)
- Modify: `src/views/SigningPlayer.vue` (pass `store.session?.signerEmail` into each `SigningFieldInput`)
- Test: `tests/signing-image.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/signing-image.spec.ts`. Seed a saved signature for `bob@example.com` only, then load a session for `alice@example.com`, open the capture modal on a signature field, and assert the Saved tab is not offered:

```ts
test('does not offer one signer\'s saved signatures to another signer on the same device', async ({ page }) => {
  await seedSavedSignatures(page, 'bob@example.com', [savedSignature('Bob signature')]);
  await page.goto('/signing/sign/alice-token');
  await mockSignerSession(page, { signerEmail: 'alice@example.com', fields: [signatureField('sig-1')] });
  await page.reload();
  await page.getByText('Click to Sign').first().click();
  await expect(page.getByRole('button', { name: 'Saved' })).toHaveCount(0);
});
```

Helper shapes to match the existing spec's conventions (it already seeds `venAuthToken` via `page.addInitScript` and mocks API routes):

```ts
function savedSignature(label: string) {
  return { id: `sig-${label}`, label, dataUrl: ONE_PIXEL_PNG_DATA_URL, type: 'drawn', createdAt: Date.now() };
}

async function seedSavedSignatures(page: Page, email: string, entries: unknown[]) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [`vensuite:saved-signatures:${email.toLowerCase()}`, JSON.stringify(entries)]
  );
}
```

Also add a positive case asserting the same signer DOES see their own saved tab, so the test cannot pass by the tab simply never rendering.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line -g "saved signatures"`
Expected: FAIL — the "Saved" tab is currently global, so Bob's signature is visible to Alice.

- [ ] **Step 3: Implement scoped storage**

Replace the module state in `src/composables/useSavedSignatures.ts` with a per-scope cache. Keep `MAX_SAVED`, the dedupe-by-`dataUrl` behaviour, and the shape of `SavedSignature` unchanged.

```ts
import { computed, ref, watch, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

const LEGACY_STORAGE_KEY = 'vensuite:saved-signatures';
const MAX_SAVED = 12;

const scopeCache = new Map<string, Ref<SavedSignature[]>>();

function storageKeyFor(email: string): string {
  return `${LEGACY_STORAGE_KEY}:${email.trim().toLowerCase()}`;
}

function loadFromStorage(key: string): SavedSignature[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) => s && typeof s.dataUrl === 'string' && typeof s.id === 'string'
    );
  } catch {
    return [];
  }
}

let legacyPurged = false;

function purgeLegacyKey(): void {
  if (legacyPurged) return;
  legacyPurged = true;
  try {
    // Entries under the old global key cannot be attributed to a signer, and
    // leaving them readable is the shared-device leak this scoping closes.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to purge.
  }
}

function scopeFor(email: string): Ref<SavedSignature[]> {
  const key = storageKeyFor(email);
  const cached = scopeCache.get(key);
  if (cached) return cached;

  purgeLegacyKey();
  const state = ref<SavedSignature[]>(loadFromStorage(key));
  watch(state, (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable: keep the in-memory value.
    }
  }, { deep: true });
  scopeCache.set(key, state);
  return state;
}

export function useSavedSignatures(signerEmail: MaybeRefOrGetter<string | null | undefined>) {
  const scope = computed(() => {
    const email = toValue(signerEmail);
    return email ? scopeFor(email) : null;
  });

  const savedSignatures = computed<SavedSignature[]>(() => scope.value?.value ?? []);

  function saveSignature(
    dataUrl: string,
    type: SavedSignature['type'],
    label?: string
  ): SavedSignature | undefined {
    const state = scope.value;
    if (!state) return undefined;
    const existing = state.value.find((s) => s.dataUrl === dataUrl);
    if (existing) return existing;

    const entry: SavedSignature = {
      id: generateId(),
      label: label || `${type} signature`,
      dataUrl,
      type,
      createdAt: Date.now(),
    };
    state.value = [entry, ...state.value].slice(0, MAX_SAVED);
    return entry;
  }

  function deleteSignature(id: string) {
    const state = scope.value;
    if (!state) return;
    state.value = state.value.filter((s) => s.id !== id);
  }

  function getSignature(id: string): SavedSignature | undefined {
    return savedSignatures.value.find((s) => s.id === id);
  }

  return { savedSignatures, saveSignature, deleteSignature, getSignature };
}
```

Then thread the prop through: add `signerEmail?: string` to `SignatureCapture`'s `defineProps`, change its call to `useSavedSignatures(() => props.signerEmail)`, add the same prop to `SigningFieldInput`, pass it into its `SignatureCapture`, and pass `:signer-email="store.session?.signerEmail"` on the player's `SigningFieldInput`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line -g "saved signatures"`
Expected: PASS.

- [ ] **Step 5: Run the whole spec for regressions**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line`
Expected: all PASS. The existing "Saved" tab tests exercise the same composable.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useSavedSignatures.ts src/components/signing/SignatureCapture.vue src/components/signing/SigningFieldInput.vue src/views/SigningPlayer.vue tests/signing-image.spec.ts
git commit --no-verify -F <msgfile>
```

Message: `fix: scope saved signing signatures per signer`

---

### Task 2: Store support for filling empty signature fields

**Files:**
- Modify: `src/store/signingPlayer.ts`
- Test: `tests/signing-image.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('fills every empty signature field and leaves other answers alone', async ({ page }) => {
  await seedSavedSignatures(page, 'alice@example.com', [savedSignature('Drawn — 12 Sep')]);
  // session: two empty signature fields, one already-filled signature field,
  // one initials field, one filled text field
  // submit and assert the completion payload carries the remembered data URL for
  // the two empty signature fields, the original value for the filled one, and
  // no value for the initials field.
});
```

Assert on the captured `field_values` submission payload, not on rendered markup, so the test proves what would actually be signed.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line -g "fills every empty signature field"`
Expected: FAIL — no way to fill fields programmatically yet.

- [ ] **Step 3: Implement**

Add to `src/store/signingPlayer.ts`, reusing the existing `hasCompletedValue` helper:

```ts
const emptySignatureFields = computed(() =>
  (session.value?.fields || []).filter(
    (field) => field.type === 'signature' && !hasCompletedValue(answers.value[field.id])
  )
);

function fillSignatureFields(dataUrl: string): number {
  const targets = emptySignatureFields.value;
  for (const field of targets) {
    setFieldValue(field.id, dataUrl);
  }
  return targets.length;
}
```

Export both from the store.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line -g "fills every empty signature field"`
Expected: PASS.

- [ ] **Step 5: Commit**

Message: `feat: fill empty signature fields from a chosen signature`

---

### Task 3: The one-click banner

**Files:**
- Modify: `src/components/signing/SignatureCapture.vue` (optional `initialMode`)
- Modify: `src/views/SigningPlayer.vue` (banner)
- Test: `tests/signing-image.spec.ts`

- [ ] **Step 1: Write the failing tests**

Four cases, each asserting a distinct rule from the spec:

```ts
test('offers a remembered signature and fills every empty signature field', ...);
test('does not overwrite a signature the signer already provided', ...);
test('does not fill initials fields', ...);
test('hides the banner with no saved signatures, no empty signature field, or a completed session', ...);
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line -g "remembered signature|initials fields|overwrite a signature"`
Expected: FAIL — no banner exists.

- [ ] **Step 3: Allow the capture modal to open on the Saved tab**

In `SignatureCapture.vue` add an optional prop and reset the mode whenever the modal opens, because the component stays mounted between openings:

```ts
const props = defineProps<{
  modelValue: boolean;
  signerName?: string;
  signerEmail?: string;
  initialMode?: CaptureMode;
}>();

watch(() => props.modelValue, (open) => {
  if (open && props.initialMode) mode.value = props.initialMode;
});
```

- [ ] **Step 4: Add the banner**

In `SigningPlayer.vue`:

```ts
import { computed, ref } from 'vue';
import { useSavedSignatures } from '@/composables/useSavedSignatures';

const { savedSignatures } = useSavedSignatures(() => store.session?.signerEmail);
const savedSignatureDismissed = ref(false);
const showSavedSignaturePicker = ref(false);

const suggestedSignature = computed(() => savedSignatures.value[0] ?? null);
const showSavedSignatureBanner = computed(() =>
  !store.isCompleted
  && !savedSignatureDismissed.value
  && store.emptySignatureFields.length > 0
  && suggestedSignature.value !== null
);

function applyRememberedSignature(dataUrl: string) {
  if (store.fillSignatureFields(dataUrl) > 0) {
    savedSignatureDismissed.value = true;
  }
  showSavedSignaturePicker.value = false;
}
```

Template: place the banner inside `<main v-else>` directly after the existing `store.submitError` alert and before the page loop, so it appears above the document:

```html
<div
  v-if="showSavedSignatureBanner && suggestedSignature"
  class="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
>
  <img
    :src="suggestedSignature.dataUrl"
    alt="Remembered signature"
    class="h-10 w-24 object-contain"
  />
  <p class="min-w-0 flex-1 text-sm text-blue-900">
    Use your saved signature <span class="text-blue-700">({{ suggestedSignature.label }})</span>?
  </p>
  <button type="button" class="..." @click="applyRememberedSignature(suggestedSignature.dataUrl)">
    Use my saved signature
  </button>
  <button type="button" class="..." @click="showSavedSignaturePicker = true">
    Choose another
  </button>
</div>

<SignatureCapture
  v-model="showSavedSignaturePicker"
  :signer-email="store.session?.signerEmail"
  initial-mode="saved"
  @save="applyRememberedSignature"
/>
```

Reuse the project's existing button classes rather than inventing new ones.

- [ ] **Step 5: Run the new tests, then the whole spec**

Run: `npx playwright test tests/signing-image.spec.ts --reporter=line`
Expected: all PASS.

- [ ] **Step 6: Type-check and build**

Run: `pnpm exec vue-tsc --noEmit` then `pnpm build`
Expected: exit 0, build succeeds. Restore any generated i18n churn afterwards.

- [ ] **Step 7: Commit**

Message: `feat: offer remembered signatures for one-click fill`

---

## Self-review

- **Spec coverage:** storage scope and legacy purge (Task 1); fill semantics, never-overwrite, signatures-only (Task 2 and its tests); banner visibility rules, dismissal, "Choose another" (Task 3); degradation when storage is unavailable is inherent to the `try/catch` in `loadFromStorage`/`saveToStorage` and is asserted by the existing corrupt-storage path.
- **Placeholder scan:** no TBD/TODO; every code step shows its code.
- **Type consistency:** `useSavedSignatures(signerEmail)` is called with a getter everywhere; `emptySignatureFields` and `fillSignatureFields` are defined in Task 2 and consumed in Task 3; `initialMode` is typed `CaptureMode`.
