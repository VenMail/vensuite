import { defaultValidations, type FormQuestion, type TextValidation } from '@/types';

export function isEmptyAnswer(value: unknown): boolean {
  return value == null
    || (typeof value === 'string' && value.trim() === '')
    || (typeof value === 'number' && Number.isNaN(value))
    || (Array.isArray(value) && value.length === 0);
}

export function getAnswerRules(question: FormQuestion): Partial<TextValidation> {
  let defaults = defaultValidations[question.type];
  if (question.type === 'phone') {
    const international = question.allow_international ?? true;
    defaults = {
      inputType: 'phone',
      regex: international ? /^\+?[0-9\s()-]{10,20}$/ : /^[0-9\s()-]{10,15}$/,
      minLength: 10,
      maxLength: international ? 20 : 15,
    };
  }
  const validation = 'validation' in question ? question.validation : undefined;
  return {
    ...defaults,
    ...validation,
    regex: validation?.regex instanceof RegExp ? validation.regex : defaults?.regex,
  };
}

export function getAnswerError(question: FormQuestion, value: unknown): string {
  if (question.type === 'calculated' || question.type === 'statement') return '';
  if (isEmptyAnswer(value)) return question.required ? 'An answer is required.' : '';
  if (typeof value !== 'string') return '';
  const rules = getAnswerRules(question);
  if (rules.regex instanceof RegExp && !rules.regex.test(value)) {
    if (question.type === 'email') return 'Enter a valid email address.';
    if (question.type === 'phone') return 'Enter a valid phone number.';
    if (question.type === 'website') return 'Enter a valid URL.';
    return 'Check the answer format.';
  }
  if (rules.minLength && value.length < rules.minLength) return `Enter at least ${rules.minLength} characters.`;
  if (rules.maxLength && value.length > rules.maxLength) return `Enter no more than ${rules.maxLength} characters.`;
  return '';
}
