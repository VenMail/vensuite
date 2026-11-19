import type { CalculationExpression } from '@/types';
export function calculateValue(formula: CalculationExpression | undefined, answers: Record<string, unknown>, depth?: number): number | null;
