<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import type { FormBlock } from './types';
import type { LogicCondition, LogicConditionGroup, LogicOperator } from '@/types';

const props = withDefaults(defineProps<{ group: LogicConditionGroup; questions: FormBlock[]; depth?: number }>(), { depth: 0 });
const emit = defineEmits<{ update: [group: LogicConditionGroup]; remove: [] }>();

const operators: { value: LogicOperator; label: string }[] = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'greater_or_equal', label: 'is at least' },
  { value: 'less_or_equal', label: 'is at most' },
];

const read = (event: Event) => (event.target as HTMLSelectElement | HTMLInputElement).value;
const save = (conditions: LogicConditionGroup['conditions']) => emit('update', { ...props.group, conditions });
const replace = (index: number, value: LogicConditionGroup | LogicCondition) => {
  save(props.group.conditions.map((item, i) => i === index ? value : item));
};
const remove = (index: number) => save(props.group.conditions.filter((_, i) => i !== index));
const newCondition = (): LogicCondition => ({
  question_id: props.questions[0]?.id ?? '',
  operator: 'equals',
  value: '',
});
const options = (id: string) => {
  const question = props.questions.find((item) => item.id === id);
  if (question?.type === 'yesno') return [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
  return question?.optionValues?.length ? question.optionValues : question?.options?.map((value) => ({ value, label: value })) ?? [];
};
</script>

<template>
  <div class="condition-group" :class="{ 'condition-group--nested': depth }">
    <div class="condition-header">
      <label>Match
        <select :value="group.logic_type" aria-label="Condition group match" @change="emit('update', { ...group, logic_type: read($event) as 'AND' | 'OR' })">
          <option value="AND">all</option>
          <option value="OR">any</option>
        </select>
      </label>
      <button v-if="depth" type="button" class="logic-icon" aria-label="Remove condition group" @click="emit('remove')">
        <Trash2 :size="15" aria-hidden="true" />
      </button>
    </div>

    <template v-for="(item, index) in group.conditions" :key="index">
      <ConditionGroupEditor
        v-if="'conditions' in item"
        :group="item"
        :questions="questions"
        :depth="depth + 1"
        @update="replace(index, $event)"
        @remove="remove(index)"
      />
      <div v-else class="condition-row">
        <select :value="item.question_id" aria-label="Question" @change="replace(index, { ...item, question_id: read($event), value: '' })">
          <option v-if="!questions.some(q => q.id === item.question_id)" :value="item.question_id" disabled>Choose a question</option>
          <option v-for="q in questions" :key="q.id" :value="q.id">{{ q.question || 'Untitled question' }}</option>
        </select>
        <select :value="item.operator" aria-label="Comparison" @change="replace(index, { ...item, operator: read($event) as LogicOperator })">
          <option v-for="op in operators" :key="op.value" :value="op.value">{{ op.label }}</option>
        </select>
        <select v-if="options(item.question_id).length" :value="item.value" aria-label="Answer" @change="replace(index, { ...item, value: read($event) })">
          <option value="" disabled>Choose answer</option>
          <option v-for="option in options(item.question_id)" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <input v-else :value="item.value" aria-label="Answer" placeholder="Answer" @input="replace(index, { ...item, value: read($event) })" />
        <button type="button" class="logic-icon" :aria-label="'Remove condition ' + (index + 1)" @click="remove(index)">
          <Trash2 :size="15" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div v-if="questions.length" class="condition-actions">
      <button type="button" class="logic-action" aria-label="Add condition" @click="save([...group.conditions, newCondition()])">
        <Plus :size="15" aria-hidden="true" /> Condition
      </button>
      <button v-if="depth < 4" type="button" class="logic-action" aria-label="Add group" @click="save([...group.conditions, { logic_type: 'AND', conditions: [newCondition()] }])">
        <Plus :size="15" aria-hidden="true" /> Group
      </button>
    </div>
  </div>
</template>

<style scoped>
.condition-group { display: grid; gap: 0.55rem; min-width: 0; }
.condition-group--nested { padding-inline-start: 0.55rem; border-inline-start: 2px solid var(--logic-line); }
.condition-header, .condition-header label, .condition-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
.condition-header { justify-content: space-between; }
.condition-row { display: grid; gap: 0.35rem; grid-template-columns: minmax(0, 1fr) minmax(0, 0.65fr) minmax(0, 0.8fr) auto; }
@media (max-width: 619px) {
  .condition-row { grid-template-columns: minmax(0, 1fr) auto; }
  .condition-row > :first-child, .condition-row > :nth-child(2) { grid-column: 1 / -1; }
}
</style>
