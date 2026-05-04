'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Clock, Mic, Wrench, MessageCircle, Video, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import type { CourseSession, BonusSessionType } from '@/lib/courses/types';
import Image from 'next/image';

type BonusSessionsSectionProps = {
  sessions: CourseSession[];
  isEnrolled: boolean;
};

type BonusVariant = 'teal' | 'coral' | 'purple' | 'navy';

const BONUS_CONFIG: Record<BonusSessionType, {
  icon: typeof Clock;
  variant: BonusVariant;
  labelKey: string;
}> = {
  'office-hours': { icon: Clock, variant: 'teal', labelKey: 'officeHours' },
  'guest-speaker': { icon: Mic, variant: 'purple', labelKey: 'guestSpeaker' },
  'workshop': { icon: Wrench, variant: 'coral', labelKey: 'workshop' },
  'qa': { icon: MessageCircle, variant: 'navy', labelKey: 'qa' },
};

function sortBonusSessions(sessions: CourseSession[]): CourseSession[] {
  return [...sessions].sort((a, b) => {
    const statusOrder = { upcoming: 0, live: 0, completed: 1 };
    const aStatus = statusOrder[a.status] ?? 0;
    const bStatus = statusOrder[b.status] ?? 0;
    if (aStatus !== bStatus) return aStatus - bStatus;

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
      <SectionHeading size="h2" className="mb-6">{t('title')}</SectionHeading>
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
    <div className="bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-md)] p-5 shadow-[var(--m-shadow-xs)] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <BadgePill variant={config.variant} size="sm">
          <Icon size={12} />
          {t(config.labelKey)}
        </BadgePill>
        {isLive && (
          <BadgePill variant="live" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--m-accent-coral)] animate-pulse" />
            Live
          </BadgePill>
        )}
        {isCompleted && (
          <span className="text-xs text-[var(--m-ink-tertiary)]">Completed</span>
        )}
      </div>

      <h3 className="text-[15px] font-bold text-[var(--m-ink-primary)] tracking-[-0.01em]">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--m-ink-secondary)] leading-relaxed">{description}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--m-ink-tertiary)]">
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
          <p className="text-xs text-[var(--m-ink-tertiary)] italic">{t('enrollToAccess')}</p>
        )
      )}
    </div>
  );
}
