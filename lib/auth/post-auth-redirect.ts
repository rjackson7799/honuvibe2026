import { isSafeInternalRedirect } from './safe-redirect';

/**
 * Decides where to send a user after a successful auth-code exchange.
 *
 * Order of precedence:
 *   1. A safe, explicit redirect ALWAYS wins — including for brand-new
 *      (non-onboarded) users. This is what lets an invited free-tier account
 *      land on its gated event page instead of the dashboard welcome screen.
 *   2. No explicit redirect + not onboarded → the dashboard welcome screen.
 *   3. No explicit redirect + onboarded → role-based home.
 *
 * The welcome email is a separate side effect in the callback route, still
 * gated on `!onboarded`; this function only resolves the destination path.
 */
export function resolvePostAuthRedirect(params: {
  explicitRedirect: string | null | undefined;
  onboarded: boolean;
  role?: string | null;
}): string {
  const { explicitRedirect, onboarded, role } = params;

  if (isSafeInternalRedirect(explicitRedirect)) {
    return explicitRedirect!;
  }

  if (!onboarded) {
    return '/learn/dashboard?welcome=true';
  }

  switch (role) {
    case 'admin':
      return '/admin';
    case 'partner':
      return '/partner';
    case 'instructor':
      return '/instructor/courses';
    default:
      return '/learn/dashboard';
  }
}
