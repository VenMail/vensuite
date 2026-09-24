# Signing: remembered signature auto-fill

Date: 2026-09-24
Status: approved
Scope: VenSuite frontend only (`src/**`, `tests/signing-image.spec.ts`). No backend change.

## Problem

A signer who signs several documents in a row must redraw their signature on
every one. `SignatureCapture.vue` already remembers every drawn, typed and
uploaded signature (up to 12, newest first) and exposes them in a "Saved" tab,
but nothing fills the document's signature fields for them: they must open each
field, open the modal, and pick a saved signature by hand.

## Goal

Let a signer fill every signature field of a document in one deliberate tap,
using a signature they previously used on that same device, while keeping the
per-document act of signing explicit.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Interaction | One-click fill banner; fields start empty | A signature is a legally binding act, so filling must be an explicit per-document action, not a silent default |
| Storage | Device-local (`localStorage`) | Matches the existing saved-signature store; no signature PII is newly persisted server-side, no new endpoints |
| Field types | `signature` only | An initials slot is small; dropping a full-width signature into it looks wrong and can read as non-compliant |
| Privacy | Per-signer storage key | The current single global key leaks the previous signer's signatures to the next person on a shared device |

## Design

### Storage scope

`useSavedSignatures` currently reads and writes one key,
`vensuite:saved-signatures`, for the whole origin. Change it to key by the
signer's email address as delivered by the signing session:

```
vensuite:saved-signatures:<lowercased signerEmail>
```

Consequences:

- Two people using the same device no longer see or overwrite each other's
  signatures.
- Existing entries under the legacy global key are **dropped on first load**.
  They cannot be attributed to a signer, and retaining them is precisely the
  leak being closed. This is a one-time loss for anyone who has already signed
  on that device.
- The cap of 12 entries, newest-first ordering, and the automatic save on draw /
  type / upload are unchanged.

The email is not new PII on the client: the signing session response already
carries `signerEmail` to the browser. `localStorage` remains readable by any
script on the origin, the same trust level as the `venAuthToken` already stored
there. This is not a secure store and is not being used as one.

### Banner

Rendered by the signing player when both conditions hold:

- the session contains at least one `signature` field with no value, and
- at least one signature is saved for this signer on this device.

Contents: a thumbnail of the most recently saved signature, its label (for
example `Drawn — 12 Sep`), a primary **Use my saved signature** action, and a
secondary *Choose another* affordance.

*Choose another* opens the existing `SignatureCapture` modal directly on its
"Saved" tab. That tab's `mode` is currently component-local with no external
entry point, so the modal needs a minimal way to be opened in that mode from
outside (an optional initial-mode input plus existing v-model open/close).
Picking a signature there fills the field the signer was working on, unchanged
from today's behaviour.

Behaviour:

- Activating it sets the value of every `signature` field that is currently
  empty. Fields the signer has already filled are never overwritten.
- `initials` fields are never touched.
- The banner hides once used, and never appears for a signer whose session is
  already complete (that session renders the read-only "Already Signed" state).
- No consent dialog: the click is the consent, which is why the fields begin
  empty rather than pre-filled.
- Each field stays individually clickable, so a signer can redraw or substitute
  a different saved signature before finishing, exactly as today.

### Data flow

No backend involvement. The stored value is the same base64 PNG data URI the
draw path already produces, so both downstream consumers are unchanged:

- the client-side LibPDF fill path, which draws it into the uploaded PDF, and
- the server overlay path in `GenerateSignedPdfJob`, which embeds it when the
  server generates the document.

```
GET /api/signing/session/{token}      (unchanged)
  -> signerEmail scopes the local store
  -> banner shown when: empty signature field AND saved signature exists
  -> click sets answers for empty signature fields only
  -> existing submit path (unchanged)
```

### Degradation

If `localStorage` is unavailable, full, or holds corrupt JSON, no banner is
shown and signing proceeds exactly as it does today. No error surface is added
for a convenience feature.

## Testing

Playwright, in `tests/signing-image.spec.ts`, written test-first:

1. The banner appears when the session has an empty signature field and a saved
   signature exists for that signer.
2. Activating it fills every empty signature field.
3. Fields the signer already filled are not overwritten.
4. `initials` fields are never filled.
5. No banner when there are no saved signatures, or when no signature field is
   empty, or when the signer has already completed.
6. Privacy regression: signatures saved while signing as
   `alice@example.com` are not offered to `bob@example.com` on the same device.
7. Entries under the legacy global key are not offered after the change.

## Out of scope

- Server-side or cross-device signature storage.
- Auto-filling `initials` fields.
- A pinnable "default signature" distinct from most-recent.
- Changes to the existing Saved tab, its labels, or the 12-entry cap.
- Any consent modal or terms acceptance.
