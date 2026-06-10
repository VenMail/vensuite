<template>
  <div class="flex h-full flex-col items-center justify-center px-4 py-10">
    <span
      class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20"
    >
      <Sparkles class="h-7 w-7 text-white" />
    </span>
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
      What are we working on?
    </h2>
    <p class="mt-1.5 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
      Create, update, summarize, or translate documents — attach files and ask in plain language.
    </p>

    <div class="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        v-for="workflow in workflows"
        :key="workflow.title"
        type="button"
        class="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left shadow-sm transition-all hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md motion-safe:hover:-translate-y-0.5"
        @click="onPick(workflow)"
      >
        <span
          class="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 transition-colors group-hover:bg-violet-100 dark:group-hover:bg-violet-500/25"
        >
          <component :is="workflow.icon" class="h-4 w-4" />
        </span>
        <span class="block text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ workflow.title }}
        </span>
        <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
          {{ workflow.description }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { Sparkles, FileEdit, ScrollText, PenLine, Languages } from 'lucide-vue-next';
import { toast } from '@/composables/useToast';

interface Workflow {
  title: string;
  description: string;
  prompt: string;
  icon: Component;
  needsAttachments?: boolean;
}

const emit = defineEmits<{
  (e: 'pick', prompt: string): void;
}>();

const workflows: Workflow[] = [
  {
    title: 'Update a proposal',
    description: 'Revise an existing proposal to match a new RFP',
    prompt: 'Update my proposal to address the requirements in the new RFP.',
    icon: FileEdit,
    needsAttachments: true,
  },
  {
    title: 'Summarize a document',
    description: 'Get key points from a long doc',
    prompt: 'Summarize the attached document into its key points.',
    icon: ScrollText,
    needsAttachments: true,
  },
  {
    title: 'Draft from notes',
    description: 'Turn rough notes into a polished document',
    prompt: 'Draft a polished document from these notes: ',
    icon: PenLine,
  },
  {
    title: 'Translate a document',
    description: 'Recreate a doc in another language',
    prompt: 'Translate the attached document to ',
    icon: Languages,
  },
];

function onPick(workflow: Workflow) {
  emit('pick', workflow.prompt);
  if (workflow.needsAttachments) {
    toast.info('Attach the relevant documents below');
  }
}
</script>
