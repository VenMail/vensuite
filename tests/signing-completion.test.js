import test from 'node:test';
import assert from 'node:assert/strict';
import { sendSigningCompletion } from '../src/utils/signingCompletion.js';

test('sends completion to the embedding origin without closing the editor', () => {
  const calls = [];
  const parent = { postMessage: (...args) => calls.push(args) };
  const self = { parent, opener: null };
  const data = { type: 'signing-editor-done', signingRequestId: '1' };
  assert.equal(sendSigningCompletion(self, 'https://m.venmail.io/mail', data), true);
  assert.deepEqual(calls, [[data, 'https://m.venmail.io']]);
});

test('does not post without a valid parent origin', () => {
  const parent = { postMessage: () => assert.fail('unexpected post') };
  assert.equal(sendSigningCompletion({ parent, opener: null }, '', {}), false);
  assert.equal(sendSigningCompletion({ parent, opener: null }, 'invalid', {}), false);
});

test('leaves a standalone editor to its existing completion flow', () => {
  const self = {};
  self.parent = self;
  assert.equal(sendSigningCompletion(self, 'https://m.venmail.io/mail', {}), false);
});

test('falls back when the parent cannot receive the message', () => {
  const parent = { postMessage: () => { throw new Error('unavailable'); } };
  assert.equal(sendSigningCompletion({ parent }, 'https://m.venmail.io/mail', {}), false);
  assert.equal(sendSigningCompletion({ parent }, 'data:text/plain,example', {}), false);
});
