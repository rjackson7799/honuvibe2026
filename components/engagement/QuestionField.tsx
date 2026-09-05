'use client';

// One question: text (short input / long textarea), single (radios), multi
// (checkboxes with max_select), each with the reserved "Other" choice when
// allow_other is set (the `__other` sentinel + a free-text box). Visual
// language copied from components/survey/SurveyForm.tsx. Inputs are ≥16 px
// (no iOS zoom) and every target is ≥44 px. Saves: choice at 0 ms via
// setAnswer, text debounced by the provider, blur flushes.

import { OTHER_VALUE, OTHER_TEXT_MAX, textCapFor, type EngagementQuestion } from '@/lib/studio/engagement/questions-schema';
import { useQuestionnaire } from './QuestionnaireProvider';

const optionBase =
  'flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 min-h-[44px] py-2.5 text-[16px] transition-colors';
const optionOn = 'border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.06)]';
const optionOff = 'border-[var(--m-border-strong)] hover:border-[var(--m-accent-teal)]';
const inputCls =
  'w-full rounded-[10px] border border-[var(--m-border-strong)] bg-[var(--m-white)] px-3.5 py-2.5 text-[16px] text-[var(--m-ink-primary)] focus:border-[var(--m-accent-teal)] focus:outline-none disabled:opacity-70';

export function QuestionField({ question: q, index }: { question: EngagementQuestion; index: number }) {
  const { answers, setAnswer, flush, t, missing, submitted, saves } = useQuestionnaire();
  const a = answers[q.id] ?? { value: q.qtype === 'multi' ? [] : '', other: '' };
  const isMissing = !!missing[q.id];
  const failed = saves[q.id]?.status === 'failed';
  const disabled = submitted;
  const id = `q-${q.id}`;

  function onBlur() {
    void flush();
  }

  const header = (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <span className="mt-[3px] text-[12px] font-bold tabular-nums text-[var(--m-ink-secondary)]">{index}.</span>
        <span className="text-[16px] font-semibold leading-snug text-[var(--m-ink-primary)]">
          {q.prompt}
          {q.required ? (
            <span className="ml-1.5 align-middle text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--m-accent-coral)]">
              {t.required}
            </span>
          ) : null}
        </span>
      </div>
      {q.help ? <p className="pl-5 text-[13.5px] leading-relaxed text-[var(--m-ink-secondary)]">{q.help}</p> : null}
    </div>
  );

  if (q.qtype === 'text') {
    const cap = textCapFor(q);
    const value = typeof a.value === 'string' ? a.value : '';
    const left = cap - value.length;
    return (
      <div id={id} data-question={q.id} className="space-y-2.5 scroll-mt-24">
        <label htmlFor={`${id}-input`} className="block">
          {header}
        </label>
        <div className="pl-5">
          {q.long ? (
            <textarea
              id={`${id}-input`}
              value={value}
              onChange={(e) => setAnswer(q, e.target.value)}
              onBlur={onBlur}
              maxLength={cap}
              rows={5}
              disabled={disabled}
              aria-invalid={isMissing || undefined}
              className={inputCls}
            />
          ) : (
            <input
              id={`${id}-input`}
              type="text"
              value={value}
              onChange={(e) => setAnswer(q, e.target.value)}
              onBlur={onBlur}
              maxLength={cap}
              disabled={disabled}
              aria-invalid={isMissing || undefined}
              className={inputCls}
            />
          )}
          {left <= Math.ceil(cap * 0.2) && !disabled ? (
            <p className="mt-1 text-[12px] text-[var(--m-ink-secondary)]">{t.charsLeft(left)}</p>
          ) : null}
          <FieldStatus missing={isMissing} failed={failed} />
        </div>
      </div>
    );
  }

  const selectedValues: string[] = q.qtype === 'single' ? (typeof a.value === 'string' && a.value ? [a.value] : []) : Array.isArray(a.value) ? a.value : [];
  const otherSelected = selectedValues.includes(OTHER_VALUE);
  const atMax = q.qtype === 'multi' && q.max_select !== null && selectedValues.length >= q.max_select;

  function choose(value: string) {
    if (disabled) return;
    if (q.qtype === 'single') {
      const other = value === OTHER_VALUE ? a.other : '';
      setAnswer(q, value, other);
      return;
    }
    const cur = selectedValues;
    if (cur.includes(value)) {
      const next = cur.filter((v) => v !== value);
      setAnswer(q, next, next.includes(OTHER_VALUE) ? a.other : '');
    } else {
      if (atMax) return;
      setAnswer(q, [...cur, value], a.other);
    }
  }

  return (
    <fieldset id={id} data-question={q.id} className="space-y-2.5 scroll-mt-24" aria-invalid={isMissing || undefined}>
      <legend className="w-full">{header}</legend>
      <div className="space-y-2 pl-5">
        {[...q.options, ...(q.allow_other ? [{ value: OTHER_VALUE, label: t.other }] : [])].map((o) => {
          const on = selectedValues.includes(o.value);
          const blocked = !on && atMax;
          return (
            <label key={o.value} className={`${optionBase} ${on ? optionOn : optionOff} ${blocked || disabled ? 'opacity-60' : ''}`}>
              <input
                type={q.qtype === 'single' ? 'radio' : 'checkbox'}
                name={q.id}
                value={o.value}
                checked={on}
                disabled={disabled || blocked}
                onChange={() => choose(o.value)}
                className="h-4 w-4 accent-[var(--m-accent-teal)]"
              />
              <span className="text-[var(--m-ink-primary)]">{o.label}</span>
            </label>
          );
        })}
        {q.qtype === 'multi' && q.max_select ? (
          <p className="text-[12px] text-[var(--m-ink-secondary)]">{t.chooseUpTo(q.max_select)}</p>
        ) : null}
        {q.allow_other && otherSelected ? (
          <input
            type="text"
            value={a.other}
            onChange={(e) => setAnswer(q, a.value, e.target.value)}
            onBlur={onBlur}
            maxLength={OTHER_TEXT_MAX}
            placeholder={t.otherPlaceholder}
            disabled={disabled}
            aria-label={t.other}
            className={inputCls}
          />
        ) : null}
        <FieldStatus missing={isMissing} failed={failed} />
      </div>
    </fieldset>
  );
}

function FieldStatus({ missing, failed }: { missing: boolean; failed: boolean }) {
  const { t, retryFailed } = useQuestionnaire();
  if (missing) return <p className="text-[13px] font-medium text-[var(--m-accent-coral)]">{t.requiredMissing}</p>;
  if (failed) {
    return (
      <button type="button" onClick={retryFailed} className="text-[13px] font-semibold text-[var(--m-accent-coral)] underline min-h-[44px]">
        {t.unsaved}
      </button>
    );
  }
  return null;
}
