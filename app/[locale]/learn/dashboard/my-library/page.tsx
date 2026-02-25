import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserLibraryData } from '@/lib/library/queries';
import { resolveVideoCardProps } from '@/lib/library/types';
import { SectionHeading } from '@/components/ui/section-heading';
import { MyLibrarySection } from '@/components/library/MyLibrarySection';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MyLibraryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  const t = await getTranslations({ locale, namespace: 'library' });
  const dt = await getTranslations({ locale, namespace: 'dashboard' });

  const { continueWatching, favorites, recentlyWatched } =
    await getUserLibraryData(user.id);

  // Resolve to locale-aware card props
  const resolveAll = (videos: typeof continueWatching) =>
    videos.map((v) => resolveVideoCardProps(v, locale, true));

  return (
    <div className="space-y-8">
      <SectionHeading
        overline={t('overline')}
        heading={dt('nav_my_library')}
        sub={t('subtitle')}
      />

      <MyLibrarySection
        continueWatching={resolveAll(continueWatching)}
        favorites={resolveAll(favorites)}
        recentlyWatched={resolveAll(recentlyWatched)}
        locale={locale}
        translations={{
          continueWatching: t('continue_watching'),
          favorites: t('my_favorites'),
          recentlyWatched: t('my_recent'),
          emptyState: t('my_library_empty'),
          exploreCta: t('title'),
        }}
      />
    </div>
  );
}
