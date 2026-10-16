import assert from 'node:assert/strict';
import test from 'node:test';

import { fileSelectionCheckboxClass } from '../src/lib/fileItemLayout.ts';

test('keeps a grid selection checkbox square when a long filename constrains its row', () => {
  assert.match(fileSelectionCheckboxClass, /\bshrink-0\b/);
});
