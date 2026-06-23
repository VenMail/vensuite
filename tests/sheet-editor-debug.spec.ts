import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5173';

test.use({
  viewport: { width: 1440, height: 900 },
  actionTimeout: 15000,
  navigationTimeout: 30000,
});

test('debug sheet editor rendering', async ({ page }) => {
  // Capture console logs
  const logs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(`[Console] ${text}`);
  });
  page.on('pageerror', err => {
    console.log(`[Page Error] ${err.message}`);
  });

  // Navigate to new sheet
  console.log('[Debug] Navigating to /sheets/new');
  await page.goto(`${BASE}/sheets/new`, { waitUntil: 'networkidle', timeout: 30000 });

  // Check current URL
  const url = page.url();
  console.log(`[Debug] Current URL: ${url}`);

  // Wait a bit for Vue to mount
  await page.waitForTimeout(5000);

  // Wait for Vue to be ready (check for #app or [data-v-app])
  const hasVueApp = await page.locator('#app, [data-v-app]').count();
  console.log(`[Debug] Vue app elements: ${hasVueApp}`);

  // Take screenshot
  await page.screenshot({ path: 'artifacts/screenshots/sheet-editor-debug.png', fullPage: true });

  // Get page HTML
  const html = await page.content();
  console.log('[Debug] Page HTML length:', html.length);

  // Check for key elements
  const bodyClasses = await page.locator('body').evaluate(el => el.className);
  console.log(`[Debug] Body classes: ${bodyClasses}`);

  // Look for vtable-related elements
  const vtableElements = await page.locator('[class*="vtable"]').count();
  console.log(`[Debug] Elements with "vtable" in class: ${vtableElements}`);

  // Look for sheet-related elements
  const sheetElements = await page.locator('[class*="sheet"]').count();
  console.log(`[Debug] Elements with "sheet" in class: ${sheetElements}`);

  // Look for the specific container
  const specificContainer = await page.locator('.vtable-sheet-container').count();
  console.log(`[Debug] .vtable-sheet-container count: ${specificContainer}`);

  // Get ALL div class names to find the actual container
  const allDivs = await page.locator('div').evaluateAll(els =>
    els.slice(0, 30).map(el => ({
      class: el.className,
      id: el.id,
      childCount: el.children.length,
      tagName: el.tagName,
      parentClass: el.parentElement?.className?.slice(0, 50)
    }))
  );
  console.log('[Debug] First 30 divs:', JSON.stringify(allDivs, null, 2));

  // Check for canvas elements (VTable uses canvas)
  const canvasCount = await page.locator('canvas').count();
  console.log(`[Debug] Canvas elements: ${canvasCount}`);

  // Check for the main content area
  const mainContent = await page.locator('.flex-1.relative.overflow-hidden').count();
  console.log(`[Debug] Main content area: ${mainContent}`);

  // Check for loading spinner
  const loadingSpinner = await page.locator('.animate-spin').count();
  console.log(`[Debug] Loading spinners: ${loadingSpinner}`);

  // Check innerHTML of the main flex container
  const mainContainer = await page.locator('.flex-1.relative.overflow-hidden').first();
  if (await mainContainer.isVisible().catch(() => false)) {
    const innerHTML = await mainContainer.evaluate(el => el.innerHTML.slice(0, 1000));
    console.log('[Debug] Main container HTML:', innerHTML);
  }

  // Get all class names containing 'container'
  const containerElements = await page.locator('[class*="container"]').evaluateAll(els =>
    els.map(el => el.className).slice(0, 10)
  );
  console.log('[Debug] Container class names (first 10):', containerElements);

  // Check if we're on login page
  const hasLogin = await page.locator('text=/login|sign in|email/i').first().isVisible().catch(() => false);
  console.log(`[Debug] On login page: ${hasLogin}`);

  // Check page title
  const title = await page.title();
  console.log(`[Debug] Page title: ${title}`);

  // Get body children structure
  const structure = await page.locator('body').evaluate(el => {
    return Array.from(el.children).map(child => ({
      tag: child.tagName,
      id: child.id,
      class: child.className.slice(0, 100),
      childCount: child.children.length
    })).slice(0, 10);
  });
  console.log('[Debug] Body structure:', JSON.stringify(structure, null, 2));
});
