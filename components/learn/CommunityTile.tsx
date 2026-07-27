import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/learn/SectionHeading';
import type { Post } from '@/lib/community/types';

type CommunityTileProps = {
  unreadReplies: number;
  posts: Post[];
  locale: string;
  /**
   * Set ONLY when the feed being shown is provably this partner's — i.e. the
   * resolved community scope id equals the branded partner's id. The label is
   * therefore about the feed, not about branding state.
   */
  partnerName?: string | null;
};

/**
 * A way into the feed: unread replies first, then what's actually being talked
 * about. Categories are the real DB enum values — never invented hashtags — and
 * there is no presence/online count because no presence model exists.
 */
export async function CommunityTile({
  unreadReplies,
  posts,
  locale,
  partnerName = null,
}: CommunityTileProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const tCommunity = await getTranslations({ locale, namespace: 'community' });
  const prefix = locale === 'ja' ? '/ja' : '';
  const feedHref = `${prefix}/learn/dashboard/community`;

  return (
    <Card variant="learn" padding="md">
      <SectionHeading
        title={
          partnerName
            ? t('partner_community_cta', { partner: partnerName })
            : t('tile_community_title')
        }
        icon={<Users size={15} className="text-[color:var(--accent-teal)]" />}
      />

      {unreadReplies > 0 && (
        <Link
          href={feedHref}
          className="inline-flex items-center gap-2 mb-3 text-[13px] font-semibold text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent-teal)]" aria-hidden="true" />
          {/* Only fires for replies to the user's OWN posts. */}
          {t('tile_community_unread', { count: unreadReplies })}
        </Link>
      )}

      {posts.length === 0 ? (
        <div>
          <p className="text-[13.5px] text-fg-secondary">{t('tile_community_empty')}</p>
          <Link
            href={feedHref}
            className="mt-3 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
          >
            {t('tile_community_start')}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col">
            {posts.map((post, i) => (
              <li key={post.id} className={i === 0 ? '' : 'border-t border-border-default'}>
                <Link
                  href={`${feedHref}/${post.id}`}
                  className="block py-2.5 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <BadgePill variant="gray" size="xs">
                      {tCommunity(`category_${post.category}`)}
                    </BadgePill>
                    <span className="text-[11.5px] text-fg-tertiary truncate">
                      {post.author?.full_name ?? ''}
                    </span>
                  </div>
                  <p className="text-[13px] text-fg-primary line-clamp-1">{post.body_md}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={feedHref}
            className="mt-2 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
          >
            {t('tile_community_cta')}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </>
      )}
    </Card>
  );
}
