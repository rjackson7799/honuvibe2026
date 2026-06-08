/**
 * Free-lesson email capture — top-of-funnel lead into the existing Beehiiv list,
 * tagged via utm_source so free-lesson leads are segmentable. Reuses the
 * newsletter/Beehiiv double-opt-in flow (no new table, no auth user, no magic
 * link from raw form input). Adds the abuse controls the newsletter route lacks:
 * per-IP rate limit, honeypot, email normalization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';

const schema = z.object({
  email: z.string().email(),
  // Honeypot — must stay empty.
  company_url: z.string().optional(),
});

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!tryConsume(`free-lesson:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in an hour.' },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Honeypot tripped → pretend success, do nothing.
  if (parsed.data.company_url && parsed.data.company_url.trim() !== '') {
    return NextResponse.json({ success: true });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (apiKey && publicationId) {
    try {
      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            reactivate_existing: true,
            send_welcome_email: true,
            // Segments free-lesson leads for a tailored nurture sequence.
            utm_source: 'free-lesson',
            utm_medium: 'website',
            utm_campaign: 'free-lesson',
          }),
        },
      );
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { message?: string } | null;
        return NextResponse.json(
          { error: errorData?.message ?? 'Subscription failed' },
          { status: res.status },
        );
      }
    } catch (err) {
      console.error('[free-lesson] Beehiiv subscribe failed:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Admin notification (fire-and-forget), matches the newsletter route.
  const referer = request.headers.get('referer') ?? '';
  const locale = referer.includes('/ja/') ? 'ja' : 'en';
  const { sendNewsletterAdminNotification } = await import('@/lib/email/send');
  void sendNewsletterAdminNotification({ email, locale: locale as 'en' | 'ja' });

  return NextResponse.json({ success: true });
}
