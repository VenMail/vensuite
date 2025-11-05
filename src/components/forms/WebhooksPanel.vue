<template>
  <section class="webhooks text-gray-900 dark:text-gray-100">
    <header class="webhooks__header">
      <h3 class="webhooks__title text-gray-900 dark:text-gray-100">Webhooks</h3>
      <button
        type="button"
        class="webhooks__refresh border border-gray-300 bg-white text-gray-700 rounded-md px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        :disabled="isLoading"
        @click="load"
      >
        Refresh
      </button>
    </header>

    <div v-if="loadError" class="webhooks__error text-red-600 dark:text-red-400">{{ loadError }}</div>

    <div v-if="isLoading" class="webhooks__loading text-gray-500 dark:text-gray-400">Loading…</div>

    <ul v-else class="webhooks__list" v-if="items.length">
      <li v-for="hook in items" :key="hook.id" class="webhooks__item border border-gray-200 rounded-md p-2.5 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div class="webhooks__row">
          <div class="webhooks__info">
            <div class="webhooks__url font-semibold text-gray-900 dark:text-gray-100 break-all">{{ hook.url }}</div>
            <div class="webhooks__meta text-gray-600 dark:text-gray-300 text-sm">
              <span
                class="webhooks__badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                :class="{ 'webhooks__badge--disabled bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300': hook.status === 'disabled' }"
              >{{ hook.status || 'active' }}</span>
              <span v-if="hook.events?.length" class="webhooks__events text-gray-600 dark:text-gray-400">{{ hook.events.join(', ') }}</span>
            </div>
          </div>
          <button
            type="button"
            class="webhooks__delete border border-red-500 text-red-600 bg-white rounded-md px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/10"
            :disabled="deletingId === hook.id"
            @click="remove(hook.id)"
          >
            {{ deletingId === hook.id ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="webhooks__empty text-gray-500 dark:text-gray-400">No webhooks configured.</p>

    <form class="webhooks__form" @submit.prevent="create">
      <div class="webhooks__field">
        <label>URL</label>
        <input
          class="webhooks__input border border-gray-300 rounded-md px-2.5 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          type="url"
          required
          placeholder="https://example.com/webhook"
          v-model.trim="form.url"
        />
      </div>
      <div class="webhooks__row webhooks__row--gap">
        <div class="webhooks__field">
          <label>Status</label>
          <select class="webhooks__select border border-gray-300 rounded-md px-2.5 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" v-model="form.status">
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div class="webhooks__field">
          <label>Events (comma-separated)</label>
          <input
            class="webhooks__input border border-gray-300 rounded-md px-2.5 py-2 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            type="text"
            placeholder="form.response.created, form.response.submitted"
            v-model.trim="form.eventsText"
          />
        </div>
      </div>
      <div class="webhooks__actions">
        <button
          type="submit"
          class="webhooks__create bg-primary-600 text-white border border-primary-600 rounded-md px-3.5 py-2 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isCreating || !form.url"
        >
          {{ isCreating ? 'Adding…' : 'Add Webhook' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { createWebhook, deleteWebhook, listWebhooks } from '@/services/forms';
import type { FormWebhook } from '@/types';

const props = defineProps<{ formId: string }>();

const authStore = useAuthStore();

const isLoading = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const items = ref<FormWebhook[]>([]);
const deletingId = ref<number | null>(null);

const form = reactive({
  url: '',
  status: 'active' as 'active' | 'disabled',
  eventsText: '',
});

const load = async () => {
  if (!props.formId) return;
  isLoading.value = true;
  loadError.value = null;
  try {
    const token = authStore.getToken?.();
    items.value = await listWebhooks(props.formId, {
      auth: token ? { token } : undefined,
    });
  } catch (e: any) {
    loadError.value = e?.data?.message ?? e?.message ?? 'Failed to load webhooks';
  } finally {
    isLoading.value = false;
  }
};

const create = async () => {
  if (!props.formId || !form.url) return;
  isCreating.value = true;
  try {
    const token = authStore.getToken?.();
    const events = form.eventsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const hook = await createWebhook(props.formId, {
      url: form.url,
      status: form.status,
      events: events.length ? events : undefined,
    }, {
      auth: token ? { token } : undefined,
    });
    items.value.unshift(hook);
    form.url = '';
    form.eventsText = '';
    form.status = 'active';
  } finally {
    isCreating.value = false;
  }
};

const remove = async (id: number) => {
  if (!props.formId) return;
  deletingId.value = id;
  try {
    const token = authStore.getToken?.();
    await deleteWebhook(props.formId, id, {
      auth: token ? { token } : undefined,
    });
    items.value = items.value.filter((h) => h.id !== id);
  } finally {
    deletingId.value = null;
  }
};

onMounted(load);
</script>

<style scoped>
.webhooks { display: flex; flex-direction: column; gap: 0.75rem; }
.webhooks__header { display: flex; align-items: center; justify-content: space-between; }
.webhooks__title { font-size: 1rem; font-weight: 600; margin: 0; }
.webhooks__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.webhooks__row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.webhooks__row--gap { gap: 0.75rem; }
.webhooks__info { display: flex; flex-direction: column; gap: 0.25rem; }
.webhooks__actions { display: flex; justify-content: flex-end; }
</style>
