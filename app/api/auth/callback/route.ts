import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendStudentOnboardingEmail } from '@/lib/email/send';
import { resolvePostAuthRedirect } from '@/lib/auth/post-auth-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const explicitRedirect = searchParams.get('redirect');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Cannot set cookies in some contexts
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is a password recovery session
      const isRecovery = data.session?.user?.recovery_sent_at &&
        Date.now() - new Date(data.session.user.recovery_sent_at).getTime() < 600000; // within 10 min

      if (isRecovery || explicitRedirect?.includes('/learn/auth/reset')) {
        return NextResponse.redirect(new URL('/learn/auth/reset', origin));
      }

      // New student (onboarded = false) + role drive the default destination.
      const { data: profile } = await supabase
        .from('users')
        .select('onboarded, full_name, email, locale_preference, role')
        .eq('id', data.session.user.id)
        .single();

      if (profile && !profile.onboarded) {
        // Fire-and-forget welcome email (independent of where we land them).
        sendStudentOnboardingEmail({
          locale: (profile.locale_preference as 'en' | 'ja') ?? 'en',
          fullName: profile.full_name ?? '',
          email: profile.email ?? data.session.user.email ?? '',
          dashboardUrl: `${origin}/learn/dashboard`,
        });
      }

      // A safe explicit ?redirect wins even for non-onboarded users, so an
      // invited free-tier account lands on its gated event page.
      const redirectTo = resolvePostAuthRedirect({
        explicitRedirect,
        onboarded: profile?.onboarded ?? true,
        role: profile?.role ?? null,
      });

      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Return to auth page on error
  return NextResponse.redirect(new URL('/learn/auth', origin));
}
