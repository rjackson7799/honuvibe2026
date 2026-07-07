import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Route } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPremiumAccess } from '@/lib/paths/access';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';
import { PathIntakeFlow } from './PathIntakeFlow';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'study_paths' });

  return {
    title: t('page_title'),
  };
}

export default async function NewStudyPathPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(
      `${prefix}/learn/auth?redirect=${encodeURIComponent(`${prefix}/learn/paths/new`)}`,
    );
  }

  // Fetch topic tags for focus area chips
  const adminClient = createAdminClient();
  const { data: tags } = await adminClient
    .from('tags')
    .select('slug, name_en, name_jp')
    .eq('category', 'topic')
    .order('name_en');

  // Fetch user profile for subscription tier (same premium check as the API routes)
  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_tier, subscription_status, subscription_expires_at')
    .eq('id', user.id)
    .single();

  const userTier: 'free' | 'vault' =
    profile &&
    hasPremiumAccess({
      role: profile.role ?? 'student',
      subscription_tier: profile.subscription_tier,
      subscription_status: profile.subscription_status,
      subscription_expires_at: profile.subscription_expires_at,
    })
      ? 'vault'
      : 'free';

  const t = await getTranslations({ locale, namespace: 'study_paths' });

  return (
    <div className="space-y-8 max-w-[800px]">
      <DashboardPageHeader
        icon={Route}
        title={t('page_title')}
        subtitle={t('create_subtitle')}
      />

      <div className="max-w-xl">
        <PathIntakeFlow tags={tags ?? []} userTier={userTier} />
      </div>
    </div>
  );
}
