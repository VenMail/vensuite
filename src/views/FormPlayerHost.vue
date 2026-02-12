<template>
  <div
    class="player-host bg-[var(--player-bg)] text-[var(--player-text-color)] dark:bg-slate-950 dark:text-slate-100"
    :style="rootStyle"
  >
    <div class="player-host__shell">
      <header
        v-if="showBrand"
        class="player-host__brand"
        :class="`player-host__brand--${logoAlignment}`"
      >
        <img :src="logoSrc" :style="logoStyle" alt="Form logo" />
      </header>

      <div
        v-if="emailRequired"
        class="player-host__callout player-host__callout--accent"
      >
        <h3>{{$t('Commons.heading.email_required')}}</h3>
        <p>{{$t('Views.FormPlayerHost.text.we_will_ask_for')}}</p>
      </div>

      <div
        v-if="showPaymentReminder"
        class="player-host__callout player-host__callout--payment border border-emerald-200/60 bg-emerald-50/70 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      >
        <h3>{{$t('Commons.heading.payment_due')}}</h3>
        <p>{{ paymentSummaryText }}</p>
      </div>

      <main
        :class="[
          'player-host__body',
          isClassicMode
            ? 'player-host__body--classic rounded-3xl border border-slate-200/70 bg-white/90 shadow-2xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-black/40'
            : 'player-host__body--focus'
        ]"
      >
        <section v-if="stage === 'loading'" class="player-host__state">
          <span>{{$t('commons.text.loading_form')}}</span>
        </section>

        <section v-else-if="stage === 'error'" class="player-host__state player-host__state--error">
          <p>{{ loadError }}</p>
          <button type="button" class="player-host__button" @click="reload">{{$t('Commons.button.retry')}}</button>
        </section>

        <section v-else-if="stage === 'welcome' && showResumePrompt" class="player-host__welcome">
          <div
            class="welcome-card rounded-3xl border border-slate-200/70 bg-white/90 text-slate-900 shadow-2xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-black/40"
          >
            <div class="resume-icon mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--player-accent)]/10">
              <svg class="h-8 w-8 text-[var(--player-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2>{{ $t('Commons.heading.welcome_back') ?? 'Welcome back!' }}</h2>
            <p class="text-slate-600 dark:text-slate-300">{{ $t('Views.FormPlayerHost.text.you_have_unsaved_progress') ?? 'You have unsaved progress on this form. Would you like to continue where you left off?' }}</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                class="player-host__button player-host__button--primary"
                @click="resumeForm"
              >
                {{ $t('Commons.button.resume') ?? 'Resume' }}
              </button>
              <button
                type="button"
                class="player-host__button player-host__button--secondary"
                @click="startFresh"
              >
                {{ $t('Commons.button.start_over') ?? 'Start over' }}
              </button>
            </div>
          </div>
        </section>

        <section v-else-if="stage === 'welcome'" class="player-host__welcome">
          <div
            class="welcome-card rounded-3xl border border-slate-200/70 bg-white/90 text-slate-900 shadow-2xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-black/40"
          >
            <h2>{{ welcomeScreen?.title ?? $t('Commons.heading.welcome') }}</h2>
            <p v-if="welcomeScreen?.subtitle" class="text-slate-600 dark:text-slate-300">{{ welcomeScreen?.subtitle }}</p>
            <button
              type="button"
              class="player-host__button player-host__button--primary"
              @click="startForm"
            >
              {{ welcomeScreen?.button_text ?? $t('Commons.button.share') }}
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
          <div
            :class="[
              'completion-card rounded-3xl border border-slate-200/70 bg-white/90 text-slate-900 shadow-2xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-black/40',
              isClassicMode ? 'completion-card--classic' : 'completion-card--focus'
            ]"
          >
            <div
              :class="[
                'completion-card__badge',
                isClassicMode
                  ? 'completion-card__badge--classic'
                  : 'completion-card__badge--focus'
              ]"
            >
              <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r="25" />
                <polyline points="16 26 23 33 36 20" />
              </svg>
            </div>
            <div class="completion-card__body">
              <h2>{{ completionTitle }}</h2>
              <p v-if="completionMessage" class="text-slate-600 dark:text-slate-300">{{ completionMessage }}</p>
              <button
                v-if="completionButtonText"
                type="button"
                class="player-host__button player-host__button--secondary completion-card__button"
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
import { useFormProgressCache } from '@/composables/useFormProgressCache';
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

const progressCache = useFormProgressCache();

const formDefinition = ref<FormDefinition | null>(null);
const isSubmitting = ref(false);
const loadError = ref<string | null>(null);
const stage = ref<'loading' | 'welcome' | 'playing' | 'payment' | 'completed' | 'error'>('loading');
const showResumePrompt = ref(false);

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

const apiOrigin = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base !== 'string' || !base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
});

const resolveAssetUrl = (value?: string | null): string => {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  try {
    return new URL(raw).toString();
  } catch {
    // continue
  }

  const origin = apiOrigin.value ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) return raw;

  if (raw.startsWith('//')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return `${protocol}${raw}`;
  }
  if (raw.startsWith('/')) return `${origin}${raw}`;
  return `${origin}/${raw}`;
};

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
    '--player-bg': backgroundColor,
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

const logoSrc = computed(() => resolveAssetUrl(header.value?.logo_url ?? ''));
const showBrand = computed(() => Boolean(header.value?.enabled && logoSrc.value));
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
  progressCache.stopWatching();
  playerStore.reset();
  paymentClient.clearPayment();
  loadError.value = null;
  stage.value = 'loading';
  formDefinition.value = null;
  showResumePrompt.value = false;
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

  // Check for cached progress
  const savePartial = definition.settings?.save_partial_responses !== false;
  if (savePartial && progressCache.hasProgress()) {
    showResumePrompt.value = true;
    stage.value = 'welcome';
    return;
  }

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
  showResumePrompt.value = false;
  stage.value = 'playing';
  progressCache.startWatching();
};

const resumeForm = () => {
  const restored = progressCache.restoreProgress();
  showResumePrompt.value = false;
  if (restored) {
    stage.value = 'playing';
    progressCache.startWatching();
    toast.success('Progress restored. Pick up where you left off!');
  } else {
    ensureWelcomeStage();
    progressCache.startWatching();
  }
};

const startFresh = () => {
  progressCache.clearProgress();
  showResumePrompt.value = false;
  ensureWelcomeStage();
  progressCache.startWatching();
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
    progressCache.clearProgress();
    progressCache.stopWatching();
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
  progressCache.clearProgress();
  progressCache.stopWatching();
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
  padding: 1rem 1.5rem;
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

.player-host__callout--accent {
  border: 1px solid color-mix(in srgb, var(--player-accent, #2563eb) 20%, transparent);
  background: color-mix(in srgb, var(--player-accent, #2563eb) 7%, rgba(248, 250, 252, 0.9));
  color: var(--player-text-color, #0f172a);
}

.player-host__callout--payment {
}

.player-host__body {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0;
}

.player-host__body--classic {
  border-radius: 1.75rem;
  padding: clamp(1.5rem, 4vw, 3rem);
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
  border-radius: 1rem;
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
  font-weight: 600;
  transition: background 0.2s ease, transform 0.2s ease;
}

.player-host__button:hover {
  background: rgba(248, 250, 252, 0.85);
  transform: translateY(-1px);
}

.player-host__button--primary {
  border: 1px solid transparent;
  background: var(--player-accent, #2563eb);
  color: #fff;
  box-shadow: 0 10px 25px -8px color-mix(in srgb, var(--player-accent, #2563eb) 35%, transparent);
}

.player-host__button--primary:hover {
  background: var(--player-accent-strong, #1d4ed8);
  transform: translateY(-2px);
}

.player-host__button--primary:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--player-bg, #fff), 0 0 0 4px var(--player-accent, #2563eb);
}

.player-host__button--secondary {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(255, 255, 255, 0.9);
  color: var(--player-text-color, #334155);
}

.player-host__button--secondary:hover {
  background: rgba(248, 250, 252, 0.95);
  transform: translateY(-1px);
}

.player-host__button--secondary:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--player-bg, #fff), 0 0 0 4px var(--player-accent, #2563eb);
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
  padding: 2.5rem 2rem;
  border-radius: 1.5rem;
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
  box-shadow: 0 20px 45px color-mix(in srgb, var(--player-accent, #2563eb) 18%, transparent);
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
  stroke: color-mix(in srgb, var(--player-accent, #2563eb) 18%, transparent);
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
  background: radial-gradient(circle at top, color-mix(in srgb, var(--player-accent, #2563eb) 8%, transparent), transparent 60%), white;
  border: 1px solid color-mix(in srgb, var(--player-accent, #2563eb) 18%, transparent);
}

.completion-card--focus {
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.25);
}
</style>
