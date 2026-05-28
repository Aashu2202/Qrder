import { and, eq } from 'drizzle-orm';
import { payments, orders, tenants } from '@qrder/db';
import { OrderStatus, PaymentStatus, type ManualPaymentInput, type RefundInput } from '@qrder/shared';
import { db } from '../../lib/db';
import { paymentGateway } from '../../integrations/payments';
import { badRequest, notFound, conflict } from '../../lib/errors';
import { emit } from '../../realtime/emit';
import { updateOrderStatus } from '../orders/orders.service';

interface InitiateContext {
  tenantId: string;
  orderId: string;
}

/** Customer-initiated: create gateway order + payment record */
export async function initiateOnlinePayment(ctx: InitiateContext) {
  if (!paymentGateway.supportsOnline) {
    throw conflict('Online payments not configured for this tenant');
  }
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, ctx.orderId), eq(orders.tenantId, ctx.tenantId)),
  });
  if (!order) throw notFound('Order not found');
  if (
    order.status === OrderStatus.COMPLETED ||
    order.status === OrderStatus.CANCELED ||
    order.status === OrderStatus.REJECTED
  ) {
    throw conflict('Order is closed');
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, ctx.tenantId) });
  if (!tenant) throw notFound('Tenant missing');

  const gw = await paymentGateway.createOrder({
    amount: order.totalAmount,
    currency: tenant.currency || 'INR',
    receipt: order.orderNumber,
    notes: { orderId: order.id, tenantId: order.tenantId },
  });

  const [row] = await db
    .insert(payments)
    .values({
      tenantId: ctx.tenantId,
      orderId: order.id,
      amount: order.totalAmount,
      method: 'upi',
      status: PaymentStatus.PENDING,
      gateway: paymentGateway.name,
      gatewayPaymentId: gw.gatewayOrderId,
      gatewayMeta: { phase: 'initiated' },
    })
    .returning();

  if (!row) throw new Error('Failed to create payment row');

  return {
    paymentId: row.id,
    gateway: paymentGateway.name,
    gatewayOrderId: gw.gatewayOrderId,
    publicKey: gw.publicKey,
    amount: order.totalAmount,
    currency: tenant.currency || 'INR',
  };
}

/** Customer client posts the success signature here — confirms before webhook */
export async function verifyPaymentSignature(
  tenantId: string,
  input: {
    paymentId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    signature: string;
  },
) {
  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, input.paymentId), eq(payments.tenantId, tenantId)),
  });
  if (!payment) throw notFound('Payment not found');

  const ok = paymentGateway.verifyCheckoutSignature({
    gatewayOrderId: input.gatewayOrderId,
    gatewayPaymentId: input.gatewayPaymentId,
    signature: input.signature,
  });
  if (!ok) throw badRequest('Invalid payment signature');

  await markPaymentPaid(payment.id, input.gatewayPaymentId);
  return { paymentId: payment.id };
}

async function markPaymentPaid(paymentId: string, gatewayPaymentId: string) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment) return;
  if (payment.status === PaymentStatus.PAID) return; // idempotent

  await db
    .update(payments)
    .set({
      status: PaymentStatus.PAID,
      gatewayPaymentId,
      paidAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  // Move the order to completed when total is fully covered.
  const allPaid = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, payment.orderId), eq(payments.status, PaymentStatus.PAID)));
  const sum = allPaid.reduce((s, p) => s + p.amount, 0);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, payment.orderId) });
  if (order && sum >= order.totalAmount && order.status !== OrderStatus.COMPLETED) {
    await updateOrderStatus(payment.tenantId, payment.orderId, OrderStatus.COMPLETED);
  }
}

export async function recordManualPayment(tenantId: string, input: ManualPaymentInput) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, input.orderId), eq(orders.tenantId, tenantId)),
  });
  if (!order) throw notFound('Order not found');

  const [row] = await db
    .insert(payments)
    .values({
      tenantId,
      orderId: input.orderId,
      amount: input.amount,
      method: input.method,
      status: PaymentStatus.PAID,
      gateway: null,
      gatewayPaymentId: null,
      paidAt: new Date(),
      gatewayMeta: input.note ? { note: input.note } : null,
    })
    .returning();
  if (!row) throw new Error('Failed to record payment');

  // Promote to completed if covered
  const allPaid = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, input.orderId), eq(payments.status, PaymentStatus.PAID)));
  const sum = allPaid.reduce((s, p) => s + p.amount, 0);
  if (sum >= order.totalAmount && order.status !== OrderStatus.COMPLETED) {
    await updateOrderStatus(tenantId, input.orderId, OrderStatus.COMPLETED);
  }

  return row;
}

export async function refundPayment(tenantId: string, paymentId: string, input: RefundInput) {
  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)),
  });
  if (!payment) throw notFound('Payment not found');
  if (payment.status !== PaymentStatus.PAID) throw conflict('Only paid payments can be refunded');

  if (payment.gateway === 'razorpay' && payment.gatewayPaymentId) {
    const r = await paymentGateway.refund(payment.gatewayPaymentId, input.amount);
    await db
      .update(payments)
      .set({
        status: PaymentStatus.REFUNDED,
        gatewayMeta: { ...(payment.gatewayMeta ?? {}), refundId: r.refundId },
      })
      .where(eq(payments.id, paymentId));
  } else {
    // Cash refund — purely a ledger entry
    await db
      .update(payments)
      .set({ status: PaymentStatus.REFUNDED })
      .where(eq(payments.id, paymentId));
  }

  return { ok: true };
}

/** Webhook handler — must be wired with a raw-body middleware so HMAC matches. */
export async function handleWebhook(rawBody: string, signature: string) {
  if (!paymentGateway.verifyWebhookSignature(rawBody, signature)) {
    throw badRequest('Invalid webhook signature');
  }
  const event = paymentGateway.parseWebhookEvent(rawBody);
  if (!event) return { ignored: true };

  if (event.type === 'payment.captured') {
    // Find the payment by gateway order id (we stored it as gatewayPaymentId at initiate-time)
    const payment = await db.query.payments.findFirst({
      where: eq(payments.gatewayPaymentId, event.gatewayOrderId),
    });
    if (payment) await markPaymentPaid(payment.id, event.gatewayPaymentId);
  }
  return { ok: true };
}

export async function listPaymentsForOrder(tenantId: string, orderId: string) {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.orderId, orderId)));
}
