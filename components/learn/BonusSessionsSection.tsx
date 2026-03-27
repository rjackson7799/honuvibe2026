'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Clock, Mic, Wrench, MessageCircle, Video, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CourseSession, BonusSessionType } from '@/lib/courses/types';
import Image from 'next/image';

type BonusSessionsSectionProps = {
  sessions: CourseSession[];
  isEnrolled: boolean;
};

const BONUS_CONFIG: Record<BonusSessionType, {
  icon: typeof Clock;
  colorClass: string;
  labelKey: string;
}> = {
  'office-hours': { icon: Clock, colorClass: 'text-accent-teal bg-accent-teal/10 border-accent-teal/20', labelKey: 'officeHours' },
  'guest-speaker': { icon: Mic, colorClass: 'text-accent-gold bg-accent-gold/10 border-accent-gold/20', labelKey: 'guestSpeaker' },
  'workshop': { icon: Wrench, colorClass: 'text-territory-web bg-territory-web/10 border-territory-web/20', labelKey: 'workshop' },
  'qa': { icon: MessageCircle, colorClass: 'text-territory-pro bg-territory-pro/10 border-territory-pro/20', labelKey: 'qa' },
};

function sortBonusSessions(sessions: CourseSession[]): CourseSession[] {
  return [...sessions].sort((a, b) => {
    // Upcoming first, completed last, no-date at the end
    const statusOrder = { upcoming: 0, live: 0, completed: 1 };
    const aStatus = statusOrder[a.status] ?? 0;
    const bStatus = statusOrder[b.status] ?? 0;
    if (aStatus !== bStatus) return aStatus - bStatus;

    // Within same status group, sort by date (nulls last)
    if (a.scheduled_at && b.scheduled_at) {
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    }
    if (a.scheduled_at && !b.scheduled_at) return -1;
    if (!a.scheduled_at && b.scheduled_at) return 1;
    return 0;
  });
}

export function BonusSessionsSection({ sessions, isEnrolled }: BonusSessionsSectionProps) {
  const t = useTranslations('learn.bonusSessions');
  const locale = useLocale();

  if (sessions.length === 0) return null;

  const sorted = sortBonusSessions(sessions);

  return (
    <div>
      <h2 className="text-xl font-serif text-fg-primary mb-4">{t('title')}</h2>
      <div className="space-y-3">
        {sorted.map((session) => (
          <BonusSessionCard
            key={session.id}
            session={session}
            isEnrolled={isEnrolled}
            locale={locale}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function BonusSessionCard({
  session,
  isEnrolled,
  locale,
  t,
}: {
  session: CourseSession;
  isEnrolled: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const bonusType = session.bonus_type as BonusSessionType;
  const config = BONUS_CONFIG[bonusType] ?? BONUS_CONFIG['office-hours'];
  const Icon = config.icon;

  const title = locale === 'ja' && session.title_jp ? session.title_jp : session.title_en;
  const description = locale === 'ja' && session.description_jp
    ? session.description_jp
    : session.description_en;

  const isCompleted = session.status === 'completed';
  const isLive = session.status === 'live';

  return (
    <div className="border border-border-default rounded-lg p-4 bg-bg-secondary/50 space-y-3">
      {/* Header row: badge + status */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${config.colorClass}`}>
          <Icon size={12} />
          {t(config.labelKey)}
        </span>
        {isLive && (
          <span className="text-xs font-medium text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Live
          </span>
        )}
        {isCompleted && (
          <span className="text-xs text-fg-tertiary">Completed</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-fg-primary">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-fg-secondary">{description}</p>
      )}

      {/* Meta row: instructor, date, duration */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-fg-tertiary">
        {session.instructor && (
          <div className="flex items-center gap-1.5">
            {session.instructor.photo_url && (
              <Image
                src={session.instructor.photo_url}
                alt={session.instructor.display_name}
                width={18}
                height={18}
                className="rounded-full object-cover"
              />
            )}
            <span>{session.instructor.display_name}</span>
          </div>
        )}
        {session.scheduled_at && (
          <span>
            {new Date(session.scheduled_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
        {session.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {session.duration_minutes} min
          </span>
        )}
      </div>

      {/* Enrollment-gated links */}
      {isEnrolled ? (
        <div className="flex flex-wrap gap-2">
          {session.zoom_link && !isCompleted && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(session.zoom_link!, '_blank')}
            >
              <Video size={14} className="mr-1" />
              {t('joinZoom')}
            </Button>
          )}
          {session.replay_url && isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(session.replay_url!, '_blank')}
            >
              <Play size={14} className="mr-1" />
              {t('watchReplay')}
            </Button>
          )}
        </div>
      ) : (
        (session.zoom_link || session.replay_url) && (
          <p className="text-xs text-fg-tertiary italic">{t('enrollToAccess')}</p>
        )
      )}
    </div>
  );
}
