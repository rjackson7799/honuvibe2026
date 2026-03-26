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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If redirect points to the reset page, honor it
      if (redirectTo.includes('/learn/auth/reset')) {
        return NextResponse.redirect(new URL(redirectTo, origin));
      }
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Handle password recovery flow — Supabase may redirect here with type=recovery
  const type = searchParams.get('type');
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/learn/auth/reset', origin));
  }

  // Return to auth page on error
  return NextResponse.redirect(new URL('/learn/auth', origin));
}
