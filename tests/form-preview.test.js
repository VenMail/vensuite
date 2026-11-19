import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCompletion } from '../src/utils/formPreview.js';

test('preview completion does not invoke submission or payment', async () => {
  let calls = 0;
  const result = await previewCompletion(true, async () => { calls++; return 'submitted'; });
  assert.equal(result, 'preview');
  assert.equal(calls, 0);
});

test('live completion invokes the submission path', async () => {
  const result = await previewCompletion(false, async () => 'submitted');
  assert.equal(result, 'submitted');
});
