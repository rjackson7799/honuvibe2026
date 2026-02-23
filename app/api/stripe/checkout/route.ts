import { NextResponse } from 'next/server';

// Stripe checkout session creator — skeleton for future integration
// When ready:
// 1. Accept courseId + locale in request body
// 2. Create Stripe Checkout Session with course price (USD or JPY based on locale)
// 3. Return session URL for redirect
// Note: JPY is zero-decimal currency — store yen directly, not cents

export async function POST() {
  // TODO: Implement when Stripe is integrated
  return NextResponse.json(
    { error: 'Stripe checkout not yet configured' },
    { status: 501 },
  );
}
