# VenSuite signing, files, and canvas collaboration design

## Scope

Improve the VenSuite workspace in four connected areas:

1. Make document signing use the main-app dashboard as the interaction reference while continuing to use the existing signing API.
2. Replace the duplicated All Files overview with a compact activity-first landing surface inspired by Drive's suggested-file treatment.
3. Enable the canvas editor's horizontal ruler through an explicit Page-menu preference.
4. Restore reliable collaborative connections through the secure WebSocket endpoint and verify the production route without restarting production containers.

## Decisions

### Signing

Retain the existing upload, editor, send, signing, download, and delete API calls. Present requests in a single workspace with summary counts, All / In progress / Signed filters, and compact request rows. The uploader remains available beside the request list so each signing request begins with a document and signer list. Completed requests expose open and download actions; drafts expose editor and send actions.

### All Files

Keep one authoritative title in the top bar. Replace the repeated title, status, folder, selection, and view cards with a Suggested files section that prioritizes recently opened, uploaded, and changed documents. Keep creation and upload actions in the existing top bar. The normal file list remains below the suggestions with its existing selection and sorting behavior.

### Canvas editor

Store a `showHorizontalRuler` preference in the document editor's local state. The Page menu controls it through an accessible checked item. Canvas Editor receives the matching `isShowRuler` option at initialization and reinitializes only when that preference changes.

### Collaboration transport

Use the existing HTTPS-safe `VITE_SOCKET_BASE_URL` setting everywhere; the code's secure fallback is `wss://w.venmail.io:8443`. The production WebSocket service already listens on 9088 and the TLS proxy is configured on 8443; the direct unauthenticated probe correctly returns 401. Add client-side URL normalization and connection diagnostics so a malformed or insecure custom value cannot silently disable collaboration. Correct the unrelated container health check in source only after the client path is verified.

## Validation

Use focused unit tests for request filtering, suggested-file selection, socket URL normalization, and canvas options. Run TypeScript checking and the production build. Probe the authenticated WebSocket flow with a non-production test token or browser session; do not restart production containers.
