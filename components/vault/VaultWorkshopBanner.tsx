import { CalendarDays, User, ExternalLink } from 'lucide-react';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultWorkshopBannerProps = {
  item: VaultContentItem;
  locale: string;
};

/**
 * Event metadata banner for content_type='workshop'. Renders above the video
 * player on the detail page. Shows the date + presenter; if there's a live
 * re-run scheduled (event_signup_url set AND event_date in the future), also
 * shows a "Register for live session" CTA.
 *
 * Date is formatted in the viewer's locale + timezone via Intl.
 */
export function VaultWorkshopBanner({ item, locale }: VaultWorkshopBannerProps) {
  if (!item.event_date && !item.presenter_name && !item.event_signup_url) {
    return null;
  }

  const eventDate = item.event_date ? new Date(item.event_date) : null;
  const isUpcoming = eventDate ? eventDate.getTime() > Date.now() : false;
  const hasSignup = !!item.event_signup_url;
  const showLiveCta = isUpcoming && hasSignup;

  const dateLabel = eventDate
    ? new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(eventDate)
    : null;

  return (
    <div className="rounded-lg border border-accent-teal/30 bg-accent-teal/5 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      {dateLabel && (
        <div className="flex items-center gap-2 text-sm text-fg-primary">
          <CalendarDays size={14} className="text-accent-teal shrink-0" />
          <span>
            {isUpcoming
              ? locale === 'ja' ? '次回ライブ：' : 'Live session: '
              : locale === 'ja' ? '録画日：' : 'Recorded: '}
            {dateLabel}
          </span>
        </div>
      )}
      {item.presenter_name && (
        <div className="flex items-center gap-2 text-sm text-fg-secondary">
          <User size={14} className="text-fg-tertiary shrink-0" />
          <span>{item.presenter_name}</span>
        </div>
      )}
      {showLiveCta && (
        <a
          href={item.event_signup_url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-accent-teal text-white hover:bg-accent-teal/90 transition-colors"
        >
          {locale === 'ja' ? 'ライブセッションに登録' : 'Register for live session'}
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
