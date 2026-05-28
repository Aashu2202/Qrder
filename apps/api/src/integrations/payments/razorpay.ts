import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  PaymentGateway,
  CreateOrderInput,
  CreateOrderResult,
  VerifySignatureInput,
  WebhookEvent,
} from './types';
import { logger } from '../../lib/logger';

const API_BASE = 'https://api.razorpay.com/v1';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
}

interface RazorpayRefundResponse {
  id: string;
  status: string;
  amount: number;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export class RazorpayGateway implements PaymentGateway {
  readonly name = 'razorpay';
  readonly enabled = true;
  readonly supportsOnline = true;

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string,
  ) {}

  private get authHeader() {
    return 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        authorization: this.authHeader,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
        payment_capture: 1,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, 'razorpay createOrder failed');
      throw new Error(`Razorpay createOrder failed (${res.status})`);
    }
    const data = (await res.json()) as RazorpayOrderResponse;
    return { gatewayOrderId: data.id, publicKey: this.keyId };
  }

  verifyCheckoutSignature(input: VerifySignatureInput): boolean {
    const expected = createHmac('sha256', this.keySecret)
      .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
      .digest('hex');
    return safeEq(expected, input.signature);
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return safeEq(expected, signatureHeader);
  }

  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return null;
    }

    if (payload.event === 'payment.captured' && payload.payload.payment) {
      const p = payload.payload.payment.entity;
      return {
        type: 'payment.captured',
        gatewayPaymentId: p.id,
        gatewayOrderId: p.order_id,
        amount: p.amount,
        status: 'paid',
        raw: payload,
      };
    }
    if (payload.event === 'payment.failed' && payload.payload.payment) {
      const p = payload.payload.payment.entity;
      return {
        type: 'payment.failed',
        gatewayPaymentId: p.id,
        gatewayOrderId: p.order_id,
        amount: p.amount,
        status: 'failed',
        raw: payload,
      };
    }
    if (payload.event === 'refund.processed' && payload.payload.refund) {
      const r = payload.payload.refund.entity;
      return {
        type: 'refund.processed',
        gatewayPaymentId: r.payment_id,
        gatewayOrderId: '',
        amount: r.amount,
        status: 'refunded',
        raw: payload,
      };
    }
    return null;
  }

  async refund(gatewayPaymentId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    const res = await fetch(`${API_BASE}/payments/${gatewayPaymentId}/refund`, {
      method: 'POST',
      headers: {
        authorization: this.authHeader,
        'content-type': 'application/json',
      },
      body: JSON.stringify(amount && amount > 0 ? { amount } : {}),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, 'razorpay refund failed');
      throw new Error(`Razorpay refund failed (${res.status})`);
    }
    const data = (await res.json()) as RazorpayRefundResponse;
    return { refundId: data.id, status: data.status };
  }
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
