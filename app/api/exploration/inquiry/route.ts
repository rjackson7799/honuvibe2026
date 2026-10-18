import { NextRequest, NextResponse } from 'next/server';
import {
  sendExplorationInquiryConfirmation,
  sendExplorationInquiryAdminNotification,
} from '@/lib/email/send';
import type { ExplorationInquiryEmailData } from '@/lib/email/types';
import { inquirySchema } from '@/lib/email/inquiry-validation';

export async function POST(request: NextRequest) {
  try {
    const parsed = inquirySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const data = parsed.data;

    const referer = request.headers.get('referer') ?? '';
    const locale = data.source_locale ?? (referer.includes('/ja/') ? 'ja' : 'en');

    const emailData: ExplorationInquiryEmailData = {
      locale: locale as 'en' | 'ja',
      name: data.name,
      email: data.email,
      company: data.company || null,
      message: data.message,
    };

    await sendExplorationInquiryAdminNotification(emailData);
    await sendExplorationInquiryConfirmation(emailData);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[exploration] inquiry delivery failed:', err);
    return NextResponse.json({ error: 'Could not deliver your inquiry. Please try again later.' }, { status: 503 });
  }
}
