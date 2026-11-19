import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateValue } from '../src/utils/formCalculations.js';
test('calculates from earlier answers and constants', () => {
  assert.equal(calculateValue({operator:'multiply',left:{question_id:'price'},right:{question_id:'quantity'}},{price:'12.5',quantity:'4'}),50);
});
test('missing values and division by zero do not produce a result', () => {
  assert.equal(calculateValue({operator:'divide',left:{question_id:'price'},right:{value:0}},{price:10}),null);
  assert.equal(calculateValue({operator:'add',left:{question_id:'price'},right:{value:1}},{}),null);
});

test('a calculated answer drives branching and ignores the submitted value', async () => {
  const { resolveFormPath } = await import('../src/utils/formFlow.js');
  const questions = [
    { id: 'price' }, { id: 'qty' },
    { id: 'total', type: 'calculated', calculation: { operator: 'multiply', left: { question_id: 'price' }, right: { question_id: 'qty' } } },
    { id: 'large', visibility_condition: { logic_type: 'AND', conditions: [{ question_id: 'total', operator: 'greater_than', value: 20 }] } },
  ];
  assert.deepEqual(resolveFormPath(questions, { price: '12', qty: '3', total: 0 }), {
    visible: ['price', 'qty', 'total', 'large'], answers: { price: '12', qty: '3', total: 36 },
  });
});
