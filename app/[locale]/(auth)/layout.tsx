import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Shared shell for /signin and /signup. Living in a layout (not the pages)
 * keeps the form mounted while the Sign in / Sign up tabs switch routes.
 * Quotes: the site's existing testimonials until real proof artifacts are
 * tagged for the sign-in surface (redesign decision 11 / unit B5).
 */
export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'social_proof.testimonials' });
  const quotes = (['two', 'one', 'three'] as const).map((k) => ({
    text: t(`${k}.quote`),
    name: t(`${k}.name`),
    org: t(`${k}.role`),
  }));

  return <AuthSplitLayout quotes={quotes}>{children}</AuthSplitLayout>;
}
