import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routerSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

test('renders signing documents inside the authenticated layout route tree', () => {
  const authenticatedRoutes = routerSource.slice(routerSource.indexOf('component: AuthenticatedLayout'));

  assert.match(authenticatedRoutes, /path: 'signing\/documents', name: 'signing-documents'/);
  assert.doesNotMatch(routerSource.slice(0, routerSource.indexOf('// Authenticated routes with layout')), /path: '\/signing\/documents'/);
});
