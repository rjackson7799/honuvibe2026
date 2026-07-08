import { getAdminEmail } from './client';

/**
 * The admin notification recipient set, deduped. Centralizes the addresses
 * previously hardcoded in lib/survey/profile.ts and the survey submit route.
 */
export function getAdminRecipients(): string[] {
  return [
    ...new Set(
      [getAdminEmail(), 'sperrygroup@gmail.com', 'ryan.jackson.2009@gmail.com'].filter(Boolean),
    ),
  ];
}
