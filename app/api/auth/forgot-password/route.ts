import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email/send';

export async function POST(request: Request) {
  try {
    const { email, locale = 'en' } = await request.json();

    if (!email) {
      return NextResponse.json({ success: true });
    }

    const { origin } = new URL(request.url);
    const adminClient = createAdminClient();

    // Look up user to get full name for the email greeting
    const { data: profile } = await adminClient
      .from('users')
      .select('full_name')
      .eq('email', email)
      .single();
    const fullName = profile?.full_name ?? null;

    const resetPath = locale === 'ja' ? '/ja/learn/auth/reset' : '/learn/auth/reset';

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${origin}${resetPath}`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      // Always return success to prevent email enumeration
      console.error('[forgot-password] generateLink failed:', linkError?.message);
      return NextResponse.json({ success: true });
    }

    try {
      await sendPasswordResetEmail({
        email,
        fullName,
        resetLink: linkData.properties.action_link,
        locale,
      });
    } catch (err) {
      console.error('[forgot-password] Email send failed:', err);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
