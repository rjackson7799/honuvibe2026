'use client';

import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Video, Play, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CourseSession } from '@/lib/courses/types';

type SessionCardProps = {
  session: CourseSession;
  isUnlocked: boolean;
};

function getSessionState(session: CourseSession): 'upcoming' | 'live-soon' | 'live' | 'completed' {
  if (session.status === 'completed') return 'completed';
  if (session.status === 'live') return 'live';

  if (session.scheduled_at) {
    const scheduledAt = new Date(session.scheduled_at);
    const now = new Date();
    const diffMs = scheduledAt.getTime() - now.getTime();
    const diffMin = diffMs / (1000 * 60);
    if (diffMin <= 30 && diffMin > 0) return 'live-soon';
  }

  return 'upcoming';
}

export function SessionCard({ session, isUnlocked }: SessionCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const title = locale === 'ja' && session.title_jp ? session.title_jp : session.title_en;
  const state = getSessionState(session);

  const dateFormatted = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
      )
    : null;

  const topics = locale === 'ja' && session.topics_jp
    ? session.topics_jp
    : session.topics_en;

  return (
    <div
      className={cn(
        'border border-border-default rounded-lg p-4 space-y-3',
        !isUnlocked && 'opacity-50',
        state === 'live' && 'border-accent-teal bg-accent-teal/5',
        state === 'live-soon' && 'border-accent-gold bg-accent-gold/5',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-fg-tertiary mb-1">
            <span>{t('session', { number: session.session_number })}</span>
            <span>·</span>
            <span>{t(`format_${session.format}`)}</span>
            {session.duration_minutes && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {session.duration_minutes} min
                </span>
              </>
            )}
          </div>
          <h4 className="text-sm font-medium text-fg-primary">{title}</h4>
          {dateFormatted && (
            <p className="text-xs text-fg-tertiary mt-1">{dateFormatted}</p>
          )}
        </div>
        <div className="shrink-0">
          {state === 'live' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-teal px-2 py-0.5 bg-accent-teal/10 rounded-full">
              <span className="w-1.5 h-1.5 bg-accent-teal rounded-full animate-pulse" />
              {t('live_now')}
            </span>
          )}
          {state === 'live-soon' && (
            <span className="text-xs font-medium text-accent-gold">
              {t('upcoming')}
            </span>
          )}
          {state === 'completed' && (
            <span className="text-xs text-fg-tertiary">{t('completed')}</span>
          )}
        </div>
      </div>

      {/* Topics (collapsed for brevity) */}
      {isUnlocked && topics && topics.length > 0 && (
        <div className="text-xs text-fg-secondary space-y-1">
          {(topics as { title: string }[]).map((topic, i) => (
            <span key={i} className="block">• {topic.title}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      {isUnlocked && (
        <div className="flex flex-wrap gap-2">
          {state === 'live' && session.zoom_link && (
            <Button
              variant="primary"
              size="sm"
              icon={Video}
              onClick={() => window.open(session.zoom_link!, '_blank')}
            >
              {t('join_live')}
            </Button>
          )}
          {state === 'live-soon' && session.zoom_link && (
            <Button
              variant="primary"
              size="sm"
              icon={Video}
              onClick={() => window.open(session.zoom_link!, '_blank')}
            >
              {t('join_zoom')}
            </Button>
          )}
          {state === 'completed' && session.replay_url && (
            <Button
              variant="ghost"
              size="sm"
              icon={Play}
              onClick={() => window.open(session.replay_url!, '_blank')}
            >
              {t('watch_replay')}
            </Button>
          )}
          {state === 'completed' && session.transcript_url && (
            <Button
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open(session.transcript_url!, '_blank')}
            >
              {t('download_transcript')}
            </Button>
          )}
          {state === 'completed' && session.slide_deck_url && (
            <Button
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open(session.slide_deck_url!, '_blank')}
            >
              {t('download_slides')}
            </Button>
          )}
          {state === 'upcoming' && (
            <p className="text-xs text-fg-tertiary italic">
              {t('link_available_soon')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
