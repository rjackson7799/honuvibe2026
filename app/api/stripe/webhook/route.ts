import { NextResponse } from 'next/server';

// Stripe webhook handler — skeleton for future integration
// When ready:
// 1. Set STRIPE_WEBHOOK_SECRET env var
// 2. Install stripe package
// 3. Implement checkout.session.completed handler
//    - Create enrollment record
//    - Increment course enrollment count
//    - Send confirmation email

export async function POST() {
  // TODO: Implement when Stripe is integrated
  return NextResponse.json(
    { error: 'Stripe webhook not yet configured' },
    { status: 501 },
  );
}
