import type { Option } from '@/types';
export function normalizeFormOptions(options: unknown): Option[] | undefined;

export function questionLogic(question: any): import('@/types').LogicRule | undefined;

export function getChoiceLabels(value: unknown, options: Option[] | undefined, multiple?: boolean): string | string[] | undefined;
