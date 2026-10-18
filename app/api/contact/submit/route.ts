import { NextRequest, NextResponse } from 'next/server';
import { sendContactConfirmation, sendContactAdminNotification } from '@/lib/email/send';
import type { ContactEmailData } from '@/lib/email/types';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(2000),
  subject: z.enum(['general', 'course', 'partnership', 'media', 'other']).catch('general'),
  source_locale: z.enum(['en', 'ja']).optional(),
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  try {
    const data = parsed.data;

    const referer = request.headers.get('referer') ?? '';
    const locale = data.source_locale ?? (referer.includes('/ja/') ? 'ja' : 'en');

    const emailData: ContactEmailData = {
      locale: locale as 'en' | 'ja',
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    };

    // Contact messages have no database copy. Do not acknowledge receipt until
    // the provider accepts the admin notification, or let serverless teardown
    // abandon it. Confirmation remains best-effort after successful delivery.
    await sendContactAdminNotification(emailData);
    await sendContactConfirmation(emailData);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] admin notification failed:', err);
    return NextResponse.json({ error: 'Message delivery unavailable' }, { status: 503 });
  }
}
