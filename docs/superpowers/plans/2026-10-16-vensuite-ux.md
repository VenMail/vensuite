# VenSuite UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a functional signing dashboard, a focused All Files landing experience, a horizontal canvas ruler preference, and reliable secure collaboration connections.

**Architecture:** The work stays in the Vue application. Presentation-derived filtering and suggestions live in small pure helpers; views consume them without changing the mailer API. Canvas Editor receives its ruler setting through the existing document-settings boundary, and WebSocket URLs are normalized before a connection opens.

**Tech Stack:** Vue 3, TypeScript, Pinia, canvas-editor, WebSocket, Node test runner.

---

### Task 1: Signing dashboard presentation

**Files:**
- Create: `src/lib/signingDashboard.ts`
- Create: `tests/signing-dashboard.test.mts`
- Modify: `src/views/SigningDocuments.vue`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { filterSigningRequests, signingCounts } from '../src/lib/signingDashboard.ts'

test('separates in-progress requests from completed requests', () => {
  const requests = [{ status: 'draft' }, { status: 'pending' }, { status: 'completed' }]
  assert.equal(filterSigningRequests(requests, 'in-progress').length, 2)
  assert.deepEqual(signingCounts(requests), { all: 3, drafts: 1, pending: 1, signed: 1 })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/signing-dashboard.test.mts`

- [ ] **Step 3: Implement the helper and dashboard**

```ts
export function filterSigningRequests<T extends { status: string }>(requests: T[], filter: 'all' | 'in-progress' | 'signed') {
  if (filter === 'signed') return requests.filter((request) => request.status === 'completed')
  if (filter === 'in-progress') return requests.filter((request) => request.status !== 'completed')
  return requests
}
```

Use the helper for All, In progress, and Signed tabs. Render summary counts and requests in rows with draft, pending, completed, editor, send, open, and download actions supplied by the existing API data.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test tests/signing-dashboard.test.mts`

### Task 2: All Files landing surface

**Files:**
- Create: `src/lib/fileSuggestions.ts`
- Create: `tests/file-suggestions.test.mts`
- Modify: `src/views/Home.vue`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestedFiles } from '../src/lib/fileSuggestions.ts'

test('prefers recently accessed non-folder files', () => {
  const result = suggestedFiles([{ id: 'folder', is_folder: true }, { id: 'doc', updated_at: '2026-10-16T10:00:00Z' }])
  assert.deepEqual(result.map((file) => file.id), ['doc'])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/file-suggestions.test.mts`

- [ ] **Step 3: Implement the helper and replace duplicate overview**

```ts
export function suggestedFiles<T extends { is_folder?: boolean }>(files: T[]) {
  return files.filter((file) => !file.is_folder).slice(0, 10)
}
```

Remove the duplicated All Files title and UI narration. Add a responsive Suggested files card strip and retain the existing file list, sorting, selection, and creation controls.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test tests/file-suggestions.test.mts`

### Task 3: Canvas ruler and secure collaboration URL

**Files:**
- Create: `src/lib/socketUrl.ts`
- Create: `tests/socket-url.test.mts`
- Modify: `src/composables/useCanvasDocsEditor.ts`
- Modify: `src/components/docs/CanvasEditorCore.vue`
- Modify: `src/components/menu/UnifiedMenubar.vue`
- Modify: `src/views/DocsEditor.vue`
- Modify: `src/lib/wsService.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { secureSocketUrl } from '../src/lib/socketUrl.ts'

test('upgrades insecure production socket origins', () => {
  assert.equal(secureSocketUrl('ws://w.venmail.io:8443'), 'wss://w.venmail.io:8443')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/socket-url.test.mts`

- [ ] **Step 3: Implement the smallest boundary changes**

```ts
export function secureSocketUrl(input: string) {
  const url = new URL(input)
  if (url.protocol === 'ws:' && globalThis.location?.protocol === 'https:') url.protocol = 'wss:'
  return url.toString().replace(/\/$/, '')
}
```

Expose `showHorizontalRuler` on canvas page settings, add a checked Page-menu item, pass `isShowRuler` to Canvas Editor, and normalize the URL used by every collaboration composable before `WebSocketService` connects.

- [ ] **Step 4: Run focused tests and TypeScript verification**

Run: `node --experimental-strip-types --test tests/socket-url.test.mts && pnpm exec vue-tsc --noEmit`

### Task 4: Production-safe verification

**Files:**
- Modify: `docker/Dockerfile.socket` only if source inspection confirms the failing health check belongs to this service.

- [ ] **Step 1: Probe the TLS proxy without credentials**

Run a Paramiko-only command that requests `wss://w.venmail.io:8443`; the expected unauthenticated response is HTTP 401, proving TLS and the WebSocket upgrade route are reachable.

- [ ] **Step 2: Run the Vue production build**

Run: `pnpm run build-prod`

- [ ] **Step 3: Review the diff and commit independently verifiable changes**

Run: `git diff --check && git status --short`
