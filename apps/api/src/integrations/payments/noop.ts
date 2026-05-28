import type {
  PaymentGateway,
  CreateOrderInput,
  CreateOrderResult,
  VerifySignatureInput,
  WebhookEvent,
} from './types';

/**
 * Used when no online-payment credentials are configured.
 * Cash flows still work (cashier records payment via POST /v1/payments).
 * Online flows are gated off in the UI when `supportsOnline === false`.
 */
export class NoOpPaymentGateway implements PaymentGateway {
  readonly name = 'noop';
  readonly enabled = false;
  readonly supportsOnline = false;

  async createOrder(_input: CreateOrderInput): Promise<CreateOrderResult> {
    throw new Error(
      'Online payments not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to enable.',
    );
  }

  verifyCheckoutSignature(_input: VerifySignatureInput): boolean {
    return false;
  }

  verifyWebhookSignature(_rawBody: string, _signatureHeader: string): boolean {
    return false;
  }

  parseWebhookEvent(_rawBody: string): WebhookEvent | null {
    return null;
  }

  async refund(): Promise<{ refundId: string; status: string }> {
    throw new Error('Refund unavailable: online payments not configured');
  }
}
