/**
 * Signup endpoint — replaces direct supabase.auth.signUp() so the confirmation
 * email is sent through Resend (light brand template) instead of Supabase's
 * hosted dark template.
 *
 * Flow:
 *   1. admin.createUser({ email_confirm: false }) — creates the auth row WITHOUT
 *      triggering Supabase's hosted confirm email.
 *   2. admin.generateLink({ type: 'signup', email, password }) — mints the
 *      confirm action_link.
 *   3. sendConfirmationEmail(...) — Resend send using the light template at
 *      lib/email/templates.ts.
 *
 * If the email already exists, returns { ok: true, alreadyExists: true } so the
 * caller can show the same "check your email" UI (enumeration resistance).
 *
 * Rate limit: 10 requests / hour / IP (in-memory; leaks across instances).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { sendConfirmationEmail } from '@/lib/email/send';

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  locale: z.enum(['en', 'ja']).optional().default('en'),
  redirectTo: z.string().min(1),
});

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

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

  const email = body.email.trim().toLowerCase();
  const { password, fullName, locale, redirectTo } = body;

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  const adminClient = createAdminClient();

  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });

  // Treat "already registered" as success to prevent enumeration. The caller
  // shows the same "check your email" UI regardless.
  if (createError) {
    const msg = createError.message.toLowerCase();
    const alreadyExists =
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('user already exists') ||
      msg.includes('email address has already been');

    if (alreadyExists) {
      return NextResponse.json({ ok: true, alreadyExists: true, needsConfirmation: true });
    }

    console.error('[signup] createUser failed:', createError.message);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  if (!createData?.user) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[signup] generateLink failed:', linkError?.message);
    // The user row exists; surface failure so caller can offer "Resend".
    return NextResponse.json(
      { error: 'Account created but confirmation link failed. Try resending.' },
      { status: 500 },
    );
  }

  try {
    await sendConfirmationEmail({
      email,
      fullName,
      confirmLink: linkData.properties.action_link,
      locale,
    });
  } catch (err) {
    console.error('[signup] sendConfirmationEmail failed:', err);
    // Don't fail the request — user can request a resend.
  }

  return NextResponse.json({ ok: true, needsConfirmation: true });
}
