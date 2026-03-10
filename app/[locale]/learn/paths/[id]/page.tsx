import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPathWithItems, updatePathLastAccessed } from '@/lib/paths/queries';
import { hasPremiumAccess } from '@/lib/paths/access';
import { StudyPathView } from '@/components/learn/StudyPathView';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  const path = await getPathWithItems(id);
  const t = await getTranslations({ locale, namespace: 'study_paths' });

  return {
    title: path?.title_en ?? t('untitled_path'),
  };
}

export default async function StudyPathPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefix = locale === 'ja' ? '/ja' : '';

  if (!user) {
    redirect(`${prefix}/learn/auth`);
  }

  const path = await getPathWithItems(id);

  if (!path) {
    redirect(`${prefix}/learn/dashboard`);
  }

  // Ownership check
  if (path.user_id !== user.id) {
    redirect(`${prefix}/learn/dashboard`);
  }

  // Update last accessed (non-blocking)
  updatePathLastAccessed(id).catch(console.error);

  // Check premium access
  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_tier, subscription_status, subscription_expires_at')
    .eq('id', user.id)
    .single();

  const premium = profile
    ? hasPremiumAccess({
        role: profile.role ?? 'student',
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
      })
    : false;

  return <StudyPathView path={path} hasPremium={premium} />;
}
