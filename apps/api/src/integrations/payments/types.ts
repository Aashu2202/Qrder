export interface CreateOrderInput {
  /** Amount in paise (minor units). */
  amount: number;
  currency: string;
  /** Our internal order id — passed back via webhook so we can reconcile. */
  receipt: string;
  /** Extra metadata Razorpay echoes back in webhooks. */
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  /** Gateway's order id (e.g. Razorpay's `order_xxx`). */
  gatewayOrderId: string;
  /** Hint for the client SDK (Razorpay needs `keyId`). */
  publicKey?: string;
}

export interface VerifySignatureInput {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface WebhookEvent {
  /** Normalized event name: `payment.captured` | `payment.failed` | `refund.processed` | … */
  type: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  amount: number;
  status: 'paid' | 'failed' | 'refunded' | 'pending';
  raw: unknown;
}

export interface PaymentGateway {
  readonly name: string;
  /** True if real credentials are configured. */
  readonly enabled: boolean;
  /** Cash-only flow still needs a no-op driver for code uniformity. */
  readonly supportsOnline: boolean;

  /** Create a payment session/intent. Returns the gateway order id + key. */
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;

  /** Verify the success signature returned by the client SDK after checkout. */
  verifyCheckoutSignature(input: VerifySignatureInput): boolean;

  /** Verify the HMAC signature on a webhook body (raw bytes). */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  /** Map a raw webhook payload to our normalized event. */
  parseWebhookEvent(rawBody: string): WebhookEvent | null;

  /** Issue a refund. Amount in paise. Pass 0 or omit for full refund. */
  refund(gatewayPaymentId: string, amount?: number): Promise<{ refundId: string; status: string }>;
}
