<template>
  <section class="space-y-6 text-gray-900 dark:text-gray-100">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold">Webhooks</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{$t('Forms.WebhooksPanel.text.connect_form_events_to')}}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
        :disabled="isLoading"
        @click="load"
      >
        <RefreshCw class="w-4 h-4" />
        Refresh
      </button>
    </header>

    <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <table class="w-full text-sm" aria-label="Configured webhooks">
        <thead class="text-left text-gray-500 dark:text-gray-400 uppercase text-xs">
          <tr>
            <th class="px-4 py-3 w-36">Type</th>
            <th class="px-4 py-3">Webhook URL</th>
            <th class="px-4 py-3 w-24 text-center">Status</th>
            <th class="px-4 py-3 w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hook in items" :key="hook.id" class="border-t border-gray-200 dark:border-gray-800">
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-medium">
                <Zap class="w-3 h-3" />
                {{ hook.events?.[0] || 'custom' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-col gap-1">
                <span class="font-medium break-all">{{ hook.url }}</span>
                <span v-if="hook.events?.length" class="text-xs text-gray-500 dark:text-gray-400">{{ hook.events.join(', ') }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="hook.status === 'disabled'
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'"
              >
                <Signal class="w-3 h-3" />
                {{ hook.status || 'active' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  :disabled="testState.loadingId === hook.id"
                  @click="sendSample(hook.url, hook.events?.[0] || 'form.completed', hook.id)"
                  title="Send sample"
                >
                  <Send class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/20"
                  :disabled="deletingId === hook.id"
                  @click="remove(hook.id)"
                  title="Remove"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!items.length && !isLoading" class="border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
            <td colspan="4" class="px-4 py-8">
              {{$t('Forms.WebhooksPanel.text.no_webhooks_configured_yet')}}
            </td>
          </tr>
          <tr v-if="isLoading" class="border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
            <td colspan="4" class="px-4 py-8">
              Loading…
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="loadError" class="text-sm text-red-500 dark:text-red-400">{{ loadError }}</p>

    <div class="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-4 py-4">
      <form class="flex flex-col gap-3 md:flex-row md:items-center" @submit.prevent="appendRow">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/20"
            @click="toggleComposer"
            title="Add webhook"
          >
            <Plus class="w-4 h-4" />
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{$t('Forms.WebhooksPanel.text.add_new_webhook')}}</span>
        </div>
        <Transition name="fade">
          <div v-if="composer.open" class="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div class="flex items-center gap-2">
              <label class="sr-only" for="webhook-type">Event</label>
              <select
                id="webhook-type"
                v-model="composer.event"
                class="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
              >
                <option v-for="option in eventOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="flex-1">
              <label class="sr-only" for="webhook-url">Webhook URL</label>
              <input
                id="webhook-url"
                v-model.trim="composer.url"
                type="url"
                required
                class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/webhooks/form"
              />
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                :disabled="!composer.url"
                @click="sendSample(composer.url, composer.event)"
                title="Send sample"
              >
                <Send class="w-4 h-4" />
              </button>
              <button
                type="submit"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isCreating || !composer.url"
                title="Create webhook"
              >
                <Check class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                @click="resetComposer"
                title="Cancel"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </Transition>
      </form>

      <p v-if="testState.message" class="mt-3 text-xs" :class="testState.error ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-300'">
        {{ testState.message }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { createWebhook, deleteWebhook, listWebhooks, sendWebhookSample } from '@/services/forms';
import type { FormWebhook } from '@/types';
import { Check, Plus, RefreshCw, Send, Signal, Trash2, X, Zap } from 'lucide-vue-next';

const props = defineProps<{ formId: string }>();

const authStore = useAuthStore();

const isLoading = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const items = ref<FormWebhook[]>([]);
const deletingId = ref<number | null>(null);

const eventOptions = [
  { value: 'form.completed', label: 'Form completed' },
  { value: 'payment.succeeded', label: 'Payment succeeded' },
  { value: 'payment.failed', label: 'Payment failed' },
  { value: 'charge.refunded', label: 'Charge refunded' },
];

const composer = reactive({
  open: false,
  event: eventOptions[0]?.value ?? 'form.completed',
  url: '',
});

const testState = reactive({
  loadingId: null as number | null,
  message: '',
  error: false,
});

const form = reactive({
  url: '',
  status: 'active' as 'active' | 'disabled',
  eventsText: '',
  selectedEvents: [] as string[],
});

const toggleComposer = () => {
  composer.open = !composer.open;
  if (!composer.open) {
    resetComposer();
  }
};

const resetComposer = () => {
  composer.url = '';
  composer.event = eventOptions[0]?.value ?? 'form.completed';
  composer.open = false;
};

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
    const custom = form.eventsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const events = Array.from(new Set([...(form.selectedEvents || []), ...custom]));
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
    form.selectedEvents = [];
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

const sendSample = async (url: string, event: string, id: number | null = null) => {
  if (!props.formId || !url) return;
  testState.loadingId = id;
  testState.message = '';
  testState.error = false;
  try {
    const token = authStore.getToken?.();
    await sendWebhookSample(props.formId, { url, event }, {
      auth: token ? { token } : undefined,
    });
    testState.message = 'Sample event sent successfully.';
  } catch (error: any) {
    testState.error = true;
    testState.message = error?.data?.message ?? 'Failed to send sample.';
  } finally {
    testState.loadingId = null;
    if (!id) {
      // sample from composer only
      setTimeout(() => {
        testState.message = '';
        testState.error = false;
      }, 3000);
    }
  }
};

const appendRow = async () => {
  if (!composer.url) return;
  form.url = composer.url;
  form.status = 'active';
  form.selectedEvents = [composer.event];
  form.eventsText = '';
  await create();
  resetComposer();
};

onMounted(load);
</script>
