import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { PathIntakeFlow } from './PathIntakeFlow';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'study_paths' });

  return {
    title: t('create_title'),
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

  // Fetch user profile for subscription tier
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const t = await getTranslations({ locale, namespace: 'study_paths' });

  return (
    <div className="mx-auto max-w-xl space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl md:text-3xl text-fg-primary">
          {t('create_title')}
        </h1>
        <p className="text-fg-secondary text-sm max-w-md mx-auto">
          {t('create_subtitle')}
        </p>
      </div>

      <PathIntakeFlow
        tags={tags ?? []}
        userTier={(profile?.subscription_tier as 'free' | 'premium') ?? 'free'}
      />
    </div>
  );
}
