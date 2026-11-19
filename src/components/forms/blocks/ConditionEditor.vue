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
  <details v-if="previous.length || following.length || block.visibilityCondition || block.logic" class="mt-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
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
