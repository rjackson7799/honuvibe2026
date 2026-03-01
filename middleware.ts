import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication
const PROTECTED_PREFIXES = ['/learn/dashboard', '/learn/account', '/admin'];

// Routes that require admin role
const ADMIN_PREFIXES = ['/admin'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

// Strip locale prefix to get the logical path
function getPathWithoutLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length);
    }
    if (pathname === `/${locale}`) {
      return '/';
    }
  }
  return pathname;
}

export default async function middleware(request: NextRequest) {
  // Vertice Society: default to Japanese locale when no locale cookie is set
  const pathname = request.nextUrl.pathname;
  if (
    pathname === '/partners/vertice-society' &&
    !request.cookies.get('NEXT_LOCALE')
  ) {
    return NextResponse.redirect(
      new URL('/ja/partners/vertice-society', request.url),
    );
  }

  // First, run the intl middleware to handle locale detection
  const intlResponse = intlMiddleware(request);

  const logicalPath = getPathWithoutLocale(pathname);

  // Only do auth checks for protected routes
  if (!isProtectedRoute(logicalPath)) {
    return intlResponse;
  }

  // Create Supabase client for session refresh
  let response = intlResponse || NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          // Copy intl headers (e.g., x-next-intl-locale)
          intlResponse.headers.forEach((value, key) => {
            response.headers.set(key, value);
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session — redirect to auth page
  if (!user) {
    const locale = pathname.startsWith('/ja') ? 'ja' : 'en';
    const prefix = locale === 'ja' ? '/ja' : '';
    const redirectUrl = new URL(
      `${prefix}/learn/auth`,
      request.url,
    );
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin route — check role
  if (isAdminRoute(logicalPath)) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const locale = pathname.startsWith('/ja') ? 'ja' : 'en';
      const prefix = locale === 'ja' ? '/ja' : '';
      return NextResponse.redirect(
        new URL(`${prefix}/learn/dashboard`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|studio|.*\\..*).*)',
};
