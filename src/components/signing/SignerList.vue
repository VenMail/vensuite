<script setup lang="ts">
import { ref } from 'vue';
import type { SigningSigner } from '@/types/signing';

defineProps<{
  signers: SigningSigner[];
  activeSignerEmail: string | null;
  fieldCounts: Record<string, number>;
}>();

const emit = defineEmits<{
  selectSigner: [email: string];
  addSigner: [email: string, name: string];
  removeSigner: [email: string];
}>();

const showAddForm = ref(false);
const newEmail = ref('');
const newName = ref('');

function handleAdd() {
  if (!newEmail.value.trim()) return;
  emit('addSigner', newEmail.value.trim(), newName.value.trim() || newEmail.value.split('@')[0]);
  newEmail.value = '';
  newName.value = '';
  showAddForm.value = false;
}
</script>

<template>
  <div class="signer-list space-y-2">
    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Signers</h3>

    <div
      v-for="signer in signers"
      :key="signer.email"
      class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
      :class="activeSignerEmail === signer.email ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'"
      @click="emit('selectSigner', signer.email)"
    >
      <div
        class="w-3 h-3 rounded-full shrink-0"
        :style="{ backgroundColor: signer.color }"
      />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{{ signer.name }}</div>
        <div class="text-xs text-gray-500 truncate">{{ signer.email }}</div>
      </div>
      <span class="text-xs text-gray-400">{{ fieldCounts[signer.email] || 0 }}</span>
      <button
        class="text-gray-400 hover:text-red-500 text-xs p-1"
        @click.stop="emit('removeSigner', signer.email)"
        title="Remove signer"
      >
        x
      </button>
    </div>

    <div v-if="showAddForm" class="space-y-2 p-2 bg-gray-50 rounded-lg">
      <input
        v-model="newName"
        type="text"
        placeholder="Name"
        class="w-full px-2 py-1 text-sm border rounded"
      />
      <input
        v-model="newEmail"
        type="email"
        placeholder="Email"
        class="w-full px-2 py-1 text-sm border rounded"
        @keydown.enter="handleAdd"
      />
      <div class="flex gap-2">
        <button
          class="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          @click="handleAdd"
        >
          Add
        </button>
        <button
          class="px-2 py-1 text-xs border rounded hover:bg-gray-100"
          @click="showAddForm = false"
        >
          Cancel
        </button>
      </div>
    </div>

    <button
      v-if="!showAddForm"
      class="w-full px-2 py-1.5 text-xs text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      @click="showAddForm = true"
    >
      + Add Signer
    </button>
  </div>
</template>
