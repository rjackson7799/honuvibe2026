'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Calendar, Video, Radio, Tv, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpcomingSessionItem } from '@/lib/dashboard/types';

type TimeGroup = 'today' | 'this_week' | 'next_week' | 'later';

function getTimeGroup(dateStr: string): TimeGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfWeek.getDate() + 7);

  if (date >= today && date < tomorrow) return 'today';
  if (date >= tomorrow && date < endOfWeek) return 'this_week';
  if (date >= endOfWeek && date < endOfNextWeek) return 'next_week';
  return 'later';
}

function SessionCard({ session, locale }: { session: UpcomingSessionItem; locale: string }) {
  const t = useTranslations('dashboard');
  const title = locale === 'ja' && session.title_jp ? session.title_jp : session.title_en;
  const courseTitle = locale === 'ja' && session.course_title_jp
    ? session.course_title_jp : session.course_title_en;
  const sessionDate = new Date(session.scheduled_at);

  const formatIcon = session.format === 'live' ? Radio
    : session.format === 'hybrid' ? Tv : Video;
  const FormatIcon = formatIcon;
  const formatBadgeColor = session.format === 'live'
    ? 'bg-accent-teal/10 text-accent-teal'
    : session.format === 'hybrid'
      ? 'bg-accent-gold/10 text-accent-gold'
      : 'bg-bg-tertiary text-fg-tertiary';

  const now = new Date();
  const minutesUntil = Math.round((sessionDate.getTime() - now.getTime()) / (1000 * 60));
  const canJoin = session.format !== 'recorded' && session.zoom_link && minutesUntil <= 30 && minutesUntil >= -120;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-fg-primary">{title}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${formatBadgeColor}`}>
              <FormatIcon size={12} />
              {t(`format_${session.format}`)}
            </span>
          </div>
          <p className="text-xs text-fg-tertiary mb-2">
            {courseTitle} · {t('week_label', { number: session.week_number })}
          </p>
          <div className="flex items-center gap-3 text-xs text-fg-secondary">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {sessionDate.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>
              {sessionDate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            {session.duration_minutes && (
              <span>{session.duration_minutes} min</span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {canJoin ? (
            <a
              href={session.zoom_link!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-teal text-white hover:bg-accent-teal-hover transition-colors"
            >
              {t('join_session')}
              <ExternalLink size={12} />
            </a>
          ) : session.replay_url ? (
            <a
              href={session.replay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-secondary border border-border-default hover:bg-bg-tertiary transition-colors"
            >
              {t('watch_replay')}
              <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [sessions, setSessions] = useState<UpcomingSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/schedule');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const groupedSessions = sessions.reduce<Record<TimeGroup, UpcomingSessionItem[]>>(
    (acc, session) => {
      const group = getTimeGroup(session.scheduled_at);
      acc[group].push(session);
      return acc;
    },
    { today: [], this_week: [], next_week: [], later: [] },
  );

  const groups: { key: TimeGroup; labelKey: string }[] = [
    { key: 'today', labelKey: 'today' },
    { key: 'this_week', labelKey: 'this_week' },
    { key: 'next_week', labelKey: 'next_week' },
    { key: 'later', labelKey: 'later' },
  ];

  if (loading) {
    return (
      <div className="space-y-8 max-w-[1100px]">
        <h1 className="text-2xl font-serif text-fg-primary">{t('heading_schedule')}</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-bg-tertiary rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1100px]">
      <h1 className="text-2xl font-serif text-fg-primary">{t('heading_schedule')}</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-fg-tertiary mb-4" />
          <p className="text-fg-tertiary">{t('schedule_empty')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ key, labelKey }) => {
            const groupSessions = groupedSessions[key];
            if (groupSessions.length === 0) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
                    {t(labelKey)}
                  </h2>
                  <span className="text-xs bg-bg-tertiary text-fg-tertiary px-2 py-0.5 rounded-full">
                    {groupSessions.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {groupSessions.map((session) => (
                    <SessionCard key={session.id} session={session} locale={locale} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
