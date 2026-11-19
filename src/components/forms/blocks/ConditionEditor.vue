<script setup lang="ts">
import { GitBranch, Eye, Plus, Trash2 } from 'lucide-vue-next';
import type { FormBlock } from './types';
import BranchEditor from './BranchEditor.vue';
import ConditionGroupEditor from './ConditionGroupEditor.vue';

const props = defineProps<{ block: FormBlock; previous: FormBlock[]; following: FormBlock[] }>();
const emit = defineEmits<{ update: [block: FormBlock] }>();
const addVisibility = () => emit('update', {
  ...props.block,
  visibilityCondition: {
    logic_type: 'AND',
    conditions: [{ question_id: props.previous[0].id, operator: 'equals', value: '' }],
  },
});
</script>

<template>
  <div class="question-logic">
    <section v-if="previous.length || block.visibilityCondition" class="logic-section">
      <div class="logic-heading">
        <Eye :size="17" aria-hidden="true" />
        <h3>Show question when</h3>
        <button v-if="block.visibilityCondition" type="button" class="logic-icon" aria-label="Remove visibility rule" @click="emit('update', { ...block, visibilityCondition: undefined })">
          <Trash2 :size="15" aria-hidden="true" />
        </button>
      </div>
      <ConditionGroupEditor
        v-if="block.visibilityCondition"
        :group="block.visibilityCondition"
        :questions="previous"
        @update="emit('update', { ...block, visibilityCondition: $event.conditions.length ? $event : undefined })"
      />
      <button v-else type="button" class="logic-action" aria-label="Add visibility rule" @click="addVisibility"><Plus :size="15" aria-hidden="true" /> Visibility rule</button>
    </section>

    <section class="logic-section">
      <div class="logic-heading">
        <GitBranch :size="17" aria-hidden="true" />
        <h3>Branch after this answer</h3>
      </div>
      <BranchEditor :block="block" :previous="previous" :following="following" @update="emit('update', $event)" />
    </section>
  </div>
</template>

<style scoped>
.question-logic { --logic-line: #dbe2e8; --logic-accent: #0f766e; display: grid; gap: 1rem; }
:global(.dark) .question-logic { --logic-line: #475569; --logic-accent: #5eead4; }
.logic-section { display: grid; min-width: 0; gap: 0.75rem; padding: 0.8rem; border: 1px solid var(--logic-line); border-radius: 0.7rem; }
.logic-heading { display: flex; align-items: center; gap: 0.55rem; }
.logic-heading svg { flex: none; color: var(--logic-accent); }
.logic-heading button { margin-inline-start: auto; }
.question-logic :deep(select), .question-logic :deep(input) { min-width: 0; max-width: 100%; min-height: 44px; padding: 0.45rem 0.55rem; border: 1px solid var(--logic-line); border-radius: 0.45rem; background: #fff; font-size: 0.85rem; }
:global(.dark) .question-logic :deep(select), :global(.dark) .question-logic :deep(input) { background: #111827; color: #f1f5f9; }
.question-logic :deep(.logic-action), .question-logic :deep(.logic-icon) { display: inline-flex; width: fit-content; min-height: 44px; align-items: center; gap: 0.3rem; padding-inline: 0.5rem; border-radius: 0.45rem; font-size: 0.825rem; font-weight: 650; }
.question-logic :deep(.logic-action) { color: var(--logic-accent); }
.question-logic :deep(.logic-icon) { min-width: 44px; justify-content: center; }
.question-logic :deep(button:hover) { background: color-mix(in srgb, currentColor 8%, transparent); }
.question-logic :deep(:focus-visible) { outline: 2px solid var(--logic-accent); outline-offset: 2px; }
</style>
