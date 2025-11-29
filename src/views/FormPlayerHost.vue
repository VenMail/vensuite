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

      <main :class="['player-host__body', isClassicMode ? 'player-host__body--classic' : 'player-host__body--focus']">
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
          :label-placement="labelPlacement"
          :density="formDensity"
          @complete="handleCompletionRequest"
        />

        <ClassicPlayer
          v-else-if="stage === 'playing' && mode === 'classic'"
          :is-submitting="isSubmitting"
          :label-placement="labelPlacement"
          :density="formDensity"
          @submit="handleCompletionRequest"
        />

        <PaymentStep
          v-else-if="stage === 'payment' && formDefinition"
          :form="formDefinition"
          :client="paymentClient"
          :is-submitting="isSubmitting"
          :response-id="playerState.responseId"
          :success-url="paymentSuccessUrl"
          @success="handlePaymentSuccess"
          @cancel="handlePaymentCancel"
          @retry="handlePaymentRetry"
        />

        <section v-else-if="stage === 'completed'" class="player-host__completion">
          <div :class="['completion-card', isClassicMode ? 'completion-card--classic' : 'completion-card--focus']">
            <div :class="['completion-card__badge', isClassicMode ? 'completion-card__badge--classic' : 'completion-card__badge--focus']">
              <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r="25" />
                <polyline points="16 26 23 33 36 20" />
              </svg>
            </div>
            <div class="completion-card__body">
              <h2>{{ completionTitle }}</h2>
              <p v-if="completionMessage">{{ completionMessage }}</p>
              <button
                v-if="completionButtonText"
                type="button"
                class="player-host__button completion-card__button"
                @click="reload"
              >
                {{ completionButtonText }}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import FocusPlayer from '@/components/forms/player/FocusPlayer.vue';
import ClassicPlayer from '@/components/forms/player/ClassicPlayer.vue';
import PaymentStep from '@/components/forms/player/PaymentStep.vue';
import { fetchPublicForm, submitResponse, updateResponseDraft, finalizeResponseSubmission } from '@/services/responses';
import { fetchForm } from '@/services/forms';
import { useFormPlayerStore } from '@/store/formPlayer';
import { usePaymentClient } from '@/composables/usePaymentClient';
import { toast } from '@/composables/useToast';
import type { FormCompletionScreen, FormDefinition, FormWelcomeScreen, FormDensity, FormLabelPlacement, FormResponse } from '@/types';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const slug = computed(() => route.params.slug as string | undefined);
const formIdParam = computed(() => route.params.id as string | undefined);

const playerStore = useFormPlayerStore();
const { state: playerState, mode } = storeToRefs(playerStore);
const authStore = useAuthStore();

const submissionSlug = computed(() => formDefinition.value?.sharing?.share_slug ?? slug.value ?? '');
const paymentSlug = computed(() => submissionSlug.value);
const paymentClient = usePaymentClient({ slug: paymentSlug });

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

const labelPlacement = computed<FormLabelPlacement>(() => {
  const setting = settings.value?.label_placement;
  return setting === 'inline' ? 'inline' : 'stacked';
});

const formDensity = computed<FormDensity>(() => {
  const setting = settings.value?.form_density;
  return setting === 'compact' ? 'compact' : 'comfortable';
});

const isClassicMode = computed(() => mode.value === 'classic');

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
  const backgroundColor = theme.value?.background_color ?? '#f4f5f9';
  const textColor = theme.value?.text_color ?? '#0f172a';
  const surfaceColor = theme.value?.surface_color ?? 'rgba(255, 255, 255, 0.95)';
  const surfaceBorder = (theme.value as any)?.surface_border_color ?? 'rgba(148, 163, 184, 0.35)';
  const mutedSurface = (theme.value as any)?.muted_surface_color ?? 'rgba(248, 250, 252, 0.85)';
  const mutedBorder = (theme.value as any)?.muted_border_color ?? 'rgba(203, 213, 225, 0.6)';
  const progressTrack = (theme.value as any)?.progress_track_color ?? 'rgba(226, 232, 240, 0.95)';
  const elevation = (theme.value as any)?.elevation ?? '0 25px 60px rgba(15, 23, 42, 0.12)';
  const mutedElevation = (theme.value as any)?.muted_elevation ?? '0 12px 32px rgba(15, 23, 42, 0.08)';

  const styles: Record<string, string> = {
    background: backgroundColor,
    color: textColor,
    '--player-text-color': textColor,
    '--player-accent': accentColor.value,
    '--player-accent-strong': accentColorStrong.value,
    '--player-surface': surfaceColor,
    '--player-surface-border': surfaceBorder,
    '--player-muted-surface': mutedSurface,
    '--player-muted-border': mutedBorder,
    '--player-progress-track': progressTrack,
    '--player-elevation': elevation,
    '--player-muted-elevation': mutedElevation,
  };

  if (typography.value?.body_font_family) {
    styles.fontFamily = typography.value.body_font_family;
    styles['--player-body-font'] = typography.value.body_font_family;
  }

  if (typography.value?.heading_font_family) {
    styles['--player-heading-font'] = typography.value.heading_font_family;
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

const findCustomerEmail = (): string | null => {
  const definition = formDefinition.value;
  if (!definition) return null;

  const emailQuestion = definition.questions?.find((question) => question.type === 'email');
  if (emailQuestion) {
    const answer = playerState.value.answers[emailQuestion.id];
    if (typeof answer === 'string' && answer.includes('@')) {
      return answer;
    }
  }

  const maybeEmail = Object.values(playerState.value.answers).find(
    (value) => typeof value === 'string' && value.includes('@'),
  );
  return typeof maybeEmail === 'string' ? maybeEmail : null;
};

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
  playerStore.setFormDefinition(
    definition,
    definition.sharing?.share_slug ?? definition.slug ?? slug.value ?? formIdParam.value ?? ''
  );
  const paymentEnabled = Boolean(definition.payment?.enabled && (definition.payment?.amount_cents ?? 0) > 0);
  playerStore.setPaymentRequired(paymentEnabled);
  ensureWelcomeStage();
};

const customFontLinkId = 'form-player-custom-font';
let customFontLinkEl: HTMLLinkElement | null = null;

const removeCustomFontLink = () => {
  if (customFontLinkEl && customFontLinkEl.parentNode) {
    customFontLinkEl.parentNode.removeChild(customFontLinkEl);
  }
  customFontLinkEl = null;
};

const attachCustomFontLink = (href: string) => {
  removeCustomFontLink();
  const link = document.createElement('link');
  link.id = customFontLinkId;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  customFontLinkEl = link;
};

const isValidGoogleFontUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host.endsWith('fonts.googleapis.com') || host.endsWith('fonts.gstatic.com');
  } catch {
    return false;
  }
};

const customFontUrl = computed(() => {
  const query = route.query.fontUrl ?? route.query.font_url;
  if (typeof query === 'string' && isValidGoogleFontUrl(query)) {
    return query;
  }
  return null;
});

watch(customFontUrl, (url) => {
  if (url) {
    attachCustomFontLink(url);
  } else {
    removeCustomFontLink();
  }
}, { immediate: true });

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
  if (!responseId || Number(responseId) <= 0) {
    toast.error('Invalid response. Please retry submission.');
    stage.value = 'playing';
    return;
  }
  if (!formDefinition.value?.payment) return;

  try {
    if (playerState.value.paymentIntentId) {
      await paymentClient.cancelPayment();
    }
    const customerEmail = findCustomerEmail();
    await paymentClient.loadPaymentIntent({
      response_id: responseId,
      amount_cents: formDefinition.value.payment.amount_cents,
      currency: formDefinition.value.payment.currency,
      customer_email: customerEmail ?? undefined,
      metadata: {
        form_id: formDefinition.value.id,
        layout_mode: formDefinition.value.layout_mode,
        responder_email: customerEmail ?? undefined,
      },
      captcha_token: playerState.value.captchaToken ?? undefined,
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
      captcha_token: playerState.value.captchaToken ?? undefined,
    };

    const responseResult = playerState.value.responseId
      ? await updateResponseDraft(currentSlug, playerState.value.responseId, payload)
      : await submitResponse(currentSlug, payload);

    const responseId = String(responseResult.response.id);
    if (!responseId || Number(responseId) <= 0) {
      toast.error('Could not create response. Please try again.');
      loadError.value = 'Missing response ID';
      stage.value = 'playing';
      return;
    }
    playerStore.setResponseId(responseId);

    if (responseResult.nextType === 'question' && responseResult.nextQuestionId) {
      playerStore.advanceToQuestion(responseResult.nextQuestionId);
      return;
    }

    if (responseResult.nextType === 'payment') {
      if (responseResult.paymentIntentId) {
        playerStore.setPaymentIntent(responseResult.paymentIntentId);
      }
      await startPaymentFlow(responseId);
      return;
    }

    let finalizedResponse: FormResponse | null = null;
    try {
      finalizedResponse = await finalizeResponseSubmission(currentSlug, responseId, {
        captcha_token: playerState.value.captchaToken ?? undefined,
      });
    } catch (error: any) {
      const message = error?.data?.message ?? 'Failed to finalize response.';
      toast.error(message);
      loadError.value = message;
      stage.value = 'playing';
      return;
    }

    const finalStatus =
      finalizedResponse && typeof finalizedResponse === 'object' && 'status' in finalizedResponse
        ? (finalizedResponse as { status?: unknown }).status
        : undefined;
    let paymentIntentFromFinal: string | undefined;
    if (finalizedResponse && typeof finalizedResponse === 'object' && 'payment_intent_id' in finalizedResponse) {
      const candidate = (finalizedResponse as { payment_intent_id?: unknown }).payment_intent_id;
      if (typeof candidate === 'string') {
        paymentIntentFromFinal = candidate;
      } else if (candidate != null) {
        paymentIntentFromFinal = String(candidate);
      }
    }
    if (!responseResult.paymentIntentId && paymentIntentFromFinal) {
      playerStore.setPaymentIntent(paymentIntentFromFinal);
    }

    let requiresPayment = Boolean(
      responseResult.requiresPayment ?? finalStatus === 'pending_payment',
    );

    playerStore.setPaymentRequired(requiresPayment);

    if (requiresPayment) {
      if (responseResult.paymentIntentId) {
        playerStore.setPaymentIntent(responseResult.paymentIntentId);
      }
      await startPaymentFlow(responseId);
      return;
    }

    paymentClient.clearPayment();
    playerStore.advanceToQuestion(null);
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

const buildSuccessRoute = () => {
  const baseQuery: Record<string, string> = { payment: 'succeeded' };
  if (playerState.value.responseId) {
    baseQuery.responseId = String(playerState.value.responseId);
  }
  if (playerState.value.paymentIntentId) {
    baseQuery.intentId = String(playerState.value.paymentIntentId);
  }
  const paymentSettings = formDefinition.value?.payment;
  if (paymentSettings?.amount_cents) {
    baseQuery.amountCents = String(paymentSettings.amount_cents);
  }
  if (paymentSettings?.currency) {
    baseQuery.currency = paymentSettings.currency;
  }

  if (route.name === 'form-player-by-id' || formIdParam.value) {
    const idTarget = formIdParam.value ?? formDefinition.value?.id;
    if (idTarget) {
      return { name: 'form-success-by-id', params: { id: idTarget }, query: baseQuery } as const;
    }
  }

  if (submissionSlug.value) {
    return { name: 'form-success', params: { slug: submissionSlug.value }, query: baseQuery } as const;
  }

  return null;
};

const paymentSuccessUrl = computed(() => {
  const target = buildSuccessRoute();
  if (!target) return undefined;
  try {
    const resolved = router.resolve(target);
    return `${window.location.origin}${resolved.href}`;
  } catch (error) {
    console.error('Failed to resolve payment success URL', error);
    return undefined;
  }
});

const handlePaymentSuccess = () => {
  playerStore.setPaymentState('succeeded');
  playerStore.advanceToQuestion(null);
  stage.value = 'completed';
  toast.success('Payment confirmed. Thank you!');
  const target = buildSuccessRoute();
  paymentClient.clearPayment();
  if (target) {
    router.replace(target);
  }
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

watch(formDefinition, (newDefinition) => {
  if (newDefinition?.title) {
    document.title = newDefinition.title;
  }
});

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
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0;
}

.player-host__body--classic {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 1.75rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: clamp(1.5rem, 4vw, 3rem);
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
}

.player-host__body--focus {
  background: transparent;
  border-radius: 0;
  border: 0;
  box-shadow: none;
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
  display: grid;
  gap: 2rem;
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

.completion-card__badge {
  width: 104px;
  height: 104px;
  margin: 0 auto;
  border-radius: 32px;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(37, 99, 235, 0.18);
}

.completion-card__badge svg {
  width: 64px;
  height: 64px;
  stroke: white;
  stroke-width: 5;
  fill: none;
}

.completion-card__badge svg circle {
  stroke: rgba(255, 255, 255, 0.2);
}

.completion-card__badge svg polyline {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.completion-card__badge--classic {
  background: linear-gradient(135deg, var(--player-accent, #2563eb), var(--player-accent-strong, #1d4ed8));
}

.completion-card__badge--focus {
  background: white;
  border: 2px solid var(--player-accent, #2563eb);
  box-shadow: none;
}

.completion-card__badge--focus svg circle {
  stroke: rgba(37, 99, 235, 0.18);
}

.completion-card__badge--focus svg polyline {
  stroke: var(--player-accent, #2563eb);
}

.completion-card__body {
  display: grid;
  gap: 1rem;
}

.completion-card__body p {
  margin: 0;
}

.completion-card__button {
  justify-self: center;
}

.completion-card--classic {
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.08), transparent 60%), white;
  border: 1px solid rgba(37, 99, 235, 0.18);
}

.completion-card--focus {
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.25);
}
</style>
