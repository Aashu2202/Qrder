'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '@/lib/api';

interface InitiateResponse {
  paymentId: string;
  gateway: 'razorpay';
  gatewayOrderId: string;
  publicKey: string;
  amount: number;
  currency: string;
}

// Razorpay attaches itself to window — declare it loosely.
interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (resp: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}
interface RazorpayConstructor {
  new (opts: RazorpayCheckoutOptions): { open(): void };
}
declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

interface Props {
  token: string;
  orderId: string;
  tenantName: string;
}

export function PayNowButton({ token, orderId, tenantName }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();

  const pay = async () => {
    setBusy(true);
    setErr(null);
    try {
      const init = await apiFetch<InitiateResponse>(
        `/q/${token}/orders/${orderId}/payment/initiate`,
        { method: 'POST', json: {} },
      );

      if (!window.Razorpay) {
        setErr('Payment SDK not loaded — please reload and try again.');
        setBusy(false);
        return;
      }

      const checkout = new window.Razorpay({
        key: init.publicKey,
        order_id: init.gatewayOrderId,
        amount: init.amount,
        currency: init.currency,
        name: tenantName,
        description: `Order payment`,
        handler: async (resp) => {
          try {
            await apiFetch(`/q/${token}/orders/${orderId}/payment/verify`, {
              method: 'POST',
              json: {
                paymentId: init.paymentId,
                gatewayOrderId: resp.razorpay_order_id,
                gatewayPaymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              },
            });
            qc.invalidateQueries({ queryKey: ['order', token, orderId] });
          } catch (e) {
            const ae = e as ApiError;
            setErr(ae.detail ?? 'Verification failed — your bank may still process the payment.');
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: '#ea580c' },
      });
      checkout.open();
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.detail ?? 'Could not start payment.');
      setBusy(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <button
        onClick={pay}
        disabled={busy}
        className="w-full rounded-full bg-brand-600 px-5 py-3 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? 'Opening payment…' : '💳 Pay now'}
      </button>
      {err && <p className="text-xs text-red-600 mt-2 text-center">{err}</p>}
    </>
  );
}
