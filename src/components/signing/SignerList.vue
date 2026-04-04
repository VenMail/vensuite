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

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0] || 'S';
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'S';
}

function handleAdd() {
  if (!newEmail.value.trim()) return;
  emit('addSigner', newEmail.value.trim(), newName.value.trim() || newEmail.value.split('@')[0]);
  newEmail.value = '';
  newName.value = '';
  showAddForm.value = false;
}
</script>

<template>
  <div class="signer-list space-y-3">
    <div class="px-1">
      <h3 class="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Signers</h3>
      <p class="mt-1 text-xs leading-5 text-stone-500">
        Select a signer before placing fields so colors and assignments stay aligned.
      </p>
    </div>

    <div
      v-for="signer in signers"
      :key="signer.email"
      class="flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition-all shadow-sm"
      :class="activeSignerEmail === signer.email
        ? 'border-stone-300 bg-white shadow-md'
        : 'border-stone-200 bg-white/80 hover:border-stone-300 hover:bg-white'"
      @click="emit('selectSigner', signer.email)"
    >
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white shadow-sm"
        :style="{ backgroundColor: signer.color }"
      >
        {{ getInitials(signer.name, signer.email) }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="truncate text-sm font-semibold text-slate-900">{{ signer.name }}</div>
        <div class="truncate text-xs text-stone-600">{{ signer.email }}</div>
      </div>
      <span class="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
        {{ fieldCounts[signer.email] || 0 }}
      </span>
      <button
        class="rounded-lg p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
        @click.stop="emit('removeSigner', signer.email)"
        title="Remove signer"
      >
        x
      </button>
    </div>

    <div v-if="showAddForm" class="space-y-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <input
        v-model="newName"
        type="text"
        placeholder="Name"
        class="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15"
      />
      <input
        v-model="newEmail"
        type="email"
        placeholder="Email"
        class="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15"
        @keydown.enter="handleAdd"
      />
      <div class="flex gap-2">
        <button
          class="flex-1 rounded-xl bg-[#2d6a4f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#25563f]"
          @click="handleAdd"
        >
          Add
        </button>
        <button
          class="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
          @click="showAddForm = false"
        >
          Cancel
        </button>
      </div>
    </div>

    <button
      v-if="!showAddForm"
      class="w-full rounded-2xl border border-dashed border-[#7eb58f] bg-[#f4fbf6] px-3 py-3 text-xs font-semibold text-[#2d6a4f] transition hover:bg-[#edf7f0]"
      @click="showAddForm = true"
    >
      + Add Signer
    </button>
  </div>
</template>
