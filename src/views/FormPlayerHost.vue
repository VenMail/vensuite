<template>
  <div class="player-host" :style="rootStyle">
    <div class="player-host__shell">
      <header
        v-if="showBrand"
        class="player-host__brand"
        :class="`player-host__brand--${logoAlignment}`"
      >
        <img :src="logoUrl" :style="logoStyle" alt="Form logo" />
      </header>

      <div v-if="emailRequired" class="player-host__callout">
        <h3>Email required</h3>
        <p>We will ask for your email address so we can send confirmations and receipts.</p>
      </div>

      <div v-if="showPaymentReminder" class="player-host__callout player-host__callout--payment">
        <h3>Payment due</h3>
        <p>{{ paymentSummaryText }}</p>
      </div>

      <main class="player-host__body">
        <section v-if="stage === 'loading'" class="player-host__state">
          <span>Loading form…</span>
        </section>

        <section v-else-if="stage === 'error'" class="player-host__state player-host__state--error">
          <p>{{ loadError }}</p>
          <button type="button" class="player-host__button" @click="reload">Retry</button>
        </section>

        <section v-else-if="stage === 'welcome'" class="player-host__welcome">
          <div class="welcome-card">
            <h2>{{ welcomeScreen?.title ?? 'Welcome' }}</h2>
            <p v-if="welcomeScreen?.subtitle">{{ welcomeScreen?.subtitle }}</p>
            <button type="button" class="player-host__button player-host__button--primary" @click="startForm">
              {{ welcomeScreen?.button_text ?? 'Start' }}
            </button>
          </div>
        </section>

        <FocusPlayer
          v-else-if="stage === 'playing' && mode === 'focus'"
          :is-submitting="isSubmitting"
          @complete="handleCompletionRequest"
        />

        <ClassicPlayer
          v-else-if="stage === 'playing' && mode === 'classic'"
          :is-submitting="isSubmitting"
          @submit="handleCompletionRequest"
        />

        <PaymentStep
          v-else-if="stage === 'payment' && formDefinition"
          :form="formDefinition"
          :client="paymentClient"
          :is-submitting="isSubmitting"
          :response-id="playerState.responseId"
          @success="handlePaymentSuccess"
          @cancel="handlePaymentCancel"
          @retry="handlePaymentRetry"
        />

        <section v-else-if="stage === 'completed'" class="player-host__completion">
          <div class="completion-card">
            <h2>{{ completionTitle }}</h2>
            <p v-if="completionMessage">{{ completionMessage }}</p>
            <button v-if="completionButtonText" type="button" class="player-host__button" @click="reload">
              {{ completionButtonText }}
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import FocusPlayer from '@/components/forms/player/FocusPlayer.vue';
import ClassicPlayer from '@/components/forms/player/ClassicPlayer.vue';
import PaymentStep from '@/components/forms/player/PaymentStep.vue';
import { fetchPublicForm, submitResponse, updateResponseDraft } from '@/services/responses';
import { fetchForm } from '@/services/forms';
import { useFormPlayerStore } from '@/store/formPlayer';
import { usePaymentClient } from '@/composables/usePaymentClient';
import { toast } from '@/composables/useToast';
import type { FormCompletionScreen, FormDefinition, FormWelcomeScreen } from '@/types';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const slug = computed(() => route.params.slug as string | undefined);
const formIdParam = computed(() => route.params.id as string | undefined);

const playerStore = useFormPlayerStore();
const { state: playerState, mode } = storeToRefs(playerStore);
const authStore = useAuthStore();

const paymentSlug = computed(() => slug.value ?? formIdParam.value ?? '');
const paymentClient = usePaymentClient({ slug: paymentSlug });
const submissionSlug = computed(() => formDefinition.value?.slug ?? slug.value ?? '');

const formDefinition = ref<FormDefinition | null>(null);
const isSubmitting = ref(false);
const loadError = ref<string | null>(null);
const stage = ref<'loading' | 'welcome' | 'playing' | 'payment' | 'completed' | 'error'>('loading');

const welcomeScreen = computed<FormWelcomeScreen | null>(() => {
  const screen = formDefinition.value?.welcome_screen;
  return screen?.enabled ? screen : null;
});
const completionScreen = computed<FormCompletionScreen | null>(() => {
  const screen = formDefinition.value?.completion_screen;
  return screen?.enabled ? screen : null;
});

const completionTitle = computed(() => completionScreen.value?.title ?? 'Thank you!');
const completionMessage = computed(() => completionScreen.value?.message ?? 'Your response has been recorded.');
const completionButtonText = computed(() => completionScreen.value?.button_text ?? null);

const theme = computed(() => formDefinition.value?.theme);
const typography = computed(() => formDefinition.value?.typography);
const header = computed(() => formDefinition.value?.header);
const settings = computed(() => formDefinition.value?.settings);
const paymentSettings = computed(() => formDefinition.value?.payment);

const adjustColor = (hex: string | undefined, percent: number): string | undefined => {
  if (!hex) return undefined;
  const sanitized = hex.replace('#', '');
  const normalized = sanitized.length === 3
    ? sanitized.split('').map((char) => `${char}${char}`).join('')
    : sanitized;
  if (normalized.length !== 6) return hex;

  const num = parseInt(normalized, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const accentColor = computed(() => theme.value?.primary_color || '#2563eb');
const accentColorStrong = computed(() => {
  if (theme.value?.secondary_color) return theme.value.secondary_color;
  return adjustColor(accentColor.value, -12) || '#1d4ed8';
});

const rootStyle = computed(() => {
  const styles: Record<string, string> = {
    background: theme.value?.background_color ?? '#f4f5f9',
    color: theme.value?.text_color ?? '#0f172a',
    '--player-accent': accentColor.value,
    '--player-accent-strong': accentColorStrong.value,
    '--player-surface': theme.value?.surface_color ?? 'rgba(255, 255, 255, 0.95)',
  };

  if (typography.value?.body_font_family) {
    styles.fontFamily = typography.value.body_font_family;
  }

  return styles;
});

const showBrand = computed(() => Boolean(header.value?.enabled && header.value?.logo_url));
const logoUrl = computed(() => header.value?.logo_url ?? '');
const logoWidth = computed(() => header.value?.logo_width ?? 120);
const logoStyle = computed(() => ({
  width: `${Math.min(Math.max(40, logoWidth.value), 220)}px`,
}));
const logoAlignment = computed(() => header.value?.alignment ?? 'center');

const emailRequired = computed(() => Boolean(settings.value?.collect_email));

const showPaymentReminder = computed(() => Boolean(paymentSettings.value?.enabled && paymentSettings.value.amount_cents));
const paymentSummaryText = computed(() => {
  if (!paymentSettings.value?.amount_cents) return '';
  const amount = (paymentSettings.value.amount_cents / 100).toFixed(2);
  const currency = paymentSettings.value.currency ?? 'USD';
  return `You’ll be asked to pay ${currency.toUpperCase()} ${amount} before submitting.`;
});

const ensureWelcomeStage = () => {
  if (welcomeScreen.value) {
    stage.value = 'welcome';
  } else {
    stage.value = 'playing';
  }
};

const resetState = () => {
  playerStore.reset();
  paymentClient.clearPayment();
  loadError.value = null;
  stage.value = 'loading';
  formDefinition.value = null;
};

const resolveAuthOptions = () => {
  const token = authStore.getToken?.() ?? authStore.token ?? null;
  return token ? { auth: { token } } : undefined;
};

const applyDefinition = (definition: FormDefinition) => {
  formDefinition.value = definition;
  playerStore.setFormDefinition(definition, definition.slug ?? slug.value ?? formIdParam.value ?? '');
  playerStore.setPaymentRequired(!!definition.payment?.enabled);
  ensureWelcomeStage();
};

const loadForm = async () => {
  resetState();

  try {
    let definition: FormDefinition;
    if (slug.value) {
      definition = await fetchPublicForm(slug.value);
    } else if (formIdParam.value) {
      const authOptions = resolveAuthOptions();
      if (!authOptions) {
        toast.error('Authentication required to preview this form.');
        throw { data: { message: 'Authentication required to preview this form.' } };
      }
      definition = await fetchForm(formIdParam.value, authOptions);
    } else {
      throw new Error('Missing form identifier');
    }
    applyDefinition(definition);
  } catch (error: any) {
    loadError.value = error?.data?.message ?? 'Failed to load form.';
    stage.value = 'error';
  }
};

const startForm = () => {
  stage.value = 'playing';
};

const startPaymentFlow = async (responseId: string) => {
  if (!formDefinition.value?.payment) return;

  try {
    await paymentClient.loadPaymentIntent({
      response_id: responseId,
      amount_cents: formDefinition.value.payment.amount_cents,
      currency: formDefinition.value.payment.currency,
    });
    stage.value = 'payment';
  } catch (error) {
    toast.error('Could not start payment flow. Please retry.');
    stage.value = 'playing';
  }
};

const submitAnswers = async () => {
  if (!formDefinition.value) return;
  isSubmitting.value = true;
  loadError.value = null;

  const currentSlug = submissionSlug.value;
  if (!currentSlug) {
    toast.error('This form is not publicly accessible yet. Publish to allow submissions.');
    isSubmitting.value = false;
    return;
  }

  try {
    const payload = {
      answers: { ...playerState.value.answers },
    };

    const responseResult = playerState.value.responseId
      ? await updateResponseDraft(currentSlug, playerState.value.responseId, payload)
      : await submitResponse(currentSlug, payload);

    playerStore.setResponseId(String(responseResult.response.id));

    if (responseResult.nextQuestionId) {
      playerStore.advanceToQuestion(responseResult.nextQuestionId);
    } else {
      playerStore.advanceToQuestion(null);
    }

    if (responseResult.requiresPayment) {
      playerStore.setPaymentRequired(true);
      await startPaymentFlow(String(responseResult.response.id));
      return;
    }

    stage.value = 'completed';
    toast.success('Response submitted successfully.');
  } catch (error: any) {
    const message = error?.data?.message ?? 'Failed to submit response.';
    toast.error(message);
    loadError.value = message;
    stage.value = 'playing';
  } finally {
    isSubmitting.value = false;
  }
};

const handleCompletionRequest = () => {
  submitAnswers();
};

const handlePaymentSuccess = () => {
  playerStore.setPaymentState('succeeded');
  stage.value = 'completed';
  toast.success('Payment confirmed. Thank you!');
};

const handlePaymentCancel = () => {
  paymentClient.cancelPayment().finally(() => {
    stage.value = 'playing';
  });
};

const handlePaymentRetry = async () => {
  const responseId = playerState.value.responseId;
  if (!responseId || !formDefinition.value?.payment) return;
  await startPaymentFlow(responseId);
};

const reload = () => {
  loadForm();
};

onMounted(() => {
  loadForm();
});

watch(
  () => [slug.value, formIdParam.value],
  ([newSlug, newId], [oldSlug, oldId]) => {
    if ((newSlug && newSlug !== oldSlug) || (newId && newId !== oldId)) {
      loadForm();
    }
  },
);

watch(
  () => paymentClient.paymentStatus.value,
  (status) => {
    if (status === 'succeeded' && stage.value === 'payment') {
      handlePaymentSuccess();
    }
  },
);
</script>

<style scoped>
.player-host {
  min-height: 100vh;
  padding: clamp(2rem, 4vw, 3.5rem) clamp(1rem, 4vw, 3rem);
  display: flex;
  justify-content: center;
  color: #0f172a;
}

.player-host__shell {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.player-host__brand {
  display: flex;
  align-items: center;
}

.player-host__brand img {
  max-height: 72px;
  object-fit: contain;
}

.player-host__brand--left {
  justify-content: flex-start;
}

.player-host__brand--center {
  justify-content: center;
}

.player-host__brand--right {
  justify-content: flex-end;
}

.player-host__header {
  text-align: center;
  padding: 1.25rem clamp(1rem, 4vw, 2.5rem);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
}

.player-host__header h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.player-host__header p {
  max-width: 640px;
  margin: 0 auto;
  color: rgba(15, 23, 42, 0.72);
}

.player-host__callout {
  border-radius: 1.25rem;
  border: 1px solid rgba(99, 102, 241, 0.15);
  background: rgba(99, 102, 241, 0.08);
  padding: 1rem 1.5rem;
  color: #312e81;
  display: grid;
  gap: 0.25rem;
}

.player-host__callout h3 {
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.player-host__callout p {
  font-size: 0.925rem;
}

.player-host__callout--payment {
  border-color: rgba(22, 163, 74, 0.2);
  background: rgba(34, 197, 94, 0.08);
  color: #166534;
}

.player-host__body {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 1.75rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: clamp(1.5rem, 4vw, 3rem);
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
}

.player-host__state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 240px;
  background: rgba(241, 245, 249, 0.6);
  border-radius: 1rem;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  padding: 2rem;
}

.player-host__state--error {
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
}

.player-host__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(100, 116, 139, 0.35);
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  font-weight: 600;
  transition: background 0.2s ease, transform 0.2s ease;
}

.player-host__button:hover {
  background: rgba(248, 250, 252, 0.85);
  transform: translateY(-1px);
}

.player-host__button--primary {
  background: var(--player-accent, #2563eb);
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.35);
}

.player-host__button--primary:hover {
  background: var(--player-accent-strong, #1d4ed8);
}

.player-host__welcome,
.player-host__completion {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 320px;
}

.welcome-card,
.completion-card {
  width: min(480px, 100%);
  text-align: center;
  background: white;
  padding: 2.5rem 2rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
}

.welcome-card h2,
.completion-card h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  margin-bottom: 0.75rem;
}

.welcome-card p,
.completion-card p {
  color: rgba(15, 23, 42, 0.7);
  margin-bottom: 1.5rem;
}
</style>
