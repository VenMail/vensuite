<script setup lang="ts">
import { computed } from 'vue';
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
const updateRule = (index: number, block: FormBlock) => {
  const items = [...rules.value];
  if (block.logic) items[index] = block.logic;
  else items.splice(index, 1);
  saveRules(items);
};
const addRule = () => saveRules([...rules.value, {
  id: props.block.id, scope: 'question', owner_id: props.block.id, logic_type: 'AND',
  conditions: [{ question_id: props.block.id, operator: 'equals', value: '' }],
  actions: [{ type: 'jump_to_question', target_id: props.following[0]?.id }],
}]);
</script>

<template>
  <div class="space-y-3">
    <div v-for="(rule, index) in rules" :key="index">
      <p v-if="rules.length > 1" class="pt-2 text-xs font-medium text-slate-500">Rule {{ index + 1 }}</p>
      <BranchRuleEditor :block="{ ...block, logic: rule }" :previous="previous" :following="following" @update="updateRule(index, $event)" />
    </div>
    <button type="button" class="rounded px-2 py-1 font-medium text-blue-700 hover:bg-blue-50" @click="addRule">Add skip rule</button>
  </div>
</template>
