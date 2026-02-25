import { NextRequest, NextResponse } from 'next/server';
import { sendContactConfirmation, sendContactAdminNotification } from '@/lib/email/send';
import type { ContactEmailData } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.email || !data.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!data.email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const validSubjects = ['general', 'consulting', 'partnership', 'feedback', 'other'];
    const subject = validSubjects.includes(data.subject) ? data.subject : 'general';

    const referer = request.headers.get('referer') ?? '';
    const locale = referer.includes('/ja/') ? 'ja' : 'en';

    const emailData: ContactEmailData = {
      locale: locale as 'en' | 'ja',
      name: data.name,
      email: data.email,
      subject,
      message: data.message,
    };

    // Fire-and-forget: send emails without blocking the response
    void Promise.all([
      sendContactConfirmation(emailData),
      sendContactAdminNotification(emailData),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
