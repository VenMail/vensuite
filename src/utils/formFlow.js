import { calculateValue } from './formCalculations.js';
export function evaluateConditions(group, answers, depth = 0) {
  if (depth > 20 || !group?.conditions?.length) return false;
  const matches = group.conditions.map((condition) => {
    if (Array.isArray(condition.conditions)) return evaluateConditions(condition, answers, depth + 1);
    const { question_id, operator, value } = condition;
    const answer = answers[question_id];
    if (answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && !answer.length)) return false;
    const a = String(answer), b = String(value ?? '');
    switch (operator) {
      case 'equals': return a === b;
      case 'not_equals': return a !== b;
      case 'contains': return Array.isArray(answer) ? answer.some(item => String(item) === b) : a.includes(b);
      case 'not_contains': return Array.isArray(answer) ? !answer.some(item => String(item) === b) : !a.includes(b);
      case 'greater_than': case 'gt': return b !== '' && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) > Number(b);
      case 'greater_or_equal': case 'gte': return b !== '' && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) >= Number(b);
      case 'less_than': case 'lt': return b !== '' && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) < Number(b);
      case 'less_or_equal': case 'lte': return b !== '' && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) <= Number(b);
      case 'matches_regex':
        if (typeof answer !== 'string' || typeof value !== 'string') return false;
        try { return new RegExp(value).test(answer); } catch { return false; }
      default: return false;
    }
  });
  return String(group.logic_type).toUpperCase() === 'OR' ? matches.some(Boolean) : matches.every(Boolean);
}

export function resolveFormPath(questions, answers) {
  const visible = [];
  const eligibleAnswers = {};
  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    if (question.visibility_condition?.conditions?.length && !evaluateConditions(question.visibility_condition, eligibleAnswers)) continue;
    visible.push(question.id);
    if (question.type === 'calculated') {
      const result = calculateValue(question.calculation, eligibleAnswers);
      if (result !== null) eligibleAnswers[question.id] = result;
    } else if (question.id in answers) eligibleAnswers[question.id] = answers[question.id];
    const rules = question.logic ? [question.logic, ...(question.logic.fallbacks ?? [])] : [];
    const matched = rules.find((rule) => rule.conditions?.length && evaluateConditions(rule, eligibleAnswers));
    if (matched) {
      const action = matched.actions?.[0];
      if (action?.type === 'end_form') break;
      if (action?.type === 'jump_to_question') {
        const target = questions.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.id === action.target_id);
        if (target > index) index = target - 1;
      }
    }
  }
  return { visible, answers: eligibleAnswers };
}
export function visibleQuestionIds(questions, answers) { return resolveFormPath(questions, answers).visible; }
export function validateFormLogic(questions) {
  const positions = new Map(questions.map((question, index) => [question.id, index]));
  return questions.filter((question, index) => {
    const invalidConditions = (group, maxIndex) => !Array.isArray(group.conditions) || !group.conditions.length || group.conditions.some((condition) => {
      if (Array.isArray(condition.conditions)) return invalidConditions(condition, maxIndex);
      const source = positions.get(condition.question_id);
      return source === undefined || source > maxIndex || condition.value === undefined || condition.value === null || condition.value === '';
    });
    const invalidCalculation = (node, depth = 0) => {
      if (!node || depth > 20) return true;
      if ('question_id' in node) { const source = positions.get(node.question_id); return source === undefined || source >= index; }
      if ('value' in node) return node.value === '' || node.value === null || !Number.isFinite(Number(node.value));
      return !['add', 'subtract', 'multiply', 'divide'].includes(node.operator) || invalidCalculation(node.left, depth + 1) || invalidCalculation(node.right, depth + 1);
    };
    if (question.type === 'calculated' && question.calculation && invalidCalculation(question.calculation)) return true;
    if (question.visibility_condition && invalidConditions(question.visibility_condition, index - 1)) return true;
    if (question.logic) {
      return [question.logic, ...(question.logic.fallbacks ?? [])].some((rule) => {
        if (invalidConditions(rule, index)) return true;
        const action = rule.actions?.[0];
        if (action?.type === 'end_form') return false;
        const target = positions.get(action?.target_id);
        return action?.type !== 'jump_to_question' || target === undefined || target <= index;
      });
    }
    return false;
  }).map((question) => question.id);
}

export function remapConditions(group, mapping) {
  return { ...group, conditions: (group.conditions ?? []).map((item) => Array.isArray(item.conditions) ? remapConditions(item, mapping) : { ...item, question_id: mapping[item.question_id] ?? item.question_id }) };
}
export function remapCalculation(node, mapping) {
  if (!node) return node;
  if ('question_id' in node) return { ...node, question_id: mapping[node.question_id] ?? node.question_id };
  if ('operator' in node) return { ...node, left: remapCalculation(node.left, mapping), right: remapCalculation(node.right, mapping) };
  return node;
}
