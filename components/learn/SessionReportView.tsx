import type { StudentReport } from '@/lib/tutoring/types';

type Loc = 'en' | 'ja';

const LABELS: Record<Loc, Record<string, string>> = {
  en: {
    snapshot: 'Session snapshot',
    wins: 'What went well',
    trouble: 'Things to work on',
    recurring: 'Patterns over time',
    study: 'Focus for practice',
    vocab: 'Vocabulary',
    grammar: 'Grammar points',
    homework: 'Homework',
    next: 'Next session',
    youSaid: 'You said',
    tryThis: 'Try',
    example: 'Example',
    trendNew: 'New',
    trendPersistent: 'Recurring',
    trendImproving: 'Improving',
  },
  ja: {
    snapshot: 'セッションのまとめ',
    wins: '良かった点',
    trouble: '取り組みたい点',
    recurring: 'これまでの傾向',
    study: '練習のポイント',
    vocab: '語彙',
    grammar: '文法ポイント',
    homework: '宿題',
    next: '次回に向けて',
    youSaid: 'あなたの表現',
    tryThis: '直し方',
    example: '例文',
    trendNew: '新しい',
    trendPersistent: '繰り返し',
    trendImproving: '改善中',
  },
};

function pick(en: string, jp: string, locale: Loc): string {
  return locale === 'ja' ? jp || en : en;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
        {title}
      </h3>
      {children}
    </section>
  );
}

const trendStyles: Record<string, string> = {
  new: 'bg-accent-teal/10 text-accent-teal',
  persistent: 'bg-amber-500/10 text-amber-600',
  improving: 'bg-emerald-500/10 text-emerald-600',
};

export function SessionReportView({
  report,
  locale,
}: {
  report: StudentReport;
  locale: Loc;
}) {
  const L = LABELS[locale];
  const jp = locale === 'ja';
  // Slightly looser leading for JP body per the JP typography rules.
  const bodyLeading = jp ? 'leading-[1.8]' : 'leading-relaxed';

  return (
    <div className="space-y-8">
      {/* Snapshot */}
      <Section title={L.snapshot}>
        <p className={`text-[15px] text-fg-primary ${bodyLeading}`}>
          {pick(report.snapshot.summary_en, report.snapshot.summary_jp, locale)}
        </p>
      </Section>

      {/* Wins */}
      <Section title={L.wins}>
        <ul className="space-y-2">
          {report.wins.map((w, i) => (
            <li
              key={i}
              className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3"
            >
              <p className={`text-[15px] text-fg-primary ${bodyLeading}`}>
                {pick(w.win_en, w.win_jp, locale)}
              </p>
              {w.quote && (
                <p className="mt-1 text-[13px] italic text-fg-tertiary">“{w.quote}”</p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Trouble spots */}
      <Section title={L.trouble}>
        <ul className="space-y-3">
          {report.trouble_spots.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-border-default bg-bg-secondary p-4"
            >
              <span className="mb-2 inline-flex items-center rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] font-medium text-fg-tertiary">
                {pick(t.pattern_label_en, t.pattern_label_jp, locale)}
              </span>
              <div className="space-y-1.5">
                <p className="text-[14px] text-fg-tertiary">
                  <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                    {L.youSaid}
                  </span>
                  <span className="line-through decoration-red-400/60">{t.quote}</span>
                </p>
                <p className="text-[15px] font-medium text-fg-primary">
                  <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-teal">
                    {L.tryThis}
                  </span>
                  {t.correction}
                </p>
                <p className={`text-[14px] text-fg-secondary ${bodyLeading}`}>
                  {pick(t.explanation_en, t.explanation_jp, locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Recurring patterns */}
      {report.recurring_patterns.length > 0 && (
        <Section title={L.recurring}>
          <ul className="space-y-2">
            {report.recurring_patterns.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    trendStyles[p.trend] ?? 'bg-bg-tertiary text-fg-tertiary'
                  }`}
                >
                  {p.trend === 'new' ? L.trendNew : p.trend === 'improving' ? L.trendImproving : L.trendPersistent}
                </span>
                <p className={`text-[14px] text-fg-secondary ${bodyLeading}`}>
                  {pick(p.note_en, p.note_jp, locale)}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Study areas */}
      {report.study_areas.length > 0 && (
        <Section title={L.study}>
          <ul className="space-y-2">
            {report.study_areas.map((s, i) => (
              <li key={i} className="rounded-lg border border-border-default px-4 py-3">
                <p className="text-[15px] font-medium text-fg-primary">
                  {pick(s.area_en, s.area_jp, locale)}
                </p>
                <p className={`text-[13px] text-fg-tertiary ${bodyLeading}`}>
                  {pick(s.why_en, s.why_jp, locale)}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Vocabulary */}
      {report.vocabulary.length > 0 && (
        <Section title={L.vocab}>
          <ul className="divide-y divide-border-default rounded-lg border border-border-default">
            {report.vocabulary.map((v) => (
              <li key={v.id} className="px-4 py-3">
                <p className="text-[15px] text-fg-primary">
                  <span className="font-semibold">{v.term_en}</span>
                  {v.reading_en && (
                    <span className="ml-2 text-[13px] text-fg-tertiary">{v.reading_en}</span>
                  )}
                  <span className="ml-2 text-fg-secondary">— {v.term_jp}</span>
                </p>
                <p className={`text-[13px] text-fg-tertiary ${bodyLeading}`}>
                  {pick(v.example_en, v.example_jp, locale)}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Grammar points */}
      {report.grammar_points.length > 0 && (
        <Section title={L.grammar}>
          <ul className="space-y-3">
            {report.grammar_points.map((g) => (
              <li key={g.id} className="rounded-lg border border-border-default bg-bg-secondary p-4">
                <p className="text-[15px] font-medium text-fg-primary">
                  {pick(g.title_en, g.title_jp, locale)}
                </p>
                <p className="mt-0.5 font-mono text-[12px] text-accent-teal">{g.pattern}</p>
                <p className={`mt-1 text-[14px] text-fg-secondary ${bodyLeading}`}>
                  {pick(g.explanation_en, g.explanation_jp, locale)}
                </p>
                <ul className="mt-2 space-y-1">
                  {g.examples.map((ex, i) => (
                    <li key={i} className="text-[13px] text-fg-tertiary">
                      <span className="text-fg-secondary">{ex.sentence_en}</span>
                      <span className="mx-1">·</span>
                      {ex.sentence_jp}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Homework (no answer keys in the student payload) */}
      <Section title={L.homework}>
        <ol className="space-y-2">
          {report.homework.map((h, i) => (
            <li key={h.id} className="flex gap-3 rounded-lg border border-border-default px-4 py-3">
              <span className="text-[13px] font-semibold text-accent-teal">{i + 1}.</span>
              <p className={`text-[15px] text-fg-primary ${bodyLeading}`}>
                {pick(h.task_en, h.task_jp, locale)}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Next session */}
      <Section title={L.next}>
        <p className={`rounded-lg bg-accent-teal/8 px-4 py-3 text-[15px] text-fg-primary ${bodyLeading}`}>
          {pick(report.next_session_focus.focus_en, report.next_session_focus.focus_jp, locale)}
        </p>
      </Section>
    </div>
  );
}
