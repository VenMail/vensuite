<script setup lang="ts">
import type { FormBlock } from './types';
import ConditionGroupEditor from './ConditionGroupEditor.vue';
import type { LogicCondition, LogicOperator, LogicRule } from '@/types';
const props = defineProps<{ block: FormBlock; previous: FormBlock[]; following: FormBlock[] }>();
const emit = defineEmits<{ (event: 'update', block: FormBlock): void }>();
const save = (logic: LogicRule | undefined) => emit('update', { ...props.block, logic });
const addRule = () => save({ id: props.block.id, scope: 'question', owner_id: props.block.id, logic_type: 'AND', conditions: [{ question_id: props.block.id, operator: 'equals', value: '' }], actions: [{ type: 'jump_to_question', target_id: props.following[0]?.id }] });
</script>
<template>
  <div class="border-t border-slate-200 pt-3 dark:border-slate-700">
    <button v-if="!block.logic" type="button" class="rounded px-2 py-1 font-medium text-blue-700 hover:bg-blue-50" @click="addRule">Add skip rule</button>
    <div v-else class="space-y-3">
      <p class="font-medium">Skip when</p>
      <ConditionGroupEditor :group="block.logic" :questions="[...previous, block]" @update="save({ ...block.logic!, logic_type: $event.logic_type, conditions: $event.conditions })" />
      <label class="flex flex-wrap items-center gap-2">Go to
        <select :value="block.logic.actions[0]?.type === 'end_form' ? '__end__' : block.logic.actions[0]?.target_id" class="min-w-0 rounded border border-slate-300 bg-transparent px-2 py-2" @change="save({ ...block.logic!, actions: ($event.target as HTMLSelectElement).value === '__end__' ? [{type:'end_form'}] : [{type:'jump_to_question', target_id: ($event.target as HTMLSelectElement).value}] })">
          <option v-for="question in following" :key="question.id" :value="question.id">{{ question.question || 'Untitled question' }}</option><option value="__end__">End form</option>
        </select>
      </label>
      <button type="button" class="rounded px-2 py-1 text-rose-700 hover:bg-rose-50" @click="save(undefined)">Remove skip rule</button>
    </div>
  </div>
</template>
