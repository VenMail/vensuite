import { computed, ref, unref, type MaybeRef } from "vue";
import { createPaymentIntent, cancelPaymentIntent, type CreatePaymentIntentPayload, type PaymentIntentResult } from "@/services/payments";
import { useFormPlayerStore } from "@/store/formPlayer";
import { toast } from "@/composables/useToast";

type PaymentIntentStatus = PaymentIntentResult["status"];

type PaymentClientStatus = "idle" | "loading" | "pending" | "succeeded" | "failed";

interface UsePaymentClientOptions {
  slug: MaybeRef<string>;
}

const mapPaymentIntentStatus = (status: PaymentIntentStatus): PaymentClientStatus => {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "processing":
      return "pending";
    default:
      return "pending";
  }
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  const maybe = error as { data?: { message?: string }; message?: string } | undefined;
  return maybe?.data?.message ?? maybe?.message ?? fallback;
};

export const usePaymentClient = (options: UsePaymentClientOptions) => {
  const formPlayer = useFormPlayerStore();
  const isLoadingIntent = ref(false);
  const isCancellingIntent = ref(false);
  const lastError = ref<string | null>(null);
  const lastResult = ref<PaymentIntentResult | null>(null);

  const slugRef = computed(() => unref(options.slug));

  const clientSecret = computed(() => formPlayer.state.paymentClientSecret);
  const publishableKey = computed(() => formPlayer.state.publishableKey);
  const paymentStatus = computed<PaymentClientStatus>(() => {
    if (isLoadingIntent.value) return "loading";
    if (formPlayer.state.paymentStatus === "succeeded") return "succeeded";
    if (formPlayer.state.paymentStatus === "failed") return "failed";
    if (formPlayer.state.paymentStatus === "pending") return "pending";
    return "idle";
  });

  const applyPaymentIntent = (result: PaymentIntentResult) => {
    lastResult.value = result;
    formPlayer.setPaymentIntent(result.payment_intent_id);
    formPlayer.setPaymentClientSecret(result.client_secret);
    formPlayer.setPublishableKey(result.publishable_key);
    const mappedStatus = mapPaymentIntentStatus(result.status);
    formPlayer.setPaymentState(mappedStatus === "succeeded" ? "succeeded" : "pending");
    lastError.value = null;
  };

  const clearPayment = () => {
    lastResult.value = null;
    formPlayer.setPaymentIntent(null);
    formPlayer.setPaymentClientSecret(null);
    formPlayer.setPublishableKey(null);
    formPlayer.setPaymentState("idle");
  };

  const loadPaymentIntent = async (payload: CreatePaymentIntentPayload) => {
    const slugValue = slugRef.value;
    if (!slugValue) {
      throw new Error("Missing form slug for payment intent creation.");
    }

    try {
      isLoadingIntent.value = true;
      lastError.value = null;
      formPlayer.setPaymentState("pending");
      const result = await createPaymentIntent(slugValue, payload);
      applyPaymentIntent(result);
      return result;
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to initialize payment.");
      lastError.value = message;
      formPlayer.setPaymentState("failed", message);
      toast.error(message);
      throw error;
    } finally {
      isLoadingIntent.value = false;
    }
  };

  const cancelPayment = async () => {
    const intentId = formPlayer.state.paymentIntentId;
    if (!intentId) return;
    const slugValue = slugRef.value;
    if (!slugValue) return;

    try {
      isCancellingIntent.value = true;
      await cancelPaymentIntent(slugValue, intentId);
      clearPayment();
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to cancel payment.");
      lastError.value = message;
      toast.error(message);
      throw error;
    } finally {
      isCancellingIntent.value = false;
    }
  };

  return {
    clientSecret,
    publishableKey,
    paymentStatus,
    isLoadingIntent,
    isCancellingIntent,
    lastError,
    lastResult,
    loadPaymentIntent,
    cancelPayment,
    clearPayment,
    slug: slugRef,
  };
};

export type PaymentClient = ReturnType<typeof usePaymentClient>;
