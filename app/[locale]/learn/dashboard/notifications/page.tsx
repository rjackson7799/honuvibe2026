import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, ClipboardList, MessageSquare, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getNotifications, type NotificationRow } from '@/lib/notifications/queries';
import { markAllRead } from '@/lib/notifications/actions';
import { MarkAllReadOnView } from '@/components/learn/MarkAllReadOnView';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const ICON = {
  session_soon: CalendarClock,
  assignment_due: ClipboardList,
  community_reply: MessageSquare,
} as const;

type Params = { params: Promise<{ locale: string }> };

export default async function NotificationsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${locale === 'ja' ? '/ja' : ''}/learn/auth`);
  }

  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const notifications = await getNotifications(user.id);
  const isJP = locale === 'ja';
  const dateLocale = isJP ? 'ja-JP' : 'en-US';
  const hasUnread = notifications.some((n) => !n.read_at);

  // Titles are bilingual content stored in `data`; UI copy comes from next-intl.
  const pick = (en: unknown, jp: unknown) => String((isJP ? jp || en : en) ?? '');

  function label(n: NotificationRow): string {
    const d = n.data;
    if (n.type === 'session_soon') {
      const when = d.scheduledAt
        ? new Date(String(d.scheduledAt)).toLocaleString(dateLocale, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : '';
      return t('notif_session_soon', {
        course: pick(d.courseTitleEn, d.courseTitleJp),
        session: pick(d.sessionTitleEn, d.sessionTitleJp),
        when,
      });
    }
    if (n.type === 'assignment_due') {
      const when = d.dueDate
        ? new Date(`${String(d.dueDate)}T00:00:00`).toLocaleDateString(dateLocale, {
            month: 'short',
            day: 'numeric',
          })
        : '';
      return t('notif_assignment_due', {
        assignment: pick(d.assignmentTitleEn, d.assignmentTitleJp),
        course: pick(d.courseTitleEn, d.courseTitleJp),
        when,
      });
    }
    return t('notif_community_reply', { name: String(d.actorName ?? '') });
  }

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });

  return (
    <div className="relative space-y-5 max-w-[720px]">
      <MarkAllReadOnView hasUnread={hasUnread} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          {t('notifications_title')}
        </h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-[13px] font-semibold text-[color:var(--accent-teal)] hover:underline"
            >
              {t('notifications_mark_all_read')}
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell size={28} className="text-fg-tertiary" />
          <p className="text-[14px] text-fg-secondary">{t('notifications_empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            const unread = !n.read_at;
            const row = (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-[12px] border px-4 py-3 transition-colors',
                  unread
                    ? 'bg-[color:var(--accent-teal-subtle)] border-[color:var(--accent-teal)]/30'
                    : 'bg-bg-secondary border-border-default',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0',
                    unread ? 'text-[color:var(--accent-teal)]' : 'text-fg-tertiary',
                  )}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-snug text-fg-primary">{label(n)}</p>
                  <p className="mt-1 text-[12px] text-fg-tertiary">{shortDate(n.created_at)}</p>
                </div>
                {unread && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--accent-coral)]"
                    aria-hidden
                  />
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="block">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
