import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Beehiiv integration placeholder
    // When BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID are set,
    // this will submit to the Beehiiv API
    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (apiKey && publicationId) {
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
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        return NextResponse.json(
          { error: errorData.message || 'Subscription failed' },
          { status: res.status },
        );
      }
    }

    // Admin notification (fire-and-forget)
    const referer = request.headers.get('referer') ?? '';
    const locale = referer.includes('/ja/') ? 'ja' : 'en';
    const { sendNewsletterAdminNotification } = await import('@/lib/email/send');
    void sendNewsletterAdminNotification({ email, locale: locale as 'en' | 'ja' });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
