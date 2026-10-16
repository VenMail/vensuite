import { test, expect, type Page, type Route } from '@playwright/test';

const APP = process.env.TEST_BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const API_PATH = new URL(API_BASE, APP).pathname.replace(/\/$/, '');
const DOCUMENT_ID = 'playwright-docs-smoke';
const TYPED_TEXT = 'Canvas editor smoke test';
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

interface MockDocument {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  is_folder: boolean;
  content: string;
  privacy_type: number;
  metadata?: Record<string, unknown>;
}

function documentPayload(content = ''): MockDocument {
  return {
    id: DOCUMENT_ID,
    title: 'Untitled Document',
    file_name: 'Untitled Document.docx',
    file_type: 'docx',
    is_folder: false,
    content,
    privacy_type: 7,
    metadata: {},
  };
}

async function fulfillJson(route: Route, payload: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  });
}

async function mockDocumentApi(page: Page): Promise<void> {
  // Keep the new-document flow local and deterministic. The real editor does not
  // need a backend to mount, but DocsEditor creates and saves a document first.
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/\/$/, '');

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'access-control-allow-headers': 'authorization, content-type',
        },
        body: '',
      });
      return;
    }

    if (pathname === `${API_PATH}/app-files` && request.method() === 'POST') {
      await fulfillJson(route, { data: documentPayload() }, 201);
      return;
    }

    if (pathname.endsWith(`/app-files/${DOCUMENT_ID}/versions`) && request.method() === 'GET') {
      await fulfillJson(route, {
        data: {
          app_file_id: DOCUMENT_ID,
          app_file_title: 'Untitled Document',
          current_version: {},
          versions: [],
          total_versions: 0,
        },
      });
      return;
    }

    if (pathname.endsWith(`/app-files/${DOCUMENT_ID}`) && request.method() === 'GET') {
      await fulfillJson(route, { data: documentPayload() });
      return;
    }

    if (pathname.endsWith(`/app-files/${DOCUMENT_ID}`) && (request.method() === 'PUT' || request.method() === 'POST')) {
      let content = '';
      try {
        const body = request.postDataJSON() as { content?: unknown };
        if (typeof body.content === 'string') content = body.content;
      } catch {
        // The editor still has a valid in-memory document if a request has no body.
      }
      await fulfillJson(route, { data: documentPayload(content) });
      return;
    }

    if (pathname.endsWith('/app-files/enrich-html') && request.method() === 'POST') {
      await fulfillJson(route, { html: '<p>Smoke document</p>' });
      return;
    }

    // File-store startup and other shell requests are not part of this smoke
    // test. Return an empty collection instead of allowing the backend to leak
    // into the test result.
    await fulfillJson(route, { data: [] });
  });

  // DocsEditor opens collaboration for the newly-created document. Keep that
  // channel local; closing it would make the app retry and produce noise.
  await page.routeWebSocket(/^wss:\/\/w\.venmail\.io:8443/, (webSocket) => {
    webSocket.onMessage(() => undefined);
  });
}

test.use({
  viewport: { width: 1440, height: 1000 },
  actionTimeout: 15000,
  navigationTimeout: 30000,
});

test.setTimeout(120000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('venAuthToken', 'playwright-test-token');
  });
});

test('mounts the document editor, renders typing, and exercises undo/contentChange', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console error: ${message.text()}`);
  });

  await mockDocumentApi(page);
  await page.goto(`${APP}/docs/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/docs\/[^/]+\/?$/, { timeout: 15000 });

  const host = page.locator('.canvas-editor-host');
  await expect(host).toBeVisible({ timeout: 20000 });
  await expect(host.locator('[editor-component="main"]')).toHaveCount(1);

  const pageContainer = host.locator('.ce-page-container');
  await expect(pageContainer).toHaveCount(1);
  const renderedPage = pageContainer.locator('canvas[data-index="0"]');
  await expect(renderedPage).toHaveCount(1);
  await expect(renderedPage).toBeVisible();

  const pageSize = await renderedPage.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height };
  });
  expect(pageSize.width).toBeGreaterThan(0);
  expect(pageSize.height).toBeGreaterThan(0);

  const toolbar = page.locator('.docs-canvas-toolbar');
  await expect(toolbar).toBeVisible();
  const undoButton = toolbar.locator('button[title="Undo (Ctrl+Z)"]');
  await expect(undoButton).toBeVisible();

  // The parent stores the ready instance on window in development. Waiting for
  // it exercises the component's ready event and checks the APIs used below.
  const editorState = await page.evaluate(() => {
    const editor = (window as any).__canvasEditor__;
    return {
      version: editor?.version ?? null,
      contentChange: typeof editor?.listener?.contentChange,
      executeUndo: typeof editor?.command?.executeUndo,
      getText: typeof editor?.command?.getText,
    };
  });
  expect(editorState.version).toEqual(expect.any(String));
  expect(editorState.contentChange).toBe('function');
  expect(editorState.executeUndo).toBe('function');
  expect(editorState.getText).toBe('function');

  await page.evaluate(() => {
    const editor = (window as any).__canvasEditor__;
    const originalContentChange = editor.listener.contentChange;
    (window as any).__contentChangeCount = 0;
    editor.listener.contentChange = (...args: unknown[]) => {
      (window as any).__contentChangeCount += 1;
      return originalContentChange(...args);
    };
  });

  await renderedPage.click({ position: { x: 80, y: 100 } });
  await page.waitForTimeout(250);
  const beforeTyping = await renderedPage.evaluate((element) => (element as HTMLCanvasElement).toDataURL());

  await page.keyboard.type(TYPED_TEXT);
  await expect
    .poll(() => page.evaluate(() => (window as any).__canvasEditor__?.command?.getText?.().main ?? ''))
    .toContain(TYPED_TEXT);

  const renderedText = await page.evaluate(() => {
    const editor = (window as any).__canvasEditor__;
    return {
      text: editor.command.getText().main,
      html: editor.command.getHTML().main,
    };
  });
  expect(renderedText.text).toContain(TYPED_TEXT);
  expect(renderedText.html).toContain(TYPED_TEXT);

  // canvas-editor paints the page onto a canvas rather than inserting text DOM;
  // verify that the actual page bitmap changed as well as the document model.
  const afterTyping = await renderedPage.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(afterTyping).not.toBe(beforeTyping);

  await expect
    .poll(() => page.evaluate(() => (window as any).__contentChangeCount ?? 0))
    .toBeGreaterThan(0);

  // Use the same command path as the application toolbar. A missing/renamed
  // executeUndo API leaves the typed text intact and makes this assertion fail.
  await undoButton.click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__canvasEditor__?.command?.getText?.().main ?? ''))
    .not.toContain(TYPED_TEXT);

  // Let the debounced save and any editor-side asynchronous work settle before
  // checking the error gate.
  await page.waitForTimeout(3500);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
