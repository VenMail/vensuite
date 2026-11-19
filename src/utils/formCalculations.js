function numericOperand(value) {
  if (typeof value === 'string') {
    const decimal = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:e[+-]?[0-9]+)?$/i;
    if (!decimal.test(value.trim())) return null;
    value = Number(value);
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function calculateValue(formula, answers, depth = 0) {
  if (!formula || depth > 20) return null;
  if (Object.prototype.hasOwnProperty.call(formula, 'question_id')) {
    return numericOperand(answers[formula.question_id]);
  }
  if (Object.prototype.hasOwnProperty.call(formula, 'value')) {
    return numericOperand(formula.value);
  }
  const left = calculateValue(formula.left, answers, depth + 1);
  const right = calculateValue(formula.right, answers, depth + 1);
  if (left === null || right === null) return null;
  let result;
  switch (formula.operator) {
    case 'add': result = left + right; break;
    case 'subtract': result = left - right; break;
    case 'multiply': result = left * right; break;
    case 'divide': result = right === 0 ? NaN : left / right; break;
    default: return null;
  }
  if (!Number.isFinite(result)) return null;
  if (Math.abs(result) >= 1e8) return result;
  return Math.sign(result) * Math.round(Math.abs(result) * 1e8) / 1e8;
}
