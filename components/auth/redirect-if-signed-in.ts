import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';

/**
 * /signin and /signup: an already signed-in visitor goes straight to the safe
 * ?redirect target, or their dashboard. (Magic-link landings carry their
 * tokens in the #hash, which the server never sees; AuthForm handles those.)
 */
export async function redirectIfSignedIn(locale: string, redirectParam: string | undefined) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(sanitizeRedirect(redirectParam, `${prefix}/learn/dashboard`));
  }
}
