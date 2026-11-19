<script setup lang="ts">
import type { FormBlock } from './types';
import BranchEditor from './BranchEditor.vue';
import ConditionGroupEditor from './ConditionGroupEditor.vue';
import type { LogicCondition, LogicOperator } from '@/types';

const props = defineProps<{ block: FormBlock; previous: FormBlock[]; following: FormBlock[] }>();
const emit = defineEmits<{ (event: 'update', block: FormBlock): void }>();
const add = () => emit('update', { ...props.block, visibilityCondition: { logic_type: 'AND', conditions: [{ question_id: props.previous[0].id, operator: 'equals', value: '' }] } });
</script>

<template>
  <details v-if="previous.length || following.length || block.visibilityCondition || block.logic" class="logic-disclosure mt-1 rounded-lg px-3 py-2 text-sm">
    <summary class="cursor-pointer font-medium text-slate-700 dark:text-slate-200">Logic<span v-if="block.visibilityCondition?.conditions.length"> · {{ block.visibilityCondition.conditions.length }}</span></summary>
    <div class="space-y-3 pt-3">
      <template v-if="block.visibilityCondition">
        <p class="font-medium">Show when</p>
        <ConditionGroupEditor :group="block.visibilityCondition" :questions="previous" @update="emit('update', { ...block, visibilityCondition: $event.conditions.length ? $event : undefined })" />
      </template>
      <button v-else-if="previous.length" type="button" class="rounded px-2 py-1 font-medium text-blue-700" @click="add">Add visibility condition</button>
      <BranchEditor v-if="following.length || block.logic" :block="block" :previous="previous" :following="following" @update="emit('update', $event)" />
    </div>
  </details>
</template>

<style scoped>
.logic-disclosure { color: #475569; }
.logic-disclosure[open] { margin-top: .5rem; padding: 1rem; border: 1px solid #dbe2e8; background: #fff; }
:global(.dark) .logic-disclosure { color: #cbd5e1; }
:global(.dark) .logic-disclosure[open] { border-color: #475569; background: #1e293b; }
</style>
