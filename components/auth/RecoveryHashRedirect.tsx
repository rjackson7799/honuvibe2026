'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  locale: string;
};

// Safety net for the password-recovery flow. Supabase's /auth/v1/verify
// redirects to the project's Site URL when the requested redirect_to is not
// in the Redirect URLs allowlist. Site URL is the marketing home page, which
// has no hash handler — the recovery tokens sit in the URL and the user is
// stranded. If a recovery hash ever lands here, forward it to the reset page.
export function RecoveryHashRedirect({ locale }: Props) {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (params.get('type') !== 'recovery') return;
    if (!params.get('access_token')) return;

    const prefix = locale === 'ja' ? '/ja' : '';
    router.replace(`${prefix}/learn/auth/reset${window.location.hash}`);
  }, [locale, router]);

  return null;
}
