/**
 * Magic-link endpoint for the partner-checkout thanks page.
 *
 * Accepts a Stripe Checkout Session ID (NOT a raw email — that would be a
 * trivial abuse vector). Validates against Stripe that:
 *   - the session exists
 *   - the session is paid (one-time) or has an active/trialing subscription
 *   - the session was created in the last 30 minutes
 *
 * Then sends a magic link to the session's customer email.
 *
 * Rate limit: 5 requests / hour / IP (in-memory; resets on cold start).
 * Multi-instance leak is acceptable because the bar to abuse is already high
 * (caller must possess a real Stripe Checkout Session ID).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';
import { sendMagicLoginEmail } from '@/lib/email/send';

const BodySchema = z.object({
  session_id: z.string().min(10),
});

const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

// Module-level bucket; persists across requests within a single function instance.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX) return false;

  bucket.count += 1;
  return true;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in an hour.' },
      { status: 429 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Retrieve the Checkout Session from Stripe.
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(body.session_id);
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Session age check.
  const createdAtMs = session.created * 1000;
  if (Date.now() - createdAtMs > SESSION_MAX_AGE_MS) {
    return NextResponse.json(
      { error: 'Session expired. Please re-purchase or contact support.' },
      { status: 410 },
    );
  }

  // Payment validation. One-time payments require payment_status === 'paid';
  // subscriptions require the subscription to be active or trialing.
  const isPaid = session.payment_status === 'paid';
  let isActiveSub = false;

  if (session.mode === 'subscription') {
    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription?.id ?? null);
    if (subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        isActiveSub = sub.status === 'active' || sub.status === 'trialing';
      } catch {
        isActiveSub = false;
      }
    }
  }

  if (!isPaid && !isActiveSub) {
    return NextResponse.json(
      { error: 'Session is not paid' },
      { status: 403 },
    );
  }

  // Extract email and generate magic link.
  const email = session.customer_details?.email;
  if (!email) {
    return NextResponse.json(
      { error: 'Session has no customer email' },
      { status: 400 },
    );
  }

  const locale = session.metadata?.locale === 'ja' ? 'ja' : 'en';
  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  const localePrefix = locale === 'ja' ? '/ja' : '';

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(`${localePrefix}/learn/dashboard`)}`,
    },
  });

  if (error || !data.properties?.action_link) {
    console.error('[magic-link] generateLink failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate magic link' },
      { status: 500 },
    );
  }

  // admin.generateLink only mints the link — it does NOT send the email.
  // Send via Resend with the light brand template.
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('email', email)
    .maybeSingle();

  try {
    await sendMagicLoginEmail({
      email,
      fullName: profile?.full_name ?? null,
      loginLink: data.properties.action_link,
      locale,
    });
  } catch (emailError) {
    console.error('[magic-link] sendMagicLoginEmail failed:', emailError);
    return NextResponse.json(
      { error: 'Failed to send magic link email' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
