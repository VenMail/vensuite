import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveQueue } from '../src/utils/formSaveQueue.js';
test('saves run in order without overlapping', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const calls = [];
  const queue = createSaveQueue();
  const a = queue(async () => { calls.push('first start'); await blocked; calls.push('first end'); });
  const b = queue(async () => { calls.push('second'); });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, ['first start']);
  release(); await Promise.all([a,b]);
  assert.deepEqual(calls, ['first start','first end','second']);
});
