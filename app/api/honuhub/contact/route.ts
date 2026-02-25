import { NextRequest, NextResponse } from 'next/server';
import {
  sendHonuHubContactConfirmation,
  sendHonuHubContactAdminNotification,
} from '@/lib/email/send';
import type { HonuHubContactEmailData } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.email || !data.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!data.email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const validTypes = ['group', 'corporate', 'partnership', 'other'];
    const type = validTypes.includes(data.type) ? data.type : 'other';

    const referer = request.headers.get('referer') ?? '';
    const locale = referer.includes('/ja/') ? 'ja' : 'en';

    const emailData: HonuHubContactEmailData = {
      locale: locale as 'en' | 'ja',
      name: data.name,
      email: data.email,
      type,
      message: data.message,
    };

    void Promise.all([
      sendHonuHubContactConfirmation(emailData),
      sendHonuHubContactAdminNotification(emailData),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
