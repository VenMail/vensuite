import assert from 'node:assert/strict';
import test from 'node:test';

import { secureSocketUrl } from '../src/lib/socketUrl.ts';

test('upgrades an insecure websocket endpoint on an HTTPS page', () => {
  assert.equal(
    secureSocketUrl('ws://w.venmail.io:8443', 'https:'),
    'wss://w.venmail.io:8443',
  );
});

test('keeps an explicit secure websocket endpoint unchanged', () => {
  assert.equal(
    secureSocketUrl('wss://w.venmail.io:8443?sheetId=doc-1', 'https:'),
    'wss://w.venmail.io:8443?sheetId=doc-1',
  );
});
