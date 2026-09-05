import { setRequestLocale } from 'next-intl/server';
import { permanentRedirect } from 'next/navigation';
import { authorizeSession } from '@/lib/studio/engagement/session';
import { discoveryPath } from '@/lib/studio/engagement/questionnaire-token';
import { QuestionnaireApp } from '@/components/engagement/QuestionnaireApp';
import { FatalCard } from '@/components/engagement/FatalCard';
import type { StoredAnswer } from '@/lib/studio/engagement/questions-schema';

// The client discovery questionnaire — /discovery/<id> · /ja/discovery/<id>.
// Cookie-authenticated (the entry route set hv_engq_<id>); the URL holds only
// a UUID. Never prerendered, never cached, never indexed: force-dynamic here,
// robots metadata below, and the no-store / no-referrer / X-Robots-Tag headers
// for /discovery/* in next.config.ts. Chromeless via conditional-nav.tsx; no
// LangToggle — the locale is owned by the questionnaire.
//
// Locale prefix, loop-safe against next-intl's middleware (localePrefix
// 'as-needed' redirects an UNPREFIXED path to /ja/... whenever the visitor
// resolves to ja, and sets NEXT_LOCALE=ja on any /ja response): a ja
// questionnaire at /discovery/<id> always 308s to /ja/ (the middleware never
// strips a prefix, so that direction cannot loop); an en questionnaire reached
// at /ja/discovery/<id> renders IN PLACE with its own lang + typography —
// bouncing it back would ping-pong with the middleware, and a site-wide
// NEXT_LOCALE pin was rejected on review (it overwrote the visitor's
// language preference for the whole site).

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Discovery questionnaire — HonuVibe Studio',
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DiscoveryQuestionnairePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';

  if (!UUID_RE.test(id)) return <FatalCard locale={lang} kind="forbidden" />;

  const auth = await authorizeSession(id);
  if (!auth.ok) {
    return <FatalCard locale={lang} kind={auth.status === 410 ? 'expired' : auth.status === 503 ? 'unavailable' : 'forbidden'} />;
  }
  const q = auth.questionnaire;

  if (q.locale !== lang) {
    if (q.locale === 'ja') {
      // A JA questionnaire always lives under /ja: the entry route 303s there
      // and next-intl keeps a prefixed path as-is.
      permanentRedirect(discoveryPath('ja', q.id));
    }
    // An EN questionnaire reached under /ja: next-intl put it here (the
    // visitor's locale cookie / Accept-Language resolves to ja) and sets
    // NEXT_LOCALE=ja on this very response, so bouncing back to /discovery
    // would loop. Render in place — the questionnaire wrapper carries its own
    // lang + typography, so the content is unaffected by the prefix.
  }

  const { data: rows, error } = await auth.supabase
    .from('engagement_questionnaire_answers')
    .select('question_id, answer, other_text')
    .eq('questionnaire_id', q.id)
    .eq('questions_version', q.questions_version);
  if (error) {
    console.error('[discovery page] answers read failed:', error.message);
    return <FatalCard locale={q.locale} kind="unavailable" />;
  }

  return (
    <QuestionnaireApp
      questionnaire={{
        id: q.id,
        locale: q.locale,
        title: q.title,
        intro_md: q.intro_md,
        sections: q.sections,
        questions: q.questions,
        questions_version: q.questions_version,
        status: q.status,
        submitted_at: q.submitted_at,
      }}
      initialAnswers={((rows ?? []) as Pick<StoredAnswer, 'question_id' | 'answer' | 'other_text'>[])}
    />
  );
}
