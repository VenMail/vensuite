import type { FormQuestion, LogicConditionGroup } from '@/types';
export type FormConditionGroup = LogicConditionGroup;
export function evaluateConditions(group: FormConditionGroup, answers: Record<string, unknown>): boolean;
export function visibleQuestionIds(questions: Pick<FormQuestion, 'id' | 'visibility_condition' | 'logic'>[], answers: Record<string, unknown>): string[];

export function validateFormLogic(questions: (Pick<FormQuestion, 'id' | 'visibility_condition' | 'logic' | 'calculation'> & { type?: string })[]): string[];

export function resolveFormPath(questions: FormQuestion[], answers: Record<string, unknown>): { visible: string[]; answers: Record<string, string | number | boolean | string[] | File | null> };
export function remapConditions<T extends LogicConditionGroup>(group: T, mapping: Record<string, string>): T;
export function remapCalculation<T>(node: T, mapping: Record<string, string>): T;
