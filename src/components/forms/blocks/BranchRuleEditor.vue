<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import type { FormBlock } from './types';
import ConditionGroupEditor from './ConditionGroupEditor.vue';
import type { LogicConditionGroup, LogicRule } from '@/types';

const props = defineProps<{ rule: LogicRule; questions: FormBlock[]; following: FormBlock[]; label: string }>();
const emit = defineEmits<{ update: [rule: LogicRule]; remove: [] }>();
const updateConditions = ({ logic_type, conditions }: LogicConditionGroup) =>
  emit('update', { ...props.rule, logic_type, conditions });
const changeDestination = (event: Event) => {
  const destination = (event.target as HTMLSelectElement).value;
  emit('update', {
    ...props.rule,
    actions: destination === '__end__' ? [{ type: 'end_form' }] : [{ type: 'jump_to_question', target_id: destination }],
  });
};
</script>

<template>
  <div class="branch-rule">
    <div class="branch-rule__heading">
      <p>{{ label }}</p>
      <button type="button" class="logic-icon" aria-label="Remove branch" @click="emit('remove')">
        <Trash2 :size="15" aria-hidden="true" />
      </button>
    </div>
    <ConditionGroupEditor :group="rule" :questions="questions" @update="updateConditions" />
    <label class="branch-rule__destination">
      Then go to
      <select
        aria-label="Branch destination"
        :value="rule.actions[0]?.type === 'end_form' ? '__end__' : rule.actions[0]?.target_id"
        @change="changeDestination"
      >
        <option value="" disabled>Choose a destination</option>
        <option v-for="question in following" :key="question.id" :value="question.id">{{ question.question || 'Untitled question' }}</option>
        <option value="__end__">End form</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.branch-rule { display: grid; gap: 0.6rem; min-width: 0; padding-top: 0.5rem; border-top: 1px solid var(--logic-line); }
.branch-rule__heading { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
.branch-rule__destination { display: grid; gap: 0.35rem; font-size: 0.85rem; font-weight: 650; }
</style>
