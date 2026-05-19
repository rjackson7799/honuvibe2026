/**
 * Send-login-link endpoint — general-purpose magic-link sender for the
 * /learn/auth login page.
 *
 * Distinct from /api/auth/magic-link which is Stripe-session-gated (only
 * callable from the partner-checkout thanks page). This one is anonymous
 * email-only with rate limiting + enumeration resistance.
 *
 * Always returns 200 with { ok: true } regardless of whether the email
 * exists in auth.users — prevents email enumeration. Supabase auto-sends
 * the magic-link email when the email matches an existing account.
 *
 * Rate limit: 5 requests / hour / IP via module-level token bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendMagicLoginEmail } from '@/lib/email/send';

const BodySchema = z.object({
  email: z.string().email(),
});

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

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
    // Same shape as success to avoid leaking validation details.
    return NextResponse.json({ ok: true });
  }

  const email = body.email.trim().toLowerCase();

  const locale = request.headers.get('x-locale') === 'ja' ? 'ja' : 'en';
  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  const localePrefix = locale === 'ja' ? '/ja' : '';

  try {
    const supabase = getServiceClient();

    // admin.generateLink generates the link but does NOT send the email
    // (despite the API's "send via custom provider" framing). We send via
    // Resend ourselves using sendMagicLoginEmail.
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(`${localePrefix}/learn/dashboard`)}`,
        },
      });

    // Swallow "User not found" and any other generateLink errors to prevent
    // email enumeration — caller sees 200 either way.
    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-login-link] generateLink failed (swallowed):', linkError?.message);
      return NextResponse.json({ ok: true });
    }

    // Look up full_name for the email greeting (best-effort).
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('email', email)
      .maybeSingle();

    try {
      await sendMagicLoginEmail({
        email,
        fullName: profile?.full_name ?? null,
        loginLink: linkData.properties.action_link,
        locale,
      });
    } catch (emailError) {
      console.error('[send-login-link] email send failed (swallowed):', emailError);
    }
  } catch (error) {
    console.error('[send-login-link] unexpected error (swallowed):', error);
  }

  return NextResponse.json({ ok: true });
}
