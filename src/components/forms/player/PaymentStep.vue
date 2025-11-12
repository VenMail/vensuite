<template>
  <div class="flex flex-col gap-6 text-slate-900 dark:text-slate-100">
    <header class="space-y-1">
      <h2 class="text-2xl font-semibold">Secure Payment</h2>
      <p class="text-sm text-slate-600 dark:text-slate-400">Please complete the payment to submit your response.</p>
    </header>

    <section
      v-if="form.payment"
      class="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"
    >
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</span>
        <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ formattedAmount }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Mode</span>
        <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ paymentModeLabel }}</span>
      </div>
    </section>

    <section
      v-if="isPreparing"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
      <div class="h-20 w-full animate-pulse rounded-md bg-slate-100 dark:bg-slate-800"></div>
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ statusText }}</p>
    </section>

    <section
      v-else
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="min-h-[80px]" ref="cardElementContainer"></div>
      <p v-if="errorMessage" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
    </section>

    <footer class="flex justify-end gap-3">
      <button
        type="button"
        class="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        @click="emitCancel"
        :disabled="isSubmitting"
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-full border border-primary-600 bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting || !isCardReady || isPreparing"
        @click="confirmPayment"
      >
        {{ isSubmitting ? 'Processing…' : 'Pay & Submit' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { FormDefinition } from '@/types';
import type { PaymentClient } from '@/composables/usePaymentClient';
import { useFormPlayerStore } from '@/store/formPlayer';
import { toast } from '@/composables/useToast';

interface StripePaymentElementChangeEvent {
  error?: { message?: string };
}

interface StripePaymentElement {
  mount(element: HTMLElement): void;
  unmount(): void;
  on(event: 'change', handler: (event: StripePaymentElementChangeEvent) => void): void;
}

interface StripeElements {
  create(type: 'payment'): StripePaymentElement;
  submit(): Promise<{ error?: { message?: string } }>;
}

interface StripeInstance {
  elements(options?: { clientSecret?: string }): StripeElements;
  confirmPayment(options: {
    elements: StripeElements;
    clientSecret: string;
    confirmParams?: Record<string, unknown>;
    redirect?: 'if_required' | 'always';
  }): Promise<{ error?: { message?: string } }>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance | null;
  }
}

let stripeScriptPromise: Promise<void> | null = null;
const stripeInstanceCache = new Map<string, StripeInstance>();

const loadStripeScript = (): Promise<void> => {
  if (window.Stripe) return Promise.resolve();
  if (stripeScriptPromise) return stripeScriptPromise;

  stripeScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });

  return stripeScriptPromise;
};

const getStripeInstance = async (publishableKey: string): Promise<StripeInstance | null> => {
  if (!publishableKey) return null;
  if (stripeInstanceCache.has(publishableKey)) {
    return stripeInstanceCache.get(publishableKey) ?? null;
  }

  try {
    await loadStripeScript();
  } catch (error) {
    console.error(error);
    return null;
  }

  const factory = window.Stripe;
  if (!factory) return null;

  const instance = factory(publishableKey);
  if (instance) {
    stripeInstanceCache.set(publishableKey, instance);
  }

  return instance ?? null;
};

const props = defineProps<{
  form: FormDefinition;
  client: PaymentClient;
  isSubmitting?: boolean;
  responseId: string | null;
  successUrl?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
  (e: 'retry'): void;
}>();

const cardElementContainer = ref<HTMLDivElement | null>(null);
const stripeInstance = ref<StripeInstance | null>(null);
const stripeElements = ref<StripeElements | null>(null);
const cardElement = ref<StripePaymentElement | null>(null);
const errorMessage = ref<string | null>(null);
const isConfirming = ref(false);
const isLoadingStripe = ref(false);
const isMountingElements = ref(false);

const playerStore = useFormPlayerStore();

const publishableKey = computed(() => props.client.publishableKey.value);
const clientSecret = computed(() => props.client.clientSecret.value);

const isCardReady = computed(() => !!publishableKey.value && !!clientSecret.value && !!cardElement.value);
const isPreparing = computed(() => props.client.isLoadingIntent.value || isLoadingStripe.value || isMountingElements.value || !isCardReady.value);
const statusText = computed(() => {
  if (props.client.isLoadingIntent.value) return 'Creating payment intent…';
  if (isLoadingStripe.value) return 'Loading Stripe…';
  if (isMountingElements.value) return 'Preparing payment form…';
  if (!isCardReady.value) return 'Payment is not ready. Please retry.';
  return '';
});

const centsToCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount / 100);
};

const formattedAmount = computed(() => {
  if (!props.form.payment) return '';
  return centsToCurrency(props.form.payment.amount_cents, props.form.payment.currency);
});

const paymentModeLabel = computed(() => {
  if (!props.form.payment) return 'Unknown';
  return props.form.payment.mode === 'custom' ? 'Custom (creator account)' : 'Platform (VenSuite)';
});

const mountCard = async () => {
  if (!publishableKey.value || !clientSecret.value || !cardElementContainer.value) return;

  try {
    isLoadingStripe.value = true;
    stripeInstance.value = await getStripeInstance(publishableKey.value);
    if (!stripeInstance.value) {
      throw new Error('Unable to initialize Stripe.');
    }

    isMountingElements.value = true;
    stripeElements.value = stripeInstance.value.elements({ clientSecret: clientSecret.value });
    cardElement.value = stripeElements.value.create('payment');
    cardElement.value.mount(cardElementContainer.value);
    cardElement.value.on('change', (event: StripePaymentElementChangeEvent) => {
      errorMessage.value = event.error?.message ?? null;
    });
  } catch (error) {
    console.error('Failed to mount Stripe payment element', error);
    errorMessage.value = 'Unable to render payment form. Please refresh and try again.';
    emit('retry');
  } finally {
    isLoadingStripe.value = false;
    isMountingElements.value = false;
  }
};

const destroyCard = () => {
  cardElement.value?.unmount();
  cardElement.value = null;
  stripeElements.value = null;
};

const emitCancel = () => {
  emit('cancel');
};

const confirmPayment = async () => {
  if (!stripeInstance.value || !stripeElements.value || !clientSecret.value || !props.responseId) {
    toast.error('Payment is not ready. Please retry.');
    emit('retry');
    return;
  }

  isConfirming.value = true;
  playerStore.setPaymentState('pending');
  errorMessage.value = null;

  try {
    const submitResult = await stripeElements.value.submit();
    if ((submitResult as any)?.error?.message) {
      errorMessage.value = (submitResult as any).error.message;
      playerStore.setPaymentState('failed', errorMessage.value);
      return;
    }

    const returnUrl = props.successUrl || window.location.href;

    const result = await stripeInstance.value.confirmPayment({
      elements: stripeElements.value,
      clientSecret: clientSecret.value,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      errorMessage.value = result.error.message ?? 'Payment failed. Please try again.';
      playerStore.setPaymentState('failed', errorMessage.value);
      return;
    }

    playerStore.setPaymentState('succeeded');
    toast.success('Payment successful.');
    emit('success');
  } catch (error) {
    const message = (error as Error)?.message ?? 'Payment confirmation failed.';
    errorMessage.value = message;
    playerStore.setPaymentState('failed', message);
  } finally {
    isConfirming.value = false;
  }
};

watch(
  () => publishableKey.value,
  () => {
    destroyCard();
    if (publishableKey.value && clientSecret.value) {
      nextTick(() => mountCard());
    }
  },
);

watch(
  () => clientSecret.value,
  () => {
    destroyCard();
    if (publishableKey.value && clientSecret.value) {
      nextTick(() => mountCard());
    }
  },
);

onMounted(() => {
  nextTick(() => mountCard());
});

onBeforeUnmount(() => {
  destroyCard();
});

const isSubmitting = computed(() => props.isSubmitting || isConfirming.value);
</script>
