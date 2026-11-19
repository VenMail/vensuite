import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFormOptions } from '../src/utils/formOptions.js';
test('preserves option values and labels for rendering and conditions', () => {
  assert.deepEqual(normalizeFormOptions([{value:'yes-value',label:'Yes'}, 'Maybe']), [{value:'yes-value',label:'Yes'},{value:'Maybe',label:'Maybe'}]);
});
