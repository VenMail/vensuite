<template>
  <div class="success-host" :class="themeClass">
    <div class="success-host__shell">
      <header class="success-host__header">
        <div class="success-host__badge" :class="badgeClass">
          <svg viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="25" />
            <polyline v-if="isSuccess" points="16 26 23 33 36 20" />
            <template v-else>
              <line x1="16" y1="20" x2="36" y2="32" />
              <line x1="16" y1="32" x2="36" y2="20" />
            </template>
          </svg>
        </div>
        <div class="success-host__title">
          <p class="success-host__eyebrow">{{$t('Commons.text.form_submission')}}</p>
          <h1>{{ titleText }}</h1>
          <p class="success-host__subtitle">{{ subtitleText }}</p>
        </div>
      </header>

      <section class="success-host__details">
        <div class="success-host__card">
          <h2>{{$t('Commons.heading.payment_summary')}}</h2>
          <dl>
            <div v-if="paymentStatus">
              <dt>{{$t('Commons.text.status')}}</dt>
              <dd :class="statusClass">{{ statusLabel }}</dd>
            </div>
            <div v-if="responseId">
              <dt>{{$t('Commons.text.response_id')}}</dt>
              <dd>{{ responseId }}</dd>
            </div>
            <div v-if="amountLabel">
              <dt>{{$t('Commons.text.amount_paid')}}</dt>
              <dd>{{ amountLabel }}</dd>
            </div>
            <div v-if="paymentIntentId">
              <dt>{{$t('Commons.text.payment_intent')}}</dt>
              <dd>{{ paymentIntentId }}</dd>
            </div>
            <!-- <div v-if="normalizedSlug">
              <dt>Form</dt>
              <dd>{{ normalizedSlug }}</dd>
            </div> -->
            <div>
              <dt>{{$t('Commons.text.completed')}}</dt>
              <dd>{{ completedAtLabel }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <footer class="success-host__actions">
        <!-- <button type="button" class="success-host__button success-host__button--primary" @click="goToDashboard">
          Go to Venmail
        </button> -->
        <button
          v-if="returnTarget"
          type="button"
          class="success-host__button"
          @click="goToForm"
        >
          {{$t('Views.FormPaymentSuccess.button.view_form_again')}}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const paymentStatus = computed(() => {
  const status = route.query.payment;
  return typeof status === 'string' ? status.toLowerCase() : null;
});

const isSuccess = computed(() => paymentStatus.value === 'succeeded' || paymentStatus.value === 'success');
const isPending = computed(() => paymentStatus.value === 'pending');

const statusLabel = computed(() => {
  if (isSuccess.value) return 'Payment confirmed';
  if (isPending.value) return 'Pending confirmation';
  if (paymentStatus.value === 'failed') return 'Payment failed';
  return paymentStatus.value ? paymentStatus.value : 'Completed';
});

const titleText = computed(() => (isSuccess.value ? 'Thank you for your payment' : 'Submission received'));
const subtitleText = computed(() => {
  if (isSuccess.value) {
    return 'Your response has been submitted and the payment is confirmed.';
  }
  if (isPending.value) {
    return 'We are still processing your payment. You will receive an update shortly.';
  }
  if (paymentStatus.value === 'failed') {
    return 'Something went wrong while confirming the payment. Please try again.';
  }
  return 'Your response was submitted successfully.';
});

const responseId = computed(() => {
  const id = route.query.responseId;
  return typeof id === 'string' ? id : null;
});

const paymentIntentId = computed(() => {
  const id = route.query.intentId;
  return typeof id === 'string' ? id : null;
});

const slugParam = computed(() => route.params.slug);
const formIdParam = computed(() => route.params.id);

const normalizedSlug = computed(() => {
  const value = slugParam.value;
  if (Array.isArray(value)) return value.join('/');
  if (typeof value === 'string') return value;
  return null;
});

const completedAtLabel = computed(() => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date()));

const amountLabel = computed(() => {
  const amountCents = route.query.amountCents;
  if (typeof amountCents !== 'string') return null;
  const cents = Number(amountCents);
  if (!Number.isFinite(cents)) return null;
  const currency = typeof route.query.currency === 'string' ? route.query.currency : 'usd';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
});

const returnTarget = computed(() => {
  if (route.name === 'form-success-by-id') {
    const id = formIdParam.value;
    if (typeof id === 'string' && id) {
      return { name: 'form-player-by-id', params: { id } } as const;
    }
  }
  if (normalizedSlug.value) {
    return { name: 'form-player', params: { slug: normalizedSlug.value } } as const;
  }
  return null;
});

const goToForm = () => {
  if (!returnTarget.value) return;
  router.push(returnTarget.value as any);
};

// const goToDashboard = () => {
//   router.push({ name: 'forms' });
// };

const themeClass = computed(() => (isSuccess.value ? 'success-host--ok' : 'success-host--warn'));

const badgeClass = computed(() => (isSuccess.value ? 'success-host__badge--ok' : 'success-host__badge--warn'));

const statusClass = computed(() => {
  if (isSuccess.value) return 'success-host__status--ok';
  if (isPending.value) return 'success-host__status--pending';
  return 'success-host__status--warn';
});
</script>

<style scoped>
.success-host {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(2rem, 4vw, 3.5rem) clamp(1rem, 4vw, 3rem);
  background: radial-gradient(circle at top, rgba(37, 99, 235, 0.08), transparent 60%), #f8fafc;
  color: #0f172a;
}

.success-host--warn {
  background: radial-gradient(circle at top, rgba(248, 113, 113, 0.15), transparent 60%), #fdf2f2;
}

.success-host__shell {
  width: min(680px, 100%);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.success-host__header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
  text-align: center;
}

.success-host__badge {
  width: 108px;
  height: 108px;
  border-radius: 36px;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(37, 99, 235, 0.2);
}

.success-host__badge svg {
  width: 70px;
  height: 70px;
  stroke-width: 5;
  fill: none;
}

.success-host__badge svg circle {
  stroke: rgba(255, 255, 255, 0.2);
}

.success-host__badge svg polyline,
.success-host__badge svg line {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.success-host__badge--ok {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
}

.success-host__badge--ok svg {
  stroke: #fff;
}

.success-host__badge--warn {
  background: linear-gradient(135deg, #f97316, #ef4444);
  color: #fff;
}

.success-host__badge--warn svg {
  stroke: #fff;
}

.success-host__title h1 {
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.success-host__eyebrow {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: #64748b;
}

.success-host__subtitle {
  font-size: 1rem;
  color: #475569;
  max-width: 48ch;
  margin: 0 auto;
}

.success-host__details {
  display: flex;
  justify-content: center;
}

.success-host__card {
  width: min(520px, 100%);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1.5rem;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.12);
  padding: clamp(1.5rem, 3vw, 2.5rem);
}

.success-host__card h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.success-host__card dl {
  display: grid;
  gap: 1rem;
}

.success-host__card dt {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #64748b;
}

.success-host__card dd {
  font-size: 1rem;
  font-weight: 500;
  color: #1e293b;
}

.success-host__status--ok {
  color: #166534;
}

.success-host__status--pending {
  color: #b45309;
}

.success-host__status--warn {
  color: #b91c1c;
}

.success-host__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.success-host__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  font-weight: 600;
  transition: background 0.2s ease, transform 0.2s ease;
}

.success-host__button:hover {
  background: rgba(248, 250, 252, 0.85);
  transform: translateY(-1px);
}

.success-host__button--primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 15px 35px rgba(37, 99, 235, 0.3);
}

.success-host__button--primary:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
}

@media (prefers-reduced-motion: reduce) {
  .success-host__button,
  .success-host__button:hover {
    transform: none;
  }
}
</style>
