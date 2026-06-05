<template>
  <div v-if="open" class="snp">
    <div class="snp__header">
      <span class="snp__label">Speaker notes</span>
      <button class="snp__close" title="Hide notes" @click="$emit('close')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <textarea
      class="snp__textarea"
      :class="{ 'snp__textarea--readonly': readOnly }"
      :value="modelValue"
      :placeholder="readOnly ? 'No speaker notes for this slide.' : 'Add speaker notes for this slide...'"
      :readonly="readOnly"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  modelValue: string
  open: boolean
  readOnly?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'close'): void
}>()
</script>

<style scoped>
.snp {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  height: 160px;
  max-height: 30vh;
  border-top: 1px solid var(--border, #e4e4e7);
  background: #fff;
}

.snp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #e4e4e7);
  flex-shrink: 0;
}

.snp__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-muted, #71717a);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.snp__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--fg-muted, #71717a);
}

.snp__close:hover { background: var(--bg-subtle, #f4f4f5); }

.snp__textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg, #18181b);
  background: transparent;
  font-family: inherit;
}

.snp__textarea::placeholder { color: var(--fg-subtle, #a1a1aa); }

.snp__textarea--readonly {
  cursor: default;
  color: var(--fg-muted, #52525b);
}
</style>
