import { test, expect, type Page, type Request, type Route } from '@playwright/test';
import { minimalPdfBytes, multiPagePdfBytes, onePixelPng } from './fixtures/pdfFixtures';

const APP = process.env.TEST_BASE_URL || 'http://localhost:5173';
const SIGNING_ORIGIN = (process.env.VITE_SIGNING_API_BASE_URL || 'http://localhost:8000').replace(
  /\/api\/v1\/?$/,
  ''
);

const REQUEST_ID = 'req-123';
const EDITOR_TOKEN = 'editor-token-abc';
const SIGNER_TOKEN = 'signer-token-abc';
const DOCUMENT_URL = `${SIGNING_ORIGIN}/api/signing/editor/${REQUEST_ID}/document`;
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

interface SavedTemplate {
  signing_fields: Array<Record<string, unknown>>;
  signers: Array<Record<string, unknown>>;
}

interface CapturedRequest {
  request: Request | null;
}

async function captureMultipartRequest(
  page: Page,
  url: string,
  responsePayload: unknown
): Promise<CapturedRequest> {
  const captured: CapturedRequest = { request: null };

  await page.route(url, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    captured.request = route.request();
    return fulfillJson(route, responsePayload);
  });

  return captured;
}

function expectMultipartFileRequest(
  request: Request,
  filename: string,
  magicBytes: number[],
  emptyJsonPart: string
): void {
  expect(request.headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/);

  const body = request.postDataBuffer();
  expect(body).not.toBeNull();
  if (!body) return;

  const rawBody = body.toString('latin1');
  expect(rawBody).toContain(`filename="${filename}"`);
  expect(body.includes(Buffer.from(magicBytes))).toBe(true);
  expect(rawBody).not.toContain(emptyJsonPart);
}

function expectMultipartImageRequest(request: Request, filename: string): void {
  expectMultipartFileRequest(request, filename, [0x89, 0x50, 0x4e, 0x47], '"image":{}');
}

async function fulfillJson(route: Route, payload: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  });
}

async function fulfillPreflight(route: Route): Promise<void> {
  await route.fulfill({
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-signing-editor-token, authorization',
    },
    body: '',
  });
}

async function mockSignerImage(page: Page, signerToken: string, fieldId: string): Promise<void> {
  await page.route(`**/api/signing/image/${signerToken}/${fieldId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: CORS_HEADERS,
      body: onePixelPng(),
    })
  );
}

async function mockDocument(page: Page, pdfBytes: Buffer = minimalPdfBytes()): Promise<void> {
  await page.route(DOCUMENT_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: CORS_HEADERS,
      body: pdfBytes,
    })
  );
}

async function mockEditorSession(
  page: Page,
  fields: Array<Record<string, unknown>>,
  signers: Array<Record<string, unknown>>,
  pageCount = 1
): Promise<void> {
  await page.route(`**/api/signing/editor/${REQUEST_ID}`, (route) =>
    fulfillJson(route, {
      id: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount,
      fields,
      signers,
    })
  );
}

async function captureSavedTemplate(page: Page): Promise<{ value: SavedTemplate | null }> {
  const captured: { value: SavedTemplate | null } = { value: null };

  await page.route(`**/api/composer/signing/${REQUEST_ID}/save-template`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    captured.value = route.request().postDataJSON() as SavedTemplate;
    return fulfillJson(route, {
      signing_request_id: REQUEST_ID,
      field_count: captured.value.signing_fields.length,
      signers: captured.value.signers,
    });
  });

  return captured;
}

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.addInitScript(() => {
    localStorage.setItem('venAuthToken', 'playwright-test-token');
  });
});

test('does not log out the app when an expired signer image token returns 401', async ({ page }) => {
  const expiredMessage = 'Invalid or expired signing link';

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
        },
      ],
    })
  );
  await page.route(`**/api/signing/upload-image/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, { error: expiredMessage }, 401)
  );

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  await page.getByTestId('signer-image-input').setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect(page.getByRole('alert')).toContainText(expiredMessage);
  await expect(page).toHaveURL(new RegExp(`/signing/sign/${SIGNER_TOKEN}$`));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('venAuthToken'))).toBe('playwright-test-token');
});

test('still logs out the app for a 401 from a normal app API route', async ({ page }) => {
  await page.goto(`${APP}/home`);
  await page.evaluate(() => localStorage.setItem('venAuthToken', 'playwright-test-token'));
  await page.reload();
  await page.route('**/api/v1/protected-resource', (route) =>
    fulfillJson(route, { message: 'Unauthenticated.' }, 401)
  );

  const result = await page.evaluate(async () => {
    const { apiClient } = await import('/src/services/apiClient.ts');
    try {
      await apiClient.get('/api/v1/protected-resource');
      return { status: 200 };
    } catch (error: any) {
      return { status: error?.status };
    }
  });

  expect(result).toEqual({ status: 401 });
  await expect.poll(() => new URL(page.url()).pathname).toBe('/login');
  expect(await page.evaluate(() => localStorage.getItem('venAuthToken'))).toBeNull();
});

test('opens a tokenized signing editor for a guest session', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await mockDocument(page);
    await mockEditorSession(page, [], [
      { email: 'alice@example.com', name: 'Alice Example', color: '#3B82F6' },
    ]);

    await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);

    await expect(page).toHaveURL(new RegExp(`/signing/editor/${REQUEST_ID}\\?token=${EDITOR_TOKEN}$`));
    await expect(page.getByRole('heading', { name: 'Passport Form.pdf' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('shows an invalid-token editor error without redirecting a guest to login', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.route(`**/api/signing/editor/${REQUEST_ID}`, (route) =>
      fulfillJson(route, { error: 'Invalid or expired editor link' }, 401)
    );

    await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=invalid-editor-token`);

    await expect(page).toHaveURL(/\/signing\/editor\/req-123\?token=invalid-editor-token$/);
    await expect(page.getByText('Invalid or expired editor link')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('places palette fields on the page the sender is viewing', async ({ page }) => {
  await mockDocument(page, multiPagePdfBytes());
  await mockEditorSession(
    page,
    [],
    [{ email: 'alice@example.com', name: 'Alice Example', color: '#3B82F6' }],
    2
  );
  const saved = await captureSavedTemplate(page);

  await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);
  await expect(page.locator('.pdf-page')).toHaveCount(2);

  await page.locator('.pdf-page').nth(1).click();
  await page.getByTestId('add-image-field').click();
  await page.locator('.pdf-page').nth(0).click();
  await page.getByRole('button', { name: /Signature/ }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect.poll(() => saved.value?.signing_fields.length).toBe(2);
  expect(saved.value!.signing_fields.map(field => field.pageIndex)).toEqual([1, 0]);
});

test('places image fields for two different signers and saves them', async ({ page }) => {
  await mockDocument(page);
  await mockEditorSession(page, [], [
    { email: 'alice@example.com', name: 'Alice Example', color: '#3B82F6' },
    { email: 'bob@example.com', name: 'Bob Example', color: '#10B981' },
  ]);
  const saved = await captureSavedTemplate(page);

  await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);

  await page.getByTestId('add-image-field').click();
  await page.getByText('bob@example.com').click();
  await page.getByTestId('add-image-field').click();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect.poll(() => saved.value?.signing_fields.length).toBe(2);

  const fields = saved.value!.signing_fields;
  expect(fields[0]).toMatchObject({ type: 'image', signerEmail: 'alice@example.com', required: true });
  expect(fields[1]).toMatchObject({ type: 'image', signerEmail: 'bob@example.com', required: true });
  expect(fields[0].src).toBeUndefined();
  expect(fields[0].path).toBeUndefined();
});

test('uploads a stamp image and saves it without a signer', async ({ page }) => {
  const storedPath = `signing-images/${REQUEST_ID}/static/logo.png`;

  await mockDocument(page);
  await mockEditorSession(page, [], [
    { email: 'alice@example.com', name: 'Alice Example', color: '#3B82F6' },
  ]);
  const saved = await captureSavedTemplate(page);
  const upload = await captureMultipartRequest(
    page,
    `**/api/composer/signing/${REQUEST_ID}/image`,
    { url: `${SIGNING_ORIGIN}/storage/${storedPath}`, path: storedPath }
  );

  await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);

  await page.getByTestId('add-stamp-field').click();
  await page.getByTestId('stamp-file-input').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect.poll(() => upload.request !== null).toBe(true);
  expectMultipartImageRequest(upload.request!, 'logo.png');

  await page.getByRole('button', { name: 'Done' }).click();

  await expect.poll(() => saved.value?.signing_fields.length).toBe(1);
  const field = saved.value!.signing_fields[0];
  expect(field).toMatchObject({ type: 'image', path: storedPath, required: false });
  expect(field.signerEmail ?? '').toBe('');
});

test('renders placed image fields when the editor is reopened', async ({ page }) => {
  const staticPath = `signing-images/${REQUEST_ID}/static/logo.png`;

  await mockDocument(page);
  await mockEditorSession(
    page,
    [
      {
        id: 'alice-passport',
        type: 'image',
        pageIndex: 0,
        x: 10,
        y: 20,
        width: 25,
        height: 10,
        signerEmail: 'alice@example.com',
        label: 'Passport photo',
        required: true,
      },
      {
        id: 'company-logo',
        type: 'image',
        pageIndex: 0,
        x: 5,
        y: 5,
        width: 20,
        height: 8,
        required: false,
        src: `${SIGNING_ORIGIN}/storage/${staticPath}`,
        path: staticPath,
      },
    ],
    [{ email: 'alice@example.com', name: 'Alice Example', color: '#3B82F6' }]
  );

  await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);

  await expect(page.getByText('Passport photo')).toBeVisible();
  await expect(page.locator('img[alt="Placed image"]')).toHaveAttribute(
    'src',
    `${SIGNING_ORIGIN}/storage/${staticPath}`
  );
});

test('uploads the signer image as real multipart form data', async ({ page }) => {
  const storedPath = `signing-images/${REQUEST_ID}/fields/passport.png`;

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
        },
      ],
    })
  );
  const upload = await captureMultipartRequest(
    page,
    `**/api/signing/upload-image/${SIGNER_TOKEN}`,
    { url: `${SIGNING_ORIGIN}/storage/${storedPath}`, path: storedPath }
  );
  await mockSignerImage(page, SIGNER_TOKEN, 'alice-passport');

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  await page.getByTestId('signer-image-input').setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect.poll(() => upload.request !== null).toBe(true);
  expectMultipartImageRequest(upload.request!, 'passport.png');
  await expect(page.locator('img[alt="Passport photo"]')).toHaveAttribute(
    'src',
    `${SIGNING_ORIGIN}/api/signing/image/${SIGNER_TOKEN}/alice-passport`
  );
});

test('sends the client-filled PDF as real multipart form data', async ({ page }) => {
  const completion = await captureMultipartRequest(
    page,
    `**/api/signing/complete/${SIGNER_TOKEN}`,
    {
      status: 'completed',
      message: 'Signed',
      signedDocumentReady: true,
      downloadUrl: null,
    }
  );

  const result = await page.evaluate(
    async ({ signerToken, pdfBytes }) => {
      const { signingApi } = await import('/src/services/signing.ts');
      return signingApi.submitCompletion(
        signerToken,
        [{ fieldId: 'alice-signature', value: 'signed' }],
        new Uint8Array(pdfBytes)
      );
    },
    { signerToken: SIGNER_TOKEN, pdfBytes: Array.from(minimalPdfBytes()) }
  );

  await expect.poll(() => completion.request !== null).toBe(true);
  expectMultipartFileRequest(
    completion.request!,
    'filled.pdf',
    [0x25, 0x50, 0x44, 0x46],
    '"filled_pdf":{}'
  );
  expect(result.status).toBe('completed');
});

test('prepares signing requests as real multipart form data', async ({ page }) => {
  const preparedSigningRequest = {
    id: REQUEST_ID,
    document_name: 'Contract.pdf',
    status: 'draft',
    document_url: `${SIGNING_ORIGIN}/api/signing/editor/${REQUEST_ID}/document`,
    editor_url: `${SIGNING_ORIGIN}/signing/editor/${REQUEST_ID}`,
    editor_token: EDITOR_TOKEN,
    signers: [{ name: 'Alice Example', email: 'alice@example.com', status: 'pending' }],
    created_at: '2026-09-24T00:00:00Z',
  };
  const prepare = await captureMultipartRequest(
    page,
    '**/api/v1/signing-requests/prepare',
    { data: preparedSigningRequest }
  );

  const result = await page.evaluate(async ({ pdfBytes }) => {
    const { signingApi } = await import('/src/services/signing.ts');
    return signingApi.prepareSigningRequest({
      document: new File([new Uint8Array(pdfBytes)], 'contract.pdf', {
        type: 'application/pdf',
      }),
      document_name: 'Contract.pdf',
      signers: [{ name: 'Alice Example', email: 'alice@example.com' }],
      message: 'Please sign',
      send_email: false,
    });
  }, { pdfBytes: Array.from(minimalPdfBytes()) });

  await expect.poll(() => prepare.request !== null).toBe(true);
  expectMultipartFileRequest(
    prepare.request!,
    'contract.pdf',
    [0x25, 0x50, 0x44, 0x46],
    '"document":{}'
  );
  expect(result).toMatchObject({ id: REQUEST_ID, editor_token: EDITOR_TOKEN });
});

test('lets a signer upload their passport image and submits the stored path', async ({ page }) => {
  const storedPath = `signing-images/${REQUEST_ID}/fields/abc123.png`;
  let submitted: { field_values?: Array<{ fieldId: string; value: string }> } | null = null;

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
        },
      ],
    })
  );
  await page.route(`**/api/signing/upload-image/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    return fulfillJson(route, { url: `${SIGNING_ORIGIN}/storage/${storedPath}`, path: storedPath });
  });
  await mockSignerImage(page, SIGNER_TOKEN, 'alice-passport');
  await page.route(`**/api/signing/complete/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    submitted = route.request().postDataJSON();
    return fulfillJson(route, {
      status: 'completed',
      message: 'Signed',
      signedDocumentReady: true,
      downloadUrl: null,
    });
  });

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);

  const submit = page.getByRole('main').getByRole('button', { name: 'Complete Signing' });
  await expect(submit).toBeDisabled();

  await page.getByTestId('signer-image-input').setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect(page.locator('img[alt="Passport photo"]')).toHaveAttribute(
    'src',
    `${SIGNING_ORIGIN}/api/signing/image/${SIGNER_TOKEN}/alice-passport`
  );
  await expect(submit).toBeEnabled();

  await submit.click();

  await expect.poll(() => submitted?.field_values).toEqual([
    { fieldId: 'alice-passport', value: storedPath },
  ]);
});

test('keeps retrying a signer upload past the old three-attempt cutoff', async ({ page }) => {
  let attempts = 0;
  const storedPath = `signing-images/${REQUEST_ID}/fields/retry-passport.png`;

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
        },
      ],
    })
  );
  await page.route(`**/api/signing/upload-image/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    attempts += 1;
    if (attempts <= 7) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        headers: { ...CORS_HEADERS, 'retry-after': '0' },
        body: JSON.stringify({
          code: 'signing_operation_in_progress',
          message: 'Another signing operation is already in progress for this request.',
        }),
      });
    }
    return fulfillJson(route, { url: `${SIGNING_ORIGIN}/storage/${storedPath}`, path: storedPath });
  });
  await mockSignerImage(page, SIGNER_TOKEN, 'alice-passport');

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  await expect(page.getByTestId('signer-image-input')).toBeVisible();
  await page.clock.install();
  await page.getByTestId('signer-image-input').setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect.poll(() => attempts).toBeGreaterThan(0);
  for (let tick = 0; tick < 15; tick += 1) {
    await page.clock.runFor(1000);
    await page.waitForTimeout(10);
  }

  await expect.poll(() => attempts).toBe(8);
  await expect(page.locator('img[alt="Passport photo"]')).toHaveAttribute(
    'src',
    `${SIGNING_ORIGIN}/api/signing/image/${SIGNER_TOKEN}/alice-passport`
  );
});

test('keeps retrying completion past the old three-attempt cutoff', async ({ page }) => {
  let attempts = 0;

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [],
    })
  );
  await page.route(`**/api/signing/complete/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    attempts += 1;
    if (attempts <= 5) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        headers: { ...CORS_HEADERS, 'retry-after': '0' },
        body: JSON.stringify({
          code: 'signing_operation_in_progress',
          message: 'Another signing operation is already in progress for this request.',
        }),
      });
    }
    return fulfillJson(route, {
      status: 'completed',
      message: 'Signed',
      signedDocumentReady: true,
      downloadUrl: null,
    });
  });

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  const submit = page.getByRole('main').getByRole('button', { name: 'Complete Signing' });
  await expect(submit).toBeEnabled();
  await page.clock.install();
  await submit.click();

  await expect.poll(() => attempts).toBeGreaterThan(0);
  for (let tick = 0; tick < 15; tick += 1) {
    await page.clock.runFor(1000);
    await page.waitForTimeout(10);
  }

  await expect.poll(() => attempts).toBe(6);
  await expect(page.getByText('Signing Complete')).toBeVisible();
});

test('stops a signer upload retry loop at its deadline', async ({ page }) => {
  let attempts = 0;

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
        },
      ],
    })
  );
  await page.route(`**/api/signing/upload-image/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    attempts += 1;
    return route.fulfill({
      status: 409,
      contentType: 'application/json',
      headers: { ...CORS_HEADERS, 'retry-after': '0' },
      body: JSON.stringify({ code: 'signing_operation_in_progress' }),
    });
  });

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  await page.clock.install();
  await page.getByTestId('signer-image-input').setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect.poll(() => attempts).toBeGreaterThan(0);
  for (let tick = 0; tick < 30; tick += 1) {
    await page.clock.runFor(1000);
    await page.waitForTimeout(10);
  }

  await expect(page.getByRole('alert')).toBeVisible();
  expect(attempts).toBeGreaterThan(3);
  expect(attempts).toBeLessThanOrEqual(50);
});

test('shows only the image slots assigned to the signing signer', async ({ page }) => {
  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      // The backend filters fields per signer, so Bob's slot is absent here.
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Alice passport',
          required: true,
        },
      ],
    })
  );

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);

  await expect(page.getByTestId('signer-image-input')).toHaveCount(1);
  await expect(page.getByText('Alice passport')).toBeVisible();
  await expect(page.getByText('Bob passport')).toHaveCount(0);
});

test('shows a read-only already-signed state for a completed signer with a persisted image', async ({ page }) => {
  const storedPath = `signing-images/${REQUEST_ID}/fields/completed-passport.png`;

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      signerStatus: 'completed',
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
          value: storedPath,
        },
      ],
    })
  );

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);

  await expect(page.getByText('Already Signed')).toBeVisible();
  await expect(page.getByTestId('signer-image-input')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('button', { name: 'Complete Signing' })).toHaveCount(0);
  const answers = await page.evaluate(async () => {
    const { useSigningPlayerStore } = await import('/src/store/signingPlayer.ts');
    return useSigningPlayerStore().answers;
  });
  expect(answers['alice-passport']).toBe(storedPath);
});

test('blocks Done while a stamp upload is in flight', async ({ page }) => {
  const storedPath = `signing-images/${REQUEST_ID}/static/delayed-logo.png`;

  await mockDocument(page);
  await mockEditorSession(page, [], [
    { email: 'alice@example.com', name: 'Alice Example', color: '#3B82F6' },
  ]);
  const saved = await captureSavedTemplate(page);
  let releaseUpload!: () => void;
  const uploadReleased = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });

  await page.route(`**/api/composer/signing/${REQUEST_ID}/image`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    await uploadReleased;
    return fulfillJson(route, { url: `${SIGNING_ORIGIN}/storage/${storedPath}`, path: storedPath });
  });

  await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);

  const done = page.getByRole('button', { name: 'Done' });
  await page.getByTestId('add-image-field').click();
  await expect(done).toBeEnabled();

  await page.getByTestId('add-stamp-field').click();
  await page.getByTestId('stamp-file-input').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  await expect(done).toBeDisabled();
  releaseUpload();
  await expect(done).toBeEnabled();

  await done.click();
  await expect.poll(() => saved.value?.signing_fields.length).toBe(2);
});

test('shows the signer image validation message when upload is rejected', async ({ page }) => {
  const validationMessage = 'The image may not be greater than 10240 kilobytes.';

  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [
        {
          id: 'alice-passport',
          type: 'image',
          pageIndex: 0,
          x: 10,
          y: 20,
          width: 25,
          height: 10,
          signerEmail: 'alice@example.com',
          label: 'Passport photo',
          required: true,
        },
      ],
    })
  );
  await page.route(`**/api/signing/upload-image/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    return fulfillJson(route, {
      message: 'The given data was invalid.',
      errors: { image: [validationMessage] },
    }, 422);
  });

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  await page.getByTestId('signer-image-input').setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(validationMessage);
});

test('keeps the document visible after a terminal submit failure', async ({ page }) => {
  await mockDocument(page);
  await page.route(`**/api/signing/session/${SIGNER_TOKEN}`, (route) =>
    fulfillJson(route, {
      token: SIGNER_TOKEN,
      signerEmail: 'alice@example.com',
      signerName: 'Alice Example',
      signingRequestId: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
      fields: [],
    })
  );
  await page.route(`**/api/signing/complete/${SIGNER_TOKEN}`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    return fulfillJson(route, { message: 'The signing session has expired.' }, 422);
  });

  await page.goto(`${APP}/signing/sign/${SIGNER_TOKEN}`);
  const main = page.getByRole('main');
  const submit = main.getByRole('button', { name: 'Complete Signing' });
  await expect(main).toBeVisible();
  await expect(submit).toBeEnabled();

  await submit.click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('The signing session has expired.');
  await expect(main).toBeVisible();
  await expect(submit).toBeEnabled();
  await expect(page.getByText('Unable to load document')).toHaveCount(0);

  await alert.getByRole('button', { name: 'Dismiss submission error' }).click();
  await expect(alert).toHaveCount(0);
});
