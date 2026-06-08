import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { getEventForInvitee, getMyInvitation } from '@/lib/events/queries';
import { formatEventDateTime } from '@/lib/events/format';
import { EventRsvp } from '@/components/events/EventRsvp';
import { RsvpStatusPill } from '@/components/events/RsvpStatusPill';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const result = await getEventForInvitee(slug);
  return { title: result ? `${result.event.title_en} — HonuVibe.AI` : 'Event' };
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';
  const t = await getTranslations('events');

  const result = await getEventForInvitee(slug);
  if (!result) notFound();
  const { event, recap } = result;
  const invitation = await getMyInvitation(event.id);

  const title = lang === 'ja' ? event.title_jp ?? event.title_en : event.title_en;
  const description = lang === 'ja' ? event.description_jp : event.description_en;
  const meetingNotes = lang === 'ja' ? event.meeting_notes_jp : event.meeting_notes_en;
  const recapNotes = lang === 'ja' ? recap?.recap_notes_jp : recap?.recap_notes_en;
  const isCancelled = event.status === 'cancelled';

  const linkCls =
    'inline-flex items-center gap-2 h-11 px-5 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-sm font-semibold transition-colors';
  const recapLinkCls =
    'inline-flex items-center gap-2 text-sm font-medium text-accent-teal hover:underline';

  return (
    <div className="max-w-[760px] mx-auto px-5 py-8 space-y-7">
      <Link
        href="/learn/dashboard/events"
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft size={15} /> {t('back_to_events')}
      </Link>

      <header className="space-y-2">
        {isCancelled && (
          <span className="inline-block text-[12px] font-semibold uppercase tracking-[0.08em] text-red-600">
            {t('status_cancelled')}
          </span>
        )}
        <h1 className="text-[clamp(26px,3.4vw,38px)] font-bold text-fg-primary tracking-[-0.02em] leading-tight">
          {title}
        </h1>
        <p className="text-fg-secondary">
          {formatEventDateTime(event.starts_at, event.timezone, lang)}
        </p>
        {event.presenter_name ? (
          <p className="text-[13px] text-fg-tertiary">
            {t('presenter_label')}: {event.presenter_name}
            {event.presenter_org ? ` · ${event.presenter_org}` : ''}
          </p>
        ) : null}
        {invitation && !isCancelled ? (
          <div className="pt-1">
            <RsvpStatusPill
              status={invitation.status}
              labels={{
                needed: t('status_needed'),
                going: t('badge_going'),
                notGoing: t('badge_not_going'),
              }}
            />
          </div>
        ) : null}
      </header>

      {description ? (
        <p className="text-fg-secondary leading-relaxed whitespace-pre-line">{description}</p>
      ) : null}

      {/* RSVP — surfaced first so first-time visitors respond before anything else. */}
      {invitation && !isCancelled ? (
        <EventRsvp
          invitationId={invitation.id}
          initialStatus={invitation.status}
          labels={{
            question: t('rsvp_question'),
            prompt: t('rsvp_prompt'),
            going: t('rsvp_going'),
            notGoing: t('rsvp_not_going'),
            saved: t('rsvp_saved'),
            change: t('rsvp_change'),
            statusGoing: t('status_going'),
            statusNotGoing: t('status_not_going'),
          }}
        />
      ) : null}

      {/* Meeting details — only invitees of a published event can reach this page. */}
      {!isCancelled && (event.meeting_url || meetingNotes) ? (
        <section className="rounded-xl border border-border-default bg-bg-secondary p-5 space-y-3">
          {event.meeting_url ? (
            <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className={linkCls}>
              <Video size={16} /> {t('join_cta')}
            </a>
          ) : null}
          {meetingNotes ? (
            <div>
              <p className="text-[13px] font-semibold text-fg-primary mb-1">{t('join_notes_label')}</p>
              <p className="text-[13px] text-fg-secondary whitespace-pre-line">{meetingNotes}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Recap (only present when recap_published + RLS-readable) */}
      {recap ? (
        <section className="space-y-3 border-t border-border-default pt-6">
          <h2 className="text-[clamp(18px,2.4vw,22px)] font-semibold text-fg-primary">
            {t('recap_title')}
          </h2>
          <div className="flex flex-col gap-2">
            {recap.recording_url ? (
              <a href={recap.recording_url} target="_blank" rel="noopener noreferrer" className={recapLinkCls}>
                {t('recap_recording')}
              </a>
            ) : null}
            {recap.slide_deck_url ? (
              <a href={recap.slide_deck_url} target="_blank" rel="noopener noreferrer" className={recapLinkCls}>
                {t('recap_slides')}
              </a>
            ) : null}
            {recap.transcript_url ? (
              <a href={recap.transcript_url} target="_blank" rel="noopener noreferrer" className={recapLinkCls}>
                {t('recap_transcript')}
              </a>
            ) : null}
          </div>
          {recapNotes ? (
            <p className="text-fg-secondary leading-relaxed whitespace-pre-line">{recapNotes}</p>
          ) : null}
          {recap.recap_resources.length > 0 ? (
            <div>
              <p className="text-[13px] font-semibold text-fg-primary mb-1">{t('recap_resources')}</p>
              <ul className="list-disc pl-5 space-y-1">
                {recap.recap_resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className={recapLinkCls}>
                      {r.label || r.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
