import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { HonuMark } from '@/components/ocean/honu-mark';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('reset_password'),
  };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <HonuMark size={48} />
          <h1 className="mt-4 text-2xl font-serif text-fg-primary">
            HonuVibe.AI
          </h1>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
