<script setup lang="ts">
import type { FormBlock } from './types';
import type { LogicCondition, LogicConditionGroup, LogicOperator } from '@/types';
const props = withDefaults(defineProps<{ group: LogicConditionGroup; questions: FormBlock[]; depth?: number }>(), { depth: 0 });
const emit = defineEmits<{ (event: 'update', group: LogicConditionGroup): void }>();
const save = (conditions: LogicConditionGroup['conditions']) => emit('update', { ...props.group, conditions });
const change = (index: number, patch: Partial<LogicCondition>) => save(props.group.conditions.map((item, i) => i === index && !('conditions' in item) ? { ...item, ...patch } : item));
const options = (id: string) => {
  const q = props.questions.find((item) => item.id === id);
  if (q?.type === 'yesno') return [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
  return q?.optionValues?.length ? q.optionValues : q?.options?.map((value) => ({ value, label: value })) ?? [];
};
</script>
<template>
  <div class="space-y-2" :class="depth ? 'border-l-2 border-slate-200 pl-3 dark:border-slate-700' : ''">
    <label class="flex flex-wrap items-center gap-2 text-sm">Match
      <select :value="group.logic_type" class="rounded border border-slate-300 bg-transparent px-2 py-1" aria-label="Condition group match" @change="emit('update', { ...group, logic_type: ($event.target as HTMLSelectElement).value as 'AND' | 'OR' })"><option value="AND">all</option><option value="OR">any</option></select>
    </label>
    <div v-for="(item, index) in group.conditions" :key="index" class="space-y-2">
      <div v-if="'conditions' in item" class="flex items-start gap-2">
        <ConditionGroupEditor class="min-w-0 flex-1" :group="item" :questions="questions" :depth="depth + 1" @update="save(group.conditions.map((entry, i) => i === index ? $event : entry))" />
        <button type="button" class="px-2 py-1 text-rose-700" aria-label="Remove condition group" @click="save(group.conditions.filter((_, i) => i !== index))">Remove</button>
      </div>
      <div v-else class="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <select :value="item.question_id" aria-label="Question" class="min-w-0 rounded border border-slate-300 bg-transparent px-2 py-2" @change="change(index, { question_id: ($event.target as HTMLSelectElement).value, value: '' })"><option v-for="q in questions" :key="q.id" :value="q.id">{{ q.question || 'Untitled question' }}</option></select>
        <select :value="item.operator" aria-label="Comparison" class="min-w-0 rounded border border-slate-300 bg-transparent px-2 py-2" @change="change(index, { operator: ($event.target as HTMLSelectElement).value as LogicOperator })"><option value="equals">is</option><option value="not_equals">is not</option><option value="contains">contains</option><option value="not_contains">does not contain</option><option value="greater_than">is greater than</option><option value="less_than">is less than</option><option value="greater_or_equal">is at least</option><option value="less_or_equal">is at most</option></select>
        <select v-if="options(item.question_id).length" :value="item.value" aria-label="Answer" class="min-w-0 rounded border border-slate-300 bg-transparent px-2 py-2" @change="change(index, { value: ($event.target as HTMLSelectElement).value })"><option value="" disabled>Choose answer</option><option v-for="option in options(item.question_id)" :key="option.value" :value="option.value">{{ option.label }}</option></select>
        <input v-else :value="item.value" aria-label="Answer" placeholder="Answer" class="min-w-0 rounded border border-slate-300 bg-transparent px-2 py-2" @change="change(index, { value: ($event.target as HTMLInputElement).value })" />
        <button type="button" class="px-2 py-1 text-rose-700" :aria-label="`Remove condition ${index + 1}`" @click="save(group.conditions.filter((_, i) => i !== index))">Remove</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-2"><button v-if="questions.length" type="button" class="px-2 py-1 font-medium text-blue-700" @click="save([...group.conditions, {question_id: questions[0].id, operator:'equals', value:''}])">Add condition</button><button v-if="questions.length && depth < 4" type="button" class="px-2 py-1 font-medium text-blue-700" @click="save([...group.conditions, {logic_type:'AND', conditions:[{question_id:questions[0].id,operator:'equals',value:''}]}])">Add group</button></div>
  </div>
</template>
