import test from 'node:test';
import assert from 'node:assert/strict';
import { premiumFormTemplates } from '../src/utils/premiumFormTemplates.js';

test('premium templates include ready-to-use questions and distinct themes', () => {
  assert.ok(premiumFormTemplates.length >= 3);
  assert.ok(premiumFormTemplates.every(t => t.blocks.length >= 3 && t.theme.background_pattern && t.theme.primary_color));
  assert.ok(new Set(premiumFormTemplates.map(t => t.theme.background_pattern)).size >= 3);
});
