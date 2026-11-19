<script setup lang="ts">
import { computed } from 'vue';
import { Plus } from 'lucide-vue-next';
import type { FormBlock } from './types';
import type { LogicRule } from '@/types';
import BranchRuleEditor from './BranchRuleEditor.vue';

const props = defineProps<{ block: FormBlock; previous: FormBlock[]; following: FormBlock[] }>();
const emit = defineEmits<{ (event: 'update', block: FormBlock): void }>();
const rules = computed<LogicRule[]>(() => props.block.logic
  ? [{ ...props.block.logic, fallbacks: undefined }, ...(props.block.logic.fallbacks ?? [])]
  : []);
const saveRules = (items: LogicRule[]) => {
  const [first, ...fallbacks] = items;
  emit('update', { ...props.block, logic: first ? { ...first, fallbacks: fallbacks.length ? fallbacks : undefined } : undefined });
};
const updateRule = (index: number, rule: LogicRule) =>
  saveRules(rules.value.map((item, i) => i === index ? rule : item));
const removeRule = (index: number) => saveRules(rules.value.filter((_, i) => i !== index));
const addRule = () => saveRules([...rules.value, {
  id: props.block.id, scope: 'question', owner_id: props.block.id, logic_type: 'AND',
  conditions: [{ question_id: props.block.id, operator: 'equals', value: '' }],
  actions: props.following.length ? [{ type: 'jump_to_question', target_id: '' }] : [{ type: 'end_form' }],
}]);
</script>

<template>
  <div class="grid gap-3">
    <BranchRuleEditor
      v-for="(rule, index) in rules"
      :key="index"
      :rule="rule"
      :questions="[block, ...previous]"
      :following="following"
      :label="index === 0 ? 'If' : 'Otherwise, if'"
      @update="updateRule(index, $event)"
      @remove="removeRule(index)"
    />
    <button type="button" class="logic-action" aria-label="Add branch" @click="addRule"><Plus :size="15" aria-hidden="true" /> Branch</button>
  </div>
</template>
