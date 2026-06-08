import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { listFeed } from '@/lib/community/queries';
import { CATEGORIES, type Category } from '@/lib/community/constants';
import { CommunityPaywall } from '@/components/community/CommunityPaywall';
import { LineJoinCard } from '@/components/community/LineJoinCard';
import { CourseChannelsStrip } from '@/components/community/CourseChannelsStrip';
import { CategoryChips } from '@/components/community/CategoryChips';
import { PostCard } from '@/components/community/PostCard';
import { EmptyFeed } from '@/components/community/EmptyFeed';
import { BannedBanner } from '@/components/community/BannedBanner';
import { PostComposer } from '@/components/community/PostComposer';
import { Users } from 'lucide-react';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; cursor?: string }>;
};

export default async function CommunityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { category: categoryParam, cursor } = await searchParams;

  const supabase = await createClient();
  const scope = await getCommunityScope(supabase);

  if (!scope) {
    return <CommunityPaywall />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // user is guaranteed non-null here because getCommunityScope returns null otherwise.
  const userId = user!.id;

  // Check ban status for this scope (shows banner, doesn't block reads).
  const { data: banRow } = await supabase
    .from('community_bans')
    .select('user_id')
    .eq('user_id', userId)
    .is('partner_id', scope.partnerId)
    .maybeSingle();
  const isBanned = !!banRow;

  const category =
    categoryParam && (CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as Category)
      : undefined;

  const page = await listFeed(supabase, {
    partnerId: scope.partnerId,
    category,
    cursor,
  });

  const t = await getTranslations('community');
  const lineUrl =
    scope.partner?.line_url ??
    (scope.partnerId === null ? process.env.NEXT_PUBLIC_HONUVIBE_LINE_URL ?? null : null);

  return (
    <div className="space-y-5 max-w-[820px]">
      <DashboardPageHeader icon={Users} title={scope.partner?.name_en ?? t('page_title')} />

      {locale === 'ja' && lineUrl && (
        <LineJoinCard url={lineUrl} partnerScope={scope.partner?.slug ?? 'main'} />
      )}

      {isBanned && <BannedBanner />}

      <CourseChannelsStrip userId={userId} locale={locale} />

      {!isBanned && <PostComposer partnerScope={scope.partner?.slug ?? 'main'} />}

      <CategoryChips />

      {page.posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-3">
          {page.posts.map((post) => (
            <PostCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      )}

      {page.nextCursor && (
        <div className="text-center pt-2">
          <a
            href={`?${new URLSearchParams({
              ...(category ? { category } : {}),
              cursor: page.nextCursor,
            }).toString()}`}
            className="inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-colors"
          >
            {t('load_more')}
          </a>
        </div>
      )}
    </div>
  );
}
