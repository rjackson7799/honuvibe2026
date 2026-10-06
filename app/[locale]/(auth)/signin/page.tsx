import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectIfSignedIn } from '@/components/auth/redirect-if-signed-in';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('meta_signin_title') };
}

/** Sign-in mode of the split layout in ../layout.tsx (which renders the form). */
export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await redirectIfSignedIn(locale, (await searchParams).redirect);
  return null;
}
