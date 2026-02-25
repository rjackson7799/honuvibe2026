import { NextRequest, NextResponse } from 'next/server';
import {
  sendExplorationInquiryConfirmation,
  sendExplorationInquiryAdminNotification,
} from '@/lib/email/send';
import type { ExplorationInquiryEmailData } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.email || !data.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!data.email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const referer = request.headers.get('referer') ?? '';
    const locale = referer.includes('/ja/') ? 'ja' : 'en';

    const emailData: ExplorationInquiryEmailData = {
      locale: locale as 'en' | 'ja',
      name: data.name,
      email: data.email,
      company: data.company || null,
      message: data.message,
    };

    // Fire-and-forget: send emails without blocking the response
    void Promise.all([
      sendExplorationInquiryConfirmation(emailData),
      sendExplorationInquiryAdminNotification(emailData),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
