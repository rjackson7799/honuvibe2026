import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') || '/learn/dashboard';

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

      if (isRecovery || redirectTo.includes('/learn/auth/reset')) {
        return NextResponse.redirect(new URL('/learn/auth/reset', origin));
      }

      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Return to auth page on error
  return NextResponse.redirect(new URL('/learn/auth', origin));
}
