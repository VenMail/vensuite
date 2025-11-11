import { apiClient, withRequestOptions, type RequestOptions } from "./apiClient";

export interface CreatePaymentIntentPayload {
  response_id: string;
  amount_cents: number;
  currency: string;
  metadata?: Record<string, unknown>;
  customer_email?: string;
  captcha_token?: string;
}

export interface PaymentIntentResult {
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
  status: "requires_payment_method" | "requires_confirmation" | "succeeded" | "processing" | "requires_action";
  mode: "custom" | "platform";
}

export const createPaymentIntent = async (
  slug: string,
  payload: CreatePaymentIntentPayload,
  options?: RequestOptions,
): Promise<PaymentIntentResult> => {
  const response = await apiClient.post(
    `/forms/${slug}/payments/intent`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data as PaymentIntentResult;
};

export const cancelPaymentIntent = async (
  slug: string,
  paymentIntentId: string,
  options?: RequestOptions,
): Promise<void> => {
  await apiClient.post(
    `/forms/${slug}/payments/${paymentIntentId}/cancel`,
    {},
    withRequestOptions(options),
  );
};
