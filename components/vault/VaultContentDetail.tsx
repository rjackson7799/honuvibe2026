import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { VaultVideoPlayer } from './VaultVideoPlayer';
import { VaultActionBar } from './VaultActionBar';
import { VaultFeedbackWidget } from './VaultFeedbackWidget';
import { VaultDownloadList } from './VaultDownloadList';
import { VaultContentCard } from './VaultContentCard';
import { VaultNoteEditor } from './VaultNoteEditor';
import { VaultCompletionToggle } from './VaultCompletionToggle';
import { VaultRelatedItems } from './VaultRelatedItems';
import type { VaultContentDetail as VaultContentDetailType } from '@/lib/vault/types';

type VaultContentDetailProps = {
  detail: VaultContentDetailType;
  locale: string;
};

export function VaultContentDetail({ detail, locale }: VaultContentDetailProps) {
  const { item, downloads, relatedItems, series, seriesItems, userState } = detail;
  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const description = locale === 'ja' && item.description_jp ? item.description_jp : item.description_en;

  const isVideo = item.content_type.includes('video');

  // Compute series prev/next for keyboard shortcuts
  let seriesPrevHref: string | null = null;
  let seriesNextHref: string | null = null;
  if (seriesItems.length > 0) {
    const currentIdx = seriesItems.findIndex((si) => si.id === item.id);
    if (currentIdx > 0) {
      seriesPrevHref = `/learn/vault/${seriesItems[currentIdx - 1].slug}`;
    }
    if (currentIdx < seriesItems.length - 1 && currentIdx >= 0) {
      seriesNextHref = `/learn/vault/${seriesItems[currentIdx + 1].slug}`;
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-8">
      {/* Video player or header */}
      {isVideo && item.embed_url ? (
        <VaultVideoPlayer embedUrl={item.embed_url} title={title} />
      ) : isVideo && item.url ? (
        <VaultVideoPlayer embedUrl={item.url} title={title} />
      ) : null}

      {/* Title + Meta */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary capitalize">
            {item.content_type.replace(/_/g, ' ')}
          </span>
          {item.difficulty_level && (
            <span className="text-xs px-2 py-0.5 rounded bg-accent-gold/10 text-accent-gold capitalize">
              {item.difficulty_level}
            </span>
          )}
          {item.access_tier === 'premium' && (
            <span className="text-xs px-2 py-0.5 rounded bg-accent-gold/90 text-white">Premium</span>
          )}
          {item.duration_minutes && (
            <span className="text-xs text-fg-tertiary">{item.duration_minutes} min</span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-3">{title}</h1>
        {description && (
          <p className="text-fg-secondary leading-relaxed">{description}</p>
        )}
        {item.author_name && (
          <p className="text-sm text-fg-tertiary mt-2">By {item.author_name}</p>
        )}
      </div>

      {/* Action bar */}
      {userState && (
        <div className="flex items-center gap-2 flex-wrap">
          <VaultActionBar
            itemId={item.id}
            userState={userState}
            isVideo={isVideo}
            seriesPrevHref={seriesPrevHref}
            seriesNextHref={seriesNextHref}
          />
          <VaultCompletionToggle
            itemId={item.id}
            isCompleted={userState.isCompleted}
          />
        </div>
      )}

      {/* Non-video content link */}
      {!isVideo && item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-teal text-white text-sm font-medium hover:bg-accent-teal/90 transition-colors"
        >
          View Content
        </a>
      )}

      {/* Downloads */}
      {downloads.length > 0 && (
        <div>
          <h2 className="text-lg font-serif text-fg-primary mb-4">Downloads</h2>
          <VaultDownloadList downloads={downloads} />
        </div>
      )}

      {/* Feedback */}
      <VaultFeedbackWidget
        itemId={item.id}
        helpfulCount={item.helpful_count}
        notHelpfulCount={item.not_helpful_count}
        currentFeedback={userState?.feedback ?? null}
      />

      {/* Notes editor */}
      {userState && (
        <VaultNoteEditor
          contentItemId={item.id}
          initialNote={userState.note}
          isVideo={isVideo}
        />
      )}

      {/* Series navigation */}
      {series && seriesItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif text-fg-primary">
              Series: {locale === 'ja' && series.title_jp ? series.title_jp : series.title_en}
            </h2>
            <Link
              href={`/learn/vault/series/${series.slug}`}
              className="flex items-center gap-1 text-sm text-accent-teal hover:text-accent-teal/80 transition-colors"
            >
              View Full Series
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesItems.map((si) => (
              <VaultContentCard key={si.id} item={si} />
            ))}
          </div>
        </div>
      )}

      {/* Related items */}
      <VaultRelatedItems items={relatedItems} />
    </div>
  );
}
