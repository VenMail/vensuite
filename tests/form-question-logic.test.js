import test from 'node:test';
import assert from 'node:assert/strict';
import { questionLogic } from '../src/utils/formOptions.js';
test('public and authenticated question payloads retain saved branching rules', () => {
  const rule = {conditions:[], actions:[]};
  assert.equal(questionLogic({config:{logic:rule}}), rule);
});
