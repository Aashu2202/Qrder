import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { PaymentGateway } from './types';
import { NoOpPaymentGateway } from './noop';
import { RazorpayGateway } from './razorpay';

export type {
  PaymentGateway,
  CreateOrderInput,
  CreateOrderResult,
  VerifySignatureInput,
  WebhookEvent,
} from './types';

function pickGateway(): PaymentGateway {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET) {
    logger.info('Payment gateway: Razorpay');
    return new RazorpayGateway(
      env.RAZORPAY_KEY_ID,
      env.RAZORPAY_KEY_SECRET,
      env.RAZORPAY_WEBHOOK_SECRET,
    );
  }
  logger.warn(
    'Payment gateway: NoOp (cash-only). Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET to enable online payments.',
  );
  return new NoOpPaymentGateway();
}

export const paymentGateway: PaymentGateway = pickGateway();
