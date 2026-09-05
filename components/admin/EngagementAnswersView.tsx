// The client's answers, section-grouped, rendered from the PINNED snapshot via
// renderSnapshot — choice answers show the option label the client actually
// saw, never a live join against the current manifest. Free text is
// client-authored, therefore untrusted: it renders through CommunityMarkdown
// (react-markdown + rehype-sanitize), never dangerouslySetInnerHTML. Server
// component: no state, no handlers.

import { CommunityMarkdown } from '@/lib/community/markdown';
import { renderSnapshot } from '@/lib/studio/engagement/validate-answers';
import { formatDateTime } from '@/lib/studio/engagement/format';
import { OTHER_VALUE, type AnswerSnapshot } from '@/lib/studio/engagement/questions-schema';

export function EngagementAnswersView({
  snapshot,
  submittedAt,
  status,
}: {
  snapshot: AnswerSnapshot;
  submittedAt: string | null;
  /** The live questionnaire status — a reopened questionnaire shows the snapshot as "last submitted". */
  status: string;
}) {
  const rendered = renderSnapshot(snapshot);
  const total = rendered.sections.reduce((n, s) => n + s.items.length, 0);
  const answered = rendered.sections.reduce((n, s) => n + s.items.filter((i) => i.answered).length, 0);

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Client answers</h2>
        <span className="text-[12px] text-fg-tertiary">
          {answered} of {total} answered · v{rendered.questions_version} · {rendered.locale === 'ja' ? 'Japanese' : 'English'}
          {submittedAt ? ` · submitted ${formatDateTime(submittedAt)}` : ''}
        </span>
      </div>
      {status !== 'submitted' && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-700">
          The questionnaire is open again — these are the answers as last submitted. A resubmit replaces them.
        </p>
      )}

      {rendered.sections.map((s) => (
        <div key={s.key} className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary border-b border-border-default pb-1">
            {s.key === '_unsectioned' ? 'Other questions' : s.title}
          </h3>
          <dl className="space-y-3">
            {s.items.map((item) => (
              <div key={item.question_id} className="grid gap-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                <dt className="text-[13px] font-medium text-fg-primary">
                  {item.prompt}
                  {item.required && <span className="ml-1 text-[color:var(--accent-coral)]">*</span>}
                </dt>
                <dd className="text-[13px] text-fg-secondary">
                  {!item.answered ? (
                    <span className="text-fg-tertiary">—</span>
                  ) : item.qtype === 'text' ? (
                    <div className="[&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[color:var(--accent-teal)] [&_a]:underline whitespace-pre-wrap">
                      <CommunityMarkdown body={item.text ?? ''} />
                    </div>
                  ) : (
                    <ul className="space-y-0.5">
                      {item.selected.map((sel) => (
                        <li key={sel.value} className="flex items-start gap-1.5">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent-teal)]" aria-hidden />
                          <span>
                            {sel.label}
                            {sel.value === OTHER_VALUE && item.other_text ? <span className="text-fg-primary">: {item.other_text}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
