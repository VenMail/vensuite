<script setup lang="ts">
import { computed } from 'vue';
import type { FormBlock } from './types';
import type { CalculationExpression } from '@/types';
const props = defineProps<{ block: FormBlock; previous: FormBlock[] }>();
const emit = defineEmits<{ (event: 'update', block: FormBlock): void }>();
type Binary = Extract<CalculationExpression, {operator: string}>;
const formula = computed<Binary>(() => props.block.calculation && 'operator' in props.block.calculation ? props.block.calculation : { operator: 'add', left: { value: 0 }, right: { value: 0 } });
const save = (patch: Partial<Binary>) => emit('update', { ...props.block, required: false, calculation: { ...formula.value, ...patch } });
const constantValue = (node: CalculationExpression) => 'value' in node ? node.value : 0;
const operandValue = (node: CalculationExpression) => 'question_id' in node ? `q:${node.question_id}` : 'constant';
const setOperator = (event: Event) => save({ operator: (event.target as HTMLSelectElement).value as Binary['operator'] });
const setOperand = (side: 'left' | 'right', value: string) => save({ [side]: value.startsWith('q:') ? { question_id: value.slice(2) } : { value: 0 } });
</script>
<template>
  <div class="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
    <template v-for="side in (['left', 'right'] as const)" :key="side">
      <label class="flex min-w-36 flex-1 flex-col gap-1">{{ side === 'left' ? 'First value' : 'Second value' }}
        <select :value="operandValue(formula[side])" class="rounded border border-slate-300 bg-transparent px-2 py-2" @change="setOperand(side, ($event.target as HTMLSelectElement).value)"><option value="constant">Number</option><option v-for="q in previous" :key="q.id" :value="`q:${q.id}`">{{ q.question || 'Untitled question' }}</option></select>
      </label>
      <label v-if="'value' in formula[side]" class="flex w-24 flex-col gap-1">Number<input type="number" :value="constantValue(formula[side])" class="rounded border border-slate-300 bg-transparent px-2 py-2" @change="save({ [side]: { value: Number(($event.target as HTMLInputElement).value) } })" /></label>
      <label v-if="side === 'left'" class="flex flex-col gap-1">Operation<select :value="formula.operator" class="rounded border border-slate-300 bg-transparent px-2 py-2" @change="setOperator"><option value="add">+</option><option value="subtract">−</option><option value="multiply">×</option><option value="divide">÷</option></select></label>
    </template>
  </div>
</template>
