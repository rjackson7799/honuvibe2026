'use client';

import { useEffect, useRef, useState } from 'react';
import { useFlow } from './DiscoverFlowProvider';
import {
  resolveSubtext,
  DECIDE_SENTINEL,
  EXPLORE_SENTINEL,
  type QuestionDef,
} from '@/lib/questions';

// Renders a single question by type, reading/writing through the flow provider.
// All specialized inputs live here so they share the chip/escape conventions.

export function QuestionCard({ q }: { q: QuestionDef }) {
  const { answers, setAnswer } = useFlow();
  const value = answers[q.capturesField];
  const subtext = resolveSubtext(q, null); // context_brief is empty this slice

  return (
    <section className="dsc-q" aria-labelledby={`${q.id}-head`}>
      <h2 id={`${q.id}-head`} className="dsc-q__head">
        {q.headline}
      </h2>
      <p className="dsc-q__sub">{subtext}</p>
      <QuestionBody q={q} value={value} setAnswer={setAnswer} />
    </section>
  );
}

type SetAnswer = (q: QuestionDef, value: unknown, decide?: boolean) => void;

function QuestionBody({
  q,
  value,
  setAnswer,
}: {
  q: QuestionDef;
  value: unknown;
  setAnswer: SetAnswer;
}) {
  switch (q.type) {
    case 'single':
      return <SingleChips q={q} value={value} setAnswer={setAnswer} />;
    case 'multi':
      return <MultiChips q={q} value={value} setAnswer={setAnswer} />;
    case 'feature-groups':
      return <FeatureGroups q={q} value={value} setAnswer={setAnswer} />;
    case 'page-selector':
      return <PageSelector q={q} value={value} setAnswer={setAnswer} />;
    case 'text':
    case 'text-chips':
      return <TextField q={q} value={value} setAnswer={setAnswer} />;
    case 'repeatable-url':
      return <RepeatableUrl q={q} value={value} setAnswer={setAnswer} />;
    case 'multi-entry':
      return <MultiEntry q={q} value={value} setAnswer={setAnswer} />;
    case 'real-details':
      return <RealDetails q={q} value={value} setAnswer={setAnswer} />;
    default:
      return null;
  }
}

// ── Escape chips (Explore / Decide / Other) ──────────────────────────────────

function EscapeRow({
  q,
  value,
  setAnswer,
  otherActive,
  onOther,
}: {
  q: QuestionDef;
  value: unknown;
  setAnswer: SetAnswer;
  otherActive: boolean;
  onOther: () => void;
}) {
  if (!q.allowExplore && !q.decideForMe && !q.allowOther) return null;
  return (
    <div className="dsc-chips dsc-chips--esc">
      {q.allowExplore && (
        <button
          type="button"
          className="dsc-chip dsc-chip--esc"
          data-selected={value === EXPLORE_SENTINEL}
          onClick={() => setAnswer(q, EXPLORE_SENTINEL)}
        >
          Explore a few options
        </button>
      )}
      {q.decideForMe && (
        <button
          type="button"
          className="dsc-chip dsc-chip--esc"
          data-selected={value === DECIDE_SENTINEL}
          onClick={() => setAnswer(q, DECIDE_SENTINEL, true)}
        >
          Decide for me
        </button>
      )}
      {q.allowOther && (
        <button
          type="button"
          className="dsc-chip dsc-chip--esc"
          data-selected={otherActive}
          onClick={onOther}
        >
          Other…
        </button>
      )}
    </div>
  );
}

// ── Single-select ────────────────────────────────────────────────────────────

function SingleChips({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const v = typeof value === 'string' ? value : '';
  const optionValues = new Set((q.options ?? []).map((o) => o.value));
  const isSentinel = v === DECIDE_SENTINEL || v === EXPLORE_SENTINEL;
  const otherActiveInitial = v !== '' && !optionValues.has(v) && !isSentinel;
  const [showOther, setShowOther] = useState(otherActiveInitial);

  return (
    <>
      <div className="dsc-chips">
        {(q.options ?? []).map((o) => (
          <button
            key={o.value}
            type="button"
            className="dsc-chip"
            aria-pressed={v === o.value}
            onClick={() => {
              setShowOther(false);
              setAnswer(q, o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <EscapeRow
        q={q}
        value={value}
        setAnswer={setAnswer}
        otherActive={showOther || otherActiveInitial}
        onOther={() => setShowOther(true)}
      />
      {(showOther || otherActiveInitial) && (
        <input
          className="dsc-input"
          style={{ marginTop: 12, maxWidth: 420 }}
          placeholder="Tell us in your words…"
          defaultValue={otherActiveInitial ? v : ''}
          onChange={(e) => setAnswer(q, e.target.value)}
        />
      )}
    </>
  );
}

// ── Multi-select ─────────────────────────────────────────────────────────────

function MultiChips({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const isSentinel = value === DECIDE_SENTINEL || value === EXPLORE_SENTINEL;
  const [showOther, setShowOther] = useState(false);

  const toggle = (val: string) => {
    const base = isSentinel ? [] : arr;
    const next = base.includes(val) ? base.filter((x) => x !== val) : [...base, val];
    setAnswer(q, next);
  };

  return (
    <>
      <div className="dsc-chips">
        {(q.options ?? []).map((o) => (
          <button
            key={o.value}
            type="button"
            className="dsc-chip"
            aria-pressed={!isSentinel && arr.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <EscapeRow
        q={q}
        value={value}
        setAnswer={setAnswer}
        otherActive={showOther}
        onOther={() => setShowOther((s) => !s)}
      />
      {showOther && (
        <input
          className="dsc-input"
          style={{ marginTop: 12, maxWidth: 420 }}
          placeholder="Add your own…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const t = (e.target as HTMLInputElement).value.trim();
              if (t) {
                const base = isSentinel ? [] : arr;
                if (!base.includes(t)) setAnswer(q, [...base, t]);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
      )}
    </>
  );
}

// ── Feature groups ───────────────────────────────────────────────────────────

function FeatureGroups({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (val: string) =>
    setAnswer(q, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {(q.groups ?? []).map((g) => (
          <div key={g.key}>
            <p className="dsc-overline" style={{ marginBottom: 10 }}>
              {g.label}
            </p>
            <div className="dsc-chips">
              {g.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className="dsc-chip"
                  aria-pressed={arr.includes(o.value)}
                  onClick={() => toggle(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <EscapeRow q={q} value={value} setAnswer={setAnswer} otherActive={false} onOther={() => {}} />
    </>
  );
}

// ── Page selector (with industry pre-check + live count) ─────────────────────

function PageSelector({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const { intake, pricing } = useFlow();
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const initialized = useRef(false);

  // Pre-check pages for the prospect's industry on first entry.
  useEffect(() => {
    if (initialized.current) return;
    if (value === undefined && q.precheckByIndustry) {
      const industry = intake.industry ?? 'other';
      const pre = q.precheckByIndustry[industry] ?? q.precheckByIndustry.other ?? [];
      if (pre.length) {
        initialized.current = true;
        setAnswer(q, pre);
      }
    }
  }, [value, q, intake.industry, setAnswer]);

  const toggle = (val: string) =>
    setAnswer(q, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  return (
    <>
      <div className="dsc-chips">
        {(q.options ?? []).map((o) => (
          <button
            key={o.value}
            type="button"
            className="dsc-chip"
            aria-pressed={arr.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="dsc-q__sub" style={{ marginTop: 14, marginBottom: 0 }}>
        {arr.length} {arr.length === 1 ? 'page' : 'pages'} selected
        {pricing.recommendUpgrade ? ' — a site this size may fit Studio Pro; we’ll confirm after review.' : ''}
      </p>
    </>
  );
}

// ── Plain text / text-with-chips ─────────────────────────────────────────────

function TextField({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const v = typeof value === 'string' ? value : '';
  return (
    <textarea
      className="dsc-textarea"
      defaultValue={v}
      placeholder="Type your answer…"
      onChange={(e) => setAnswer(q, e.target.value)}
    />
  );
}

// ── Repeatable URL + note (Q7, Q13) ──────────────────────────────────────────

interface UrlRow {
  url: string;
  note: string;
}

function RepeatableUrl({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const rows: UrlRow[] = Array.isArray(value) ? (value as UrlRow[]) : [{ url: '', note: '' }];
  const max = q.max ?? 3;

  const update = (i: number, patch: Partial<UrlRow>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setAnswer(q, next);
  };
  const add = () => setAnswer(q, [...rows, { url: '', note: '' }]);
  const remove = (i: number) => setAnswer(q, rows.filter((_, idx) => idx !== i));

  return (
    <div className="dsc-rowset">
      {rows.map((r, i) => (
        <div className="dsc-row" key={i}>
          <input
            className="dsc-input"
            type="url"
            placeholder="https://"
            defaultValue={r.url}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <input
            className="dsc-input"
            placeholder="What you like / why"
            defaultValue={r.note}
            onChange={(e) => update(i, { note: e.target.value })}
          />
          {rows.length > 1 && (
            <button type="button" className="dsc-row__remove" aria-label="Remove" onClick={() => remove(i)}>
              ×
            </button>
          )}
        </div>
      ))}
      {rows.length < max && (
        <button type="button" className="dsc-add" onClick={add}>
          + Add another
        </button>
      )}
    </div>
  );
}

// ── Dynamic multi-entry offerings (Q10) ──────────────────────────────────────

interface EntryRow {
  name: string;
  desc: string;
}

function MultiEntry({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const rows: EntryRow[] = Array.isArray(value) ? (value as EntryRow[]) : [{ name: '', desc: '' }];
  const max = q.max ?? 12;

  const update = (i: number, patch: Partial<EntryRow>) =>
    setAnswer(q, rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => setAnswer(q, [...rows, { name: '', desc: '' }]);
  const remove = (i: number) => setAnswer(q, rows.filter((_, idx) => idx !== i));

  return (
    <div className="dsc-rowset">
      {rows.map((r, i) => (
        <div className="dsc-row" key={i}>
          <input
            className="dsc-input"
            placeholder="Service or product"
            defaultValue={r.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <input
            className="dsc-input"
            placeholder="One-line description"
            defaultValue={r.desc}
            onChange={(e) => update(i, { desc: e.target.value })}
          />
          {rows.length > 1 && (
            <button type="button" className="dsc-row__remove" aria-label="Remove" onClick={() => remove(i)}>
              ×
            </button>
          )}
        </div>
      ))}
      {rows.length < max && (
        <button type="button" className="dsc-add" onClick={add}>
          + Add another
        </button>
      )}
    </div>
  );
}

// ── Real details + timeline (Q15) ────────────────────────────────────────────

interface RealDetailsValue {
  details: string;
  timeline: string;
}

const TIMELINE_CHIPS = [
  { value: 'asap', label: 'ASAP' },
  { value: '2_3_weeks', label: '2–3 weeks' },
  { value: 'within_month', label: 'Within a month' },
  { value: 'no_rush', label: 'No rush' },
];

function RealDetails({ q, value, setAnswer }: { q: QuestionDef; value: unknown; setAnswer: SetAnswer }) {
  const v = (value as RealDetailsValue) ?? { details: '', timeline: '' };
  return (
    <>
      <textarea
        className="dsc-textarea"
        defaultValue={v.details}
        placeholder="Tagline, hours, email, phone, or anything else — or leave blank for placeholders."
        onChange={(e) => setAnswer(q, { ...v, details: e.target.value })}
      />
      <p className="dsc-label" style={{ marginTop: 18 }}>
        How soon do you need this?
      </p>
      <div className="dsc-chips">
        {TIMELINE_CHIPS.map((t) => (
          <button
            key={t.value}
            type="button"
            className="dsc-chip"
            aria-pressed={v.timeline === t.value}
            onClick={() => setAnswer(q, { ...v, timeline: t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}
