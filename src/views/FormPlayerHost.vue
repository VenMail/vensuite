<template>
  <div class="player-host">
    <header class="player-host__header" v-if="formTitle">
      <h1>{{ formTitle }}</h1>
      <p v-if="formDescription">{{ formDescription }}</p>
    </header>

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
import { useFormPlayerStore } from '@/store/formPlayer';
import { usePaymentClient } from '@/composables/usePaymentClient';
import { toast } from '@/composables/useToast';
import type { FormCompletionScreen, FormDefinition, FormWelcomeScreen } from '@/types';

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const playerStore = useFormPlayerStore();
const { state: playerState, mode } = storeToRefs(playerStore);

const paymentClient = usePaymentClient({ slug });

const formDefinition = ref<FormDefinition | null>(null);
const isSubmitting = ref(false);
const loadError = ref<string | null>(null);
const stage = ref<'loading' | 'welcome' | 'playing' | 'payment' | 'completed' | 'error'>('loading');

const formTitle = computed(() => formDefinition.value?.title ?? 'Form');
const formDescription = computed(() => formDefinition.value?.description ?? '');
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

const applyDefinition = (definition: FormDefinition) => {
  formDefinition.value = definition;
  playerStore.setFormDefinition(definition, definition.slug ?? slug.value);
  playerStore.setPaymentRequired(!!definition.payment?.enabled);
  ensureWelcomeStage();
};

const loadForm = async () => {
  if (!slug.value) return;
  resetState();

  try {
    const definition = await fetchPublicForm(slug.value);
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

  try {
    const payload = {
      answers: { ...playerState.value.answers },
    };

    const responseResult = playerState.value.responseId
      ? await updateResponseDraft(slug.value, playerState.value.responseId, payload)
      : await submitResponse(slug.value, payload);

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
  () => slug.value,
  (value, oldValue) => {
    if (value && value !== oldValue) {
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
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  color: #111827;
}

.player-host__header {
  text-align: center;
  margin-bottom: 2rem;
}

.player-host__header h1 {
  font-size: 2rem;
  font-weight: 600;
}

.player-host__header p {
  margin-top: 0.5rem;
  color: #4b5563;
}

.player-host__state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 240px;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
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
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  border: 1px solid #d1d5db;
  background: white;
  color: #1f2937;
  font-weight: 500;
  transition: background 0.2s ease, transform 0.2s ease;
}

.player-host__button:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.player-host__button--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.player-host__button--primary:hover {
  background: #1d4ed8;
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
  max-width: 420px;
  text-align: center;
  background: white;
  padding: 2.5rem 2rem;
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.welcome-card h2,
.completion-card h2 {
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
}

.welcome-card p,
.completion-card p {
  color: #4b5563;
  margin-bottom: 1.5rem;
}
</style>
