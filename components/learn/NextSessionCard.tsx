'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BadgePill } from '@/components/ui/badge-pill';
import type { UpcomingSessionItem } from '@/lib/dashboard/types';

type NextSessionCardProps = {
  session: UpcomingSessionItem;
  locale: string;
  /** Pre-formatted on the server so SSR and client hydration agree (no TZ mismatch). */
  dateLabel: string;
  timeLabel: string;
};

export function NextSessionCard({ session, locale, dateLabel, timeLabel }: NextSessionCardProps) {
  const t = useTranslations('dashboard');
  const [countdown, setCountdown] = useState<string | null>(null);

  const title = locale === 'ja' && session.title_jp ? session.title_jp : session.title_en;
  const courseTitle =
    locale === 'ja' && session.course_title_jp
      ? session.course_title_jp
      : session.course_title_en;
  const isLive = session.format === 'live';

  // Compute the live countdown only after mount — never during render, so the
  // server-rendered HTML and first client render match (no hydration warning).
  useEffect(() => {
    const compute = () => {
      const start = new Date(session.scheduled_at).getTime();
      const now = Date.now();
      const diffMs = start - now;

      if (diffMs <= 0) {
        const durationMs = (session.duration_minutes ?? 0) * 60_000;
        setCountdown(now - start <= durationMs ? t('live_now') : null);
        return;
      }

      const totalMinutes = Math.floor(diffMs / 60_000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      const time =
        days >= 1 ? `${days}d ${hours}h` : hours >= 1 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
      setCountdown(t('starts_in', { time }));
    };

    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [session.scheduled_at, session.duration_minutes, t]);

  const cta =
    isLive && session.zoom_link ? (
      <Button
        href={session.zoom_link}
        target="_blank"
        rel="noopener noreferrer"
        variant="primary"
        size="sm"
      >
        {t('join_session')}
      </Button>
    ) : session.replay_url ? (
      <Button
        href={session.replay_url}
        target="_blank"
        rel="noopener noreferrer"
        variant="ghost"
        size="sm"
      >
        {t('watch_replay')}
      </Button>
    ) : (
      <Link
        href={`/learn/dashboard/${session.course_slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)]"
      >
        {t('view_course')} <ArrowRight size={14} />
      </Link>
    );

  return (
    <Card variant="learn" padding="md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-teal)] mb-2">
            {t('next_session_heading')}
          </p>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-[15px] font-semibold text-fg-primary truncate">{title}</h3>
            {isLive && (
              <BadgePill variant="live" size="xs">
                LIVE
              </BadgePill>
            )}
          </div>
          <p className="text-[12.5px] text-fg-tertiary">
            {courseTitle} · {t('week_label', { number: session.week_number })}
          </p>
          {countdown && (
            <p className="mt-2 text-[13px] font-semibold text-[color:var(--accent-teal)]">
              {countdown}
            </p>
          )}
          <p className="mt-1 text-[12px] text-fg-tertiary">
            {dateLabel} · {timeLabel}
          </p>
        </div>
        <div className="shrink-0">{cta}</div>
      </div>
    </Card>
  );
}
