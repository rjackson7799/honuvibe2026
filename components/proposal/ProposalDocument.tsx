// The proposal DOCUMENT in HTML — a SERVER component (the precedent is
// EngagementAnswersView: untrusted text rendered server-side as text nodes).
// Takes ONLY the ProposalDocModel (a narrow projection of issued_snapshot)
// plus nothing else — no engagement, lead or brief fields can reach it.
// Mirrors generate-proposal-pdf.ts exactly: header lockup (wordmark + the
// client's business), cover, the seven sections in order with the
// investment table inside "Investment" and the performance table inside
// "Terms", the provisional footnote, the confidentiality footer. Bodies go
// through ProposalBlocks (the parity renderer — never CommunityMarkdown).
//
// ProposalShell is the chromeless page surface (`data-shell="marketing"
// learn-zone`, own wordmark, the JP typography rule on an INNER wrapper —
// see QuestionnaireApp.tsx for why it cannot sit on the data-shell node).

import type { ReactNode } from 'react';
import { ProposalBlocks } from './ProposalBlocks';
import { JP_TEXT_CLASS } from './copy';
import type { ProposalDocModel } from '@/lib/studio/engagement/proposal-document';

export function Wordmark() {
  return (
    <span className="text-[17px] font-semibold tracking-tight text-[var(--m-ink-primary)]">
      HonuVibe<span className="text-[var(--m-accent-teal)]">.AI</span>
      <span className="ml-1.5 text-[12px] font-medium text-[var(--m-ink-secondary)]">Studio</span>
    </span>
  );
}

export function ProposalShell({
  locale,
  header,
  children,
}: {
  locale: 'en' | 'ja';
  header: ReactNode;
  children: ReactNode;
}) {
  const isJa = locale === 'ja';
  return (
    <div data-shell="marketing" className="learn-zone min-h-screen" style={{ backgroundColor: 'var(--m-canvas)' }}>
      <div lang={locale} className={isJa ? JP_TEXT_CLASS : ''}>
        <header className="sticky top-0 z-20 border-b border-[var(--m-border-soft)] bg-[var(--m-canvas)]/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[880px] items-center justify-between gap-3 px-5 py-3 sm:px-6">{header}</div>
        </header>
        <main className="mx-auto w-full max-w-[880px] px-5 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function InvestmentTable({ model }: { model: ProposalDocModel }) {
  const { investment, labels } = model;
  const th = 'px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--m-ink-secondary)]';
  const td = 'px-3 py-2.5 align-top text-[14px] text-[var(--m-ink-primary)]';
  const money = `${td} whitespace-nowrap text-right tabular-nums`;
  return (
    <div className="my-4 overflow-x-auto rounded-[12px] border border-[var(--m-border-soft)]" data-investment-table>
      <table className="w-full min-w-[520px] border-collapse">
        <thead className="bg-[rgba(15,169,160,0.06)]">
          <tr>
            <th scope="col" className={`${th} text-left`}>{labels.item}</th>
            <th scope="col" className={`${th} text-right`}>{labels.build}</th>
            <th scope="col" className={`${th} text-right`}>{labels.monthly}</th>
          </tr>
        </thead>
        <tbody>
          {investment.rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--m-border-soft)]" data-row-kind={r.kind}>
              <td className={td}>
                <span className="font-medium">{r.label}</span>
                {r.value ? <span className="block text-[12.5px] leading-[1.5] text-[var(--m-ink-secondary)]">{r.value}</span> : null}
              </td>
              <td className={money}>{r.build}</td>
              <td className={money}>{r.monthly}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[var(--m-ink-primary)]/20 bg-[rgba(15,169,160,0.06)] font-bold">
            <td className={td}>
              {labels.total_build} · {labels.total_monthly}
            </td>
            <td className={money}>{investment.total_build}</td>
            <td className={money}>{investment.total_monthly}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PerformanceTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="my-4 grid grid-cols-1 gap-x-6 gap-y-2 rounded-[12px] border border-[var(--m-border-soft)] p-4 sm:grid-cols-[minmax(0,180px)_1fr]">
      {rows.map((r, i) => (
        <div key={i} className="contents">
          <dt className="text-[12.5px] font-semibold text-[var(--m-ink-secondary)]">{r.label}</dt>
          <dd className="text-[14px] leading-[1.7] text-[var(--m-ink-primary)]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProposalDocument({ model }: { model: ProposalDocModel }) {
  const { cover, investment } = model;
  const blocksClass =
    'space-y-3 text-[15px] leading-[1.7] text-[var(--m-ink-primary)] [&_h3]:mt-5 [&_h3]:text-[17px] [&_h3]:font-bold [&_h4]:mt-4 [&_h4]:text-[15px] [&_h4]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:font-semibold';

  return (
    <article className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-md)]" data-proposal-document>
      {model.watermark ? (
        <div className="rounded-t-[18px] bg-[rgba(232,118,90,0.12)] px-6 py-2 text-center text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--m-accent-coral)]">{cover.preview_band}</div>
      ) : null}
      <div className="border-b border-[var(--m-border-soft)] px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Wordmark />
          <span className="text-[15px] font-semibold tracking-tight text-[var(--m-ink-primary)]">{cover.business_name}</span>
        </div>
        <h1 className="mt-6 text-[clamp(24px,4vw,34px)] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--m-ink-primary)]">{cover.title}</h1>
        <p className="mt-2 text-[13.5px] text-[var(--m-ink-secondary)]">
          {cover.proposal_line} · {cover.issued_line}
        </p>
        <p className="mt-1 text-[15px] font-medium text-[var(--m-ink-primary)]">{cover.prepared_for_line}</p>
        {cover.valid_until_line ? <p className="mt-1 text-[13.5px] text-[var(--m-ink-secondary)]" data-valid-until>{cover.valid_until_line}</p> : null}
      </div>

      <div className="space-y-9 px-6 py-7 sm:px-10 sm:py-9">
        {model.sections.map((sec) => (
          <section key={sec.key} data-section={sec.key}>
            <h2 className="mb-3 text-[clamp(19px,2.6vw,23px)] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
              {sec.title}
              {sec.mark ? <span className="ml-1 text-[var(--m-accent-coral)]">{sec.mark}</span> : null}
            </h2>
            {sec.key === 'investment_notes' ? (
              <>
                <InvestmentTable model={model} />
                {investment.usd_reference ? <p className="mb-3 text-[12.5px] text-[var(--m-ink-secondary)]">{investment.usd_reference}</p> : null}
              </>
            ) : null}
            {sec.key === 'terms' && investment.performance ? <PerformanceTable rows={investment.performance} /> : null}
            <ProposalBlocks blocks={sec.blocks} className={blocksClass} />
          </section>
        ))}
        {model.footnote ? <p className="text-[12.5px] leading-[1.6] text-[var(--m-ink-secondary)]">{model.footnote}</p> : null}
      </div>

      <footer className="border-t border-[var(--m-border-soft)] px-6 py-4 text-[12px] text-[var(--m-ink-secondary)] sm:px-10">{model.footer}</footer>
    </article>
  );
}
