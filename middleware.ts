import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/learn/dashboard',
  '/learn/account',
  '/admin',
  '/partner',
  '/instructor',
];

// Routes that require admin role
const ADMIN_PREFIXES = ['/admin'];

// Routes that require partner (or admin, for preview) role
const PARTNER_PREFIXES = ['/partner'];

// Routes that require instructor (or admin) role
const INSTRUCTOR_PREFIXES = ['/instructor'];

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

function isPartnerRoute(pathname: string): boolean {
  return PARTNER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

function isInstructorRoute(pathname: string): boolean {
  return INSTRUCTOR_PREFIXES.some(
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
  const pathname = request.nextUrl.pathname;

  // ── HonuVibe Studio subdomain (studio.honuvibe.ai) ──────────────────
  // The Studio storefront lives in its own root-layout tree at
  // app/studio-site/. We serve it from the `studio.` subdomain via an
  // internal rewrite so public URLs stay clean (studio.honuvibe.ai/work),
  // while the files live under /studio-site/work. Studio is EN-only with
  // no auth in Phase 1, so it returns before the intl/auth pipeline.
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const isStudioHost = host.startsWith('studio.');

  if (isStudioHost) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith('/studio-site')) {
      url.pathname = `/studio-site${url.pathname === '/' ? '' : url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // ── Build It AI discovery app (app.honuvibe.ai) ─────────────────────
  // The "Build It AI" discovery tool lives in its own root-layout tree at
  // app/app-site/. Served from the `app.` subdomain via an internal rewrite,
  // mirroring the Studio storefront above. EN-only, no auth (anonymous
  // prospects), so it returns before the intl/auth pipeline.
  const isAppHost = host.startsWith('app.');

  if (isAppHost) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith('/app-site')) {
      url.pathname = `/app-site${url.pathname === '/' ? '' : url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // Guard: the internal /studio-site/* namespace must not be reachable on the
  // primary domain. Redirect any direct hits to the canonical subdomain.
  if (pathname === '/studio-site' || pathname.startsWith('/studio-site/')) {
    if (host.endsWith('honuvibe.ai')) {
      const dest = request.nextUrl.clone();
      dest.host = 'studio.honuvibe.ai';
      dest.port = '';
      dest.pathname = pathname.replace(/^\/studio-site/, '') || '/';
      return NextResponse.redirect(dest);
    }
    // Local/preview: fall through so devs can preview /studio-site directly.
  }

  // Guard: the internal /app-site/* namespace must not be reachable on the
  // primary domain. Redirect any direct hits to the canonical subdomain.
  if (pathname === '/app-site' || pathname.startsWith('/app-site/')) {
    if (host.endsWith('honuvibe.ai')) {
      const dest = request.nextUrl.clone();
      dest.host = 'app.honuvibe.ai';
      dest.port = '';
      dest.pathname = pathname.replace(/^\/app-site/, '') || '/';
      return NextResponse.redirect(dest);
    }
    // Local/preview: fall through so devs can preview /app-site directly.
  }

  // ── Sandbox demos are EN-only, outside the locale tree ────────────────
  // /sandbox/<demo> is excluded from this middleware by the matcher, but
  // /ja/sandbox/<demo> still matches (starts with ja/). Canonicalize it so
  // the fourth URL case is designed, not accidental. clone() keeps the
  // query string; only the pathname changes.
  if (pathname.startsWith('/ja/sandbox/')) {
    const dest = request.nextUrl.clone();
    dest.pathname = pathname.slice('/ja'.length);
    return NextResponse.redirect(dest, 308);
  }

  // Supabase auth: catch code param from email links (password reset, signup confirm, etc.)
  // Supabase PKCE flow redirects to redirectTo URL with ?code=xxx — forward to our auth callback
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const callbackUrl = new URL('/api/auth/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    // Use the current path as redirect destination (e.g., /learn/auth/reset for password reset)
    const logicalPath = getPathWithoutLocale(pathname);
    if (logicalPath !== '/') {
      callbackUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(callbackUrl);
  }

  // Vertice Society: default to Japanese locale when no locale cookie is set
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

  // Role-gated routes — single profile lookup shared across gates
  if (
    isAdminRoute(logicalPath) ||
    isPartnerRoute(logicalPath) ||
    isInstructorRoute(logicalPath)
  ) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const locale = pathname.startsWith('/ja') ? 'ja' : 'en';
    const prefix = locale === 'ja' ? '/ja' : '';

    if (isAdminRoute(logicalPath) && profile?.role !== 'admin') {
      return NextResponse.redirect(
        new URL(`${prefix}/learn/dashboard`, request.url),
      );
    }

    if (
      isPartnerRoute(logicalPath) &&
      profile?.role !== 'partner' &&
      profile?.role !== 'admin'
    ) {
      return NextResponse.redirect(
        new URL(`${prefix}/learn/dashboard`, request.url),
      );
    }

    if (
      isInstructorRoute(logicalPath) &&
      profile?.role !== 'instructor' &&
      profile?.role !== 'admin'
    ) {
      return NextResponse.redirect(
        new URL(`${prefix}/learn/dashboard`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  // `studio(?:$|/)` still excludes the Sanity CMS at /studio and /studio/* while
  // allowing /studio-site/* through so the guard above can run on the main domain.
  // Non-capturing group is required — Next's route-source parser rejects
  // capturing groups in the matcher.
  // `sandbox/` (trailing slash) excludes the demo apps at /sandbox/<slug>/*
  // while the /sandbox LANDING still gets intl handling. This namespace is
  // reserved for demos — no future *marketing* child pages under /sandbox/<x>.
  matcher: '/((?!api|trpc|_next|_vercel|studio(?:$|/)|sandbox/|.*\\..*).*)',
};
