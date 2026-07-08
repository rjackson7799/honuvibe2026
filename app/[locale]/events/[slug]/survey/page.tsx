import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { XCircle, Clock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { publicEventBySlug } from '@/lib/events/public-events';
import { getOpenEventSurvey } from '@/lib/survey/event-surveys';
import { SurveyForm } from '@/components/survey/SurveyForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pre-event survey — HonuVibe.AI',
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

// Statuses that hold a seat — only these may open the survey.
const CONFIRMED = new Set(['confirmed', 'attended', 'no_show']);

const COPY = {
  en: {
    consent:
      'Your answers are summarized by AI and shared with the presenter in aggregate so they can tailor the session. We never share your name or email.',
    invalidTitle: "This link isn't valid",
    invalidBody:
      "We couldn't match this to a confirmed registration. If you registered, use the survey link from your confirmation email.",
    closedTitle: 'Survey closed',
    closedBody: 'This pre-event survey is no longer accepting responses. Thanks for your interest!',
    back: 'Back to event',
  },
  ja: {
    consent:
      'いただいた回答はAIが要約し、発表者がセッションを最適化できるよう集計結果のみ共有されます。お名前やメールアドレスが共有されることはありません。',
    invalidTitle: 'リンクが無効です',
    invalidBody:
      '確定済みの登録と照合できませんでした。ご登録済みの場合は、確認メールに記載のアンケートリンクをご利用ください。',
    closedTitle: 'アンケートは締め切りました',
    closedBody: 'この事前アンケートは現在受け付けていません。ご関心ありがとうございます！',
    back: 'イベントに戻る',
  },
} as const;

export default async function EventSurveyPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';
  const c = COPY[lang];

  const event = publicEventBySlug(slug);
  if (!event) notFound();

  type State = 'form' | 'invalid' | 'closed';
  let state: State = 'invalid';
  let open: Awaited<ReturnType<typeof getOpenEventSurvey>> = null;
  let existingAnswers: Record<string, string | string[]> | null = null;

  if (token && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createAdminClient();
    const { data: rsvp } = await supabase
      .from('event_rsvps')
      .select('id, status')
      .eq('confirm_token', token)
      .eq('event_slug', slug)
      .maybeSingle();

    if (rsvp && CONFIRMED.has(rsvp.status)) {
      open = await getOpenEventSurvey(slug);
      if (open) {
        const { data: existing } = await supabase
          .from('event_survey_responses')
          .select('answers')
          .eq('survey_id', open.survey.id)
          .eq('rsvp_id', rsvp.id)
          .maybeSingle();
        existingAnswers = (existing?.answers as Record<string, string | string[]>) ?? null;
        state = 'form';
      } else {
        state = 'closed';
      }
    }
  }

  const title = open ? (lang === 'ja' ? open.survey.titleJp : open.survey.titleEn) : '';
  const intro = open ? (lang === 'ja' ? open.survey.introJp : open.survey.introEn) : null;

  return (
    <div
      data-shell="marketing"
      className="learn-zone min-h-screen px-6 py-12"
      style={{ backgroundColor: 'var(--m-canvas)' }}
    >
      <div className="mx-auto w-full max-w-[600px]">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--m-ink-primary)' }}>
            HonuVibe<span style={{ color: 'var(--m-accent-teal)' }}>.AI</span>
          </span>
        </div>

        {state === 'form' && open && token ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-[26px] font-bold tracking-[-0.02em] text-[var(--m-ink-primary)]">
                {title}
              </h1>
              {intro && (
                <p className="mt-2 text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">{intro}</p>
              )}
              <p className="mx-auto mt-4 max-w-[480px] text-[12px] leading-[1.5] text-[var(--m-ink-secondary)]">
                {c.consent}
              </p>
            </div>
            <SurveyForm
              submitUrl={`/api/events/${slug}/survey`}
              token={token}
              locale={lang}
              questions={open.questions}
              existingAnswers={existingAnswers}
            />
          </>
        ) : (
          <div className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 text-center shadow-[var(--m-shadow-md)]">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(15,169,160,0.1)' }}
            >
              {state === 'closed' ? (
                <Clock size={28} strokeWidth={2} style={{ color: 'var(--m-accent-coral)' }} />
              ) : (
                <XCircle size={28} strokeWidth={2} style={{ color: 'var(--m-accent-coral)' }} />
              )}
            </div>
            <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
              {state === 'closed' ? c.closedTitle : c.invalidTitle}
            </h1>
            <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">
              {state === 'closed' ? c.closedBody : c.invalidBody}
            </p>
            <div className="mt-6">
              <Link
                href={`/events/${slug}`}
                className="text-[13px] font-medium text-[var(--m-accent-teal)] hover:underline"
              >
                {c.back}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
