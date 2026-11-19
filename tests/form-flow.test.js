import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConditions, visibleQuestionIds } from '../src/utils/formFlow.js';

test('all and any rules compare answers, including multiple choice and numbers', () => {
  const answers = { a: ['blue', 'red'], b: 12 };
  assert.equal(evaluateConditions({ logic_type: 'AND', conditions: [{question_id:'a', operator:'contains', value:'red'}, {question_id:'b', operator:'greater_than', value:'10'}] }, answers), true);
  assert.equal(evaluateConditions({ logic_type: 'OR', conditions: [{question_id:'a', operator:'equals', value:'green'}, {question_id:'b', operator:'less_than', value:'5'}] }, answers), false);
});

test('unanswered conditions do not match negative operators', () => {
  assert.equal(evaluateConditions({logic_type:'AND',conditions:[{question_id:'missing',operator:'not_equals',value:'yes'}]}, {}), false);
});

test('hidden questions cannot satisfy later conditions', () => {
  const questions = [
    { id: 'a' },
    { id: 'b', visibility_condition: { logic_type:'AND', conditions:[{question_id:'a',operator:'equals',value:'yes'}] } },
    { id: 'c', visibility_condition: { logic_type:'AND', conditions:[{question_id:'b',operator:'equals',value:'secret'}] } },
  ];
  assert.deepEqual(visibleQuestionIds(questions, {a:'no',b:'secret'}), ['a']);
});

test('a matching forward jump skips intervening questions', () => {
  const questions = [
    {id:'a', logic:{logic_type:'AND', conditions:[{question_id:'a',operator:'equals',value:'yes'}], actions:[{type:'jump_to_question',target_id:'c'}]}},
    {id:'b'}, {id:'c'},
  ];
  assert.deepEqual(visibleQuestionIds(questions, {a:'yes'}), ['a','c']);
  assert.deepEqual(visibleQuestionIds(questions, {a:'no'}), ['a','b','c']);
});

test('invalid or backward logic is reported before a form is saved', async () => {
  const { validateFormLogic } = await import('../src/utils/formFlow.js');
  assert.deepEqual(validateFormLogic([
    {id:'a', logic:{logic_type:'AND',conditions:[{question_id:'a',operator:'equals',value:'yes'}],actions:[{type:'jump_to_question',target_id:'a'}]}},
    {id:'b', visibility_condition:{logic_type:'AND',conditions:[{question_id:'missing',operator:'equals',value:'x'}]}}
  ]), ['a','b']);
});

test('ordered skip rules select the first matching destination', () => {
  const questions = [
    { id:'a', logic:{ logic_type:'AND', conditions:[{question_id:'a',operator:'equals',value:'one'}], actions:[{type:'jump_to_question',target_id:'c'}], fallbacks:[{logic_type:'AND',conditions:[{question_id:'a',operator:'equals',value:'two'}],actions:[{type:'jump_to_question',target_id:'d'}]}] } },
    {id:'b'}, {id:'c'}, {id:'d'},
  ];
  assert.deepEqual(visibleQuestionIds(questions,{a:'two'}), ['a','d']);
  assert.deepEqual(visibleQuestionIds(questions,{a:'one'}), ['a','c','d']);
});

test('nested condition groups combine all and any recursively', () => {
  const group = {logic_type:'AND', conditions:[{question_id:'a',operator:'equals',value:'yes'}, {logic_type:'OR',conditions:[{question_id:'b',operator:'equals',value:'red'},{question_id:'c',operator:'greater_than',value:'10'}]}]};
  assert.equal(evaluateConditions(group,{a:'yes',b:'blue',c:12}),true);
  assert.equal(evaluateConditions(group,{a:'yes',b:'blue',c:5}),false);
});
