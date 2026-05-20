import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthForm } from '@/components/auth/AuthForm';
import { HonuMark } from '@/components/ocean/honu-mark';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('sign_in'),
  };
}

export default async function AuthPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // If already logged in, redirect to dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div
      data-shell="marketing"
      className="learn-zone min-h-screen flex items-center justify-center px-5 py-16"
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <HonuMark size={48} />
          <h1
            className="mt-4 text-2xl font-serif"
            style={{ color: 'var(--m-ink-primary, #1A2B33)' }}
          >
            HonuVibe.AI
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--m-ink-secondary, #5A6B73)' }}
          >
            {t('welcome_message')}
          </p>
        </div>

        <AuthForm />
      </div>
    </div>
  );
}
