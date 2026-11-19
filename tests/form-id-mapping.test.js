import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSavedFormIds } from '../src/utils/formIdMapping.js';

test('maps temporary page and question identifiers to persisted ids by page order', () => {
  const result = mapSavedFormIds([{id:'p', question_order:['a','b']}], [{id:'7',question_order:['11','12']}]);
  assert.deepEqual(result, {pages:{p:'7'}, questions:{a:'11',b:'12'}});
});
