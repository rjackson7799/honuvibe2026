/**
 * Resend the signup-confirmation email through Resend (light template).
 *
 * The user row already exists (created by /api/auth/signup). We mint a fresh
 * signup action_link via admin.generateLink and send via Resend.
 *
 * Always returns 200 to prevent email enumeration.
 *
 * Rate limit: 10 requests / hour / IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { sendConfirmationEmail } from '@/lib/email/send';

const BodySchema = z.object({
  email: z.string().email(),
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
    return NextResponse.json({ ok: true });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: true });
  }

  const email = body.email.trim().toLowerCase();
  const { locale, redirectTo } = body;

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  try {
    const adminClient = createAdminClient();

    // Look up full_name for greeting; best-effort.
    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('email', email)
      .maybeSingle();

    // Use 'magiclink' on resend: it confirms the email on click (same effect
    // as the signup link for an unconfirmed user) and does not require us to
    // know the original password. Avoids the "password required for signup
    // link" SDK constraint flagged in PROGRESS.md.
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[resend-confirmation] generateLink failed (swallowed):', linkError?.message);
      return NextResponse.json({ ok: true });
    }

    try {
      await sendConfirmationEmail({
        email,
        fullName: profile?.full_name ?? null,
        confirmLink: linkData.properties.action_link,
        locale,
      });
    } catch (err) {
      console.error('[resend-confirmation] send failed (swallowed):', err);
    }
  } catch (err) {
    console.error('[resend-confirmation] unexpected (swallowed):', err);
  }

  return NextResponse.json({ ok: true });
}
