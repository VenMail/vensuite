import { test, expect, type Page, type Route } from '@playwright/test';
import { minimalPdfBytes, onePixelPng } from './fixtures/pdfFixtures';

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

async function mockDocument(page: Page): Promise<void> {
  await page.route(DOCUMENT_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: CORS_HEADERS,
      body: minimalPdfBytes(),
    })
  );
}

async function mockEditorSession(
  page: Page,
  fields: Array<Record<string, unknown>>,
  signers: Array<Record<string, unknown>>
): Promise<void> {
  await page.route(`**/api/signing/editor/${REQUEST_ID}`, (route) =>
    fulfillJson(route, {
      id: REQUEST_ID,
      documentUrl: DOCUMENT_URL,
      documentName: 'Passport Form.pdf',
      pageCount: 1,
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
  await page.route(`**/api/composer/signing/${REQUEST_ID}/image`, async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillPreflight(route);
    return fulfillJson(route, { url: `${SIGNING_ORIGIN}/storage/${storedPath}`, path: storedPath });
  });

  await page.goto(`${APP}/signing/editor/${REQUEST_ID}?token=${EDITOR_TOKEN}`);

  await page.getByTestId('add-stamp-field').click();
  await page.getByTestId('stamp-file-input').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: onePixelPng(),
  });

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
