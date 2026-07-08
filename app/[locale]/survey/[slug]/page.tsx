import { setRequestLocale } from 'next-intl/server';
import { XCircle, Clock } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { validateSurveyToken } from '@/lib/survey/actions';
import { getCourseSurveyBySlug, getCourseSurveySettings } from '@/lib/survey/course-surveys';
import { getQuestions } from '@/lib/survey/event-surveys';
import { SurveyForm } from '@/components/survey/SurveyForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pre-course survey — HonuVibe.AI',
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

const COPY = {
  en: {
    consent:
      'Your answers are summarized by AI and shared with your instructor in aggregate so they can tailor the course. We never share your name or email.',
    invalidTitle: "This link isn't valid",
    invalidBody:
      "We couldn't match this survey link to your account. Use the link from your invitation email.",
    closedTitle: 'Survey closed',
    closedBody: 'This pre-course survey is no longer accepting responses. Thanks for your interest!',
  },
  ja: {
    consent:
      'いただいた回答はAIが要約し、講師がコースを最適化できるよう集計結果のみ共有されます。お名前やメールアドレスが共有されることはありません。',
    invalidTitle: 'リンクが無効です',
    invalidBody:
      'このアンケートリンクをアカウントと照合できませんでした。招待メールに記載のリンクをご利用ください。',
    closedTitle: 'アンケートは締め切りました',
    closedBody: 'この受講前アンケートは現在受け付けていません。ご関心ありがとうございます！',
  },
} as const;

export default async function CourseSurveyPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';
  const c = COPY[lang];

  type State = 'form' | 'invalid' | 'closed';
  let state: State = 'invalid';
  let title = '';
  let intro: string | null = null;
  let questions: Awaited<ReturnType<typeof getQuestions>> = [];
  let existingAnswers: Record<string, string | string[]> | null = null;

  const tokenResult = token ? await validateSurveyToken(token) : null;

  // Require a token bound to THIS course survey.
  if (tokenResult && tokenResult.kind === 'course' && tokenResult.surveySlug === slug) {
    const survey = await getCourseSurveyBySlug(slug);
    if (survey) {
      const settings = await getCourseSurveySettings(survey.id);
      const now = Date.now();
      const opensAt = settings?.opensAt ? new Date(settings.opensAt).getTime() : null;
      const closesAt = settings?.closesAt ? new Date(settings.closesAt).getTime() : null;
      const open =
        survey.isActive && (!opensAt || now >= opensAt) && (!closesAt || now <= closesAt);

      if (!open) {
        state = 'closed';
      } else {
        questions = await getQuestions(survey.id);
        if (questions.length === 0) {
          state = 'closed';
        } else {
          title = lang === 'ja' ? survey.titleJp : survey.titleEn;
          intro = lang === 'ja' ? survey.introJp : survey.introEn;
          const supabase = createAdminClient();
          const { data: existing } = await supabase
            .from('course_survey_responses')
            .select('answers')
            .eq('survey_id', survey.id)
            .eq('user_id', tokenResult.userId)
            .maybeSingle();
          existingAnswers = (existing?.answers as Record<string, string | string[]>) ?? null;
          state = 'form';
        }
      }
    }
  }

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

        {state === 'form' && token ? (
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
              submitUrl={`/api/survey/${slug}/respond`}
              token={token}
              locale={lang}
              questions={questions}
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
          </div>
        )}
      </div>
    </div>
  );
}
