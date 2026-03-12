'use client';

import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type EmbeddedCheckoutFormProps = {
  courseId: string;
  locale: string;
};

export function EmbeddedCheckoutForm({
  courseId,
  locale,
}: EmbeddedCheckoutFormProps) {
  const fetchClientSecret = useCallback(async () => {
    const response = await fetch('/api/stripe/checkout-embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, locale }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to create checkout session');
    }

    const data = (await response.json()) as { clientSecret: string };
    return data.clientSecret;
  }, [courseId, locale]);

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
