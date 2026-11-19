import test from 'node:test';
import assert from 'node:assert/strict';
import { getChoiceLabels, normalizeFormOptions } from '../src/utils/formOptions.js';
test('preserves option values and labels for rendering and conditions', () => {
  assert.deepEqual(normalizeFormOptions([{value:'yes-value',label:'Yes'}, 'Maybe']), [{value:'yes-value',label:'Yes'},{value:'Maybe',label:'Maybe'}]);
});


test('preserves zero-valued choices and gives a blank label a visible fallback', () => {
  assert.deepEqual(normalizeFormOptions([{ value: 0, label: 'Zero' }, { value: 'yes', label: ' ' }, '']), [
    { value: '0', label: 'Zero' },
    { value: 'yes', label: 'yes' },
    { value: '', label: 'Option 3' },
  ]);
});

test('decodes stored checkbox selections and preserves unknown historic values', () => {
  const options = normalizeFormOptions([{ value: 0, label: 'Very satisfied' }, { value: 'remote', label: 'Remote' }]);
  assert.equal(getChoiceLabels(0, options), 'Very satisfied');
  assert.deepEqual(getChoiceLabels('["remote",0,"retired"]', options, true), ['Remote', 'Very satisfied', 'retired']);
  assert.deepEqual(getChoiceLabels('[]', options, true), []);
});
