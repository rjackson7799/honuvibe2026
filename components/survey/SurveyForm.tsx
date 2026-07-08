'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { EventSurveyQuestion } from '@/lib/survey/event-surveys';

type Answers = Record<string, string | string[]>;

type Props = {
  /** Endpoint that accepts { token, locale, answers, company_url }. */
  submitUrl: string;
  token: string;
  locale: 'en' | 'ja';
  questions: EventSurveyQuestion[];
  existingAnswers: Answers | null;
};

const T = {
  en: {
    submit: 'Submit',
    submitting: 'Submitting…',
    update: 'Update my answers',
    required: 'This question is required.',
    pickAtLeastOne: 'Please choose at least one.',
    tooMany: (n: number) => `Choose up to ${n}.`,
    networkError: 'Something went wrong. Please try again.',
    successTitle: 'Thank you!',
    successBody: 'Your answers help tailor the session to the group. See you there!',
    alreadyNote: "You've already responded — you can update your answers below until the survey closes.",
  },
  ja: {
    submit: '送信する',
    submitting: '送信中…',
    update: '回答を更新する',
    required: 'この質問は必須です。',
    pickAtLeastOne: '1つ以上選択してください。',
    tooMany: (n: number) => `最大${n}つまで選択できます。`,
    networkError: '問題が発生しました。もう一度お試しください。',
    successTitle: 'ありがとうございます！',
    successBody: 'いただいた回答をもとに、内容をあなたに合わせて準備します。当日お会いしましょう！',
    alreadyNote: 'すでにご回答いただいています。締め切りまでは下記から回答を更新できます。',
  },
} as const;

function emptyAnswer(q: EventSurveyQuestion): string | string[] {
  return q.qtype === 'multi' ? [] : '';
}

export function SurveyForm({ submitUrl, token, locale, questions, existingAnswers }: Props) {
  const t = T[locale];
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const q of questions) init[q.id] = existingAnswers?.[q.id] ?? emptyAnswer(q);
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const prompt = (q: EventSurveyQuestion) => (locale === 'ja' ? q.promptJp : q.promptEn);
  const help = (q: EventSurveyQuestion) => (locale === 'ja' ? q.helpJp : q.helpEn);
  const optLabel = (o: { labelEn: string; labelJp: string }) =>
    locale === 'ja' ? o.labelJp : o.labelEn;

  function setOne(id: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
  }

  function toggleMulti(q: EventSurveyQuestion, value: string) {
    const cur = (answers[q.id] as string[]) ?? [];
    if (cur.includes(value)) {
      setOne(q.id, cur.filter((v) => v !== value));
    } else {
      if (q.maxSelect && cur.length >= q.maxSelect) return;
      setOne(q.id, [...cur, value]);
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const q of questions) {
      const v = answers[q.id];
      if (q.qtype === 'multi') {
        const arr = (v as string[]) ?? [];
        if (q.required && arr.length === 0) next[q.id] = t.pickAtLeastOne;
        else if (q.maxSelect && arr.length > q.maxSelect) next[q.id] = t.tooMany(q.maxSelect);
      } else {
        const s = ((v as string) ?? '').trim();
        if (q.required && !s) next[q.id] = t.required;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      document.querySelector('[data-q-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, locale, answers, company_url: '' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error === 'closed' ? t.networkError : json.error || t.networkError);
        setStatus('error');
      } else {
        setStatus('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setMessage(t.networkError);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 text-center shadow-[var(--m-shadow-md)]">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(15,169,160,0.1)' }}
        >
          <CheckCircle2 size={28} strokeWidth={2} style={{ color: 'var(--m-accent-teal)' }} />
        </div>
        <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
          {t.successTitle}
        </h1>
        <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">{t.successBody}</p>
      </div>
    );
  }

  const submitLabel = existingAnswers ? t.update : t.submit;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {existingAnswers && (
        <p className="rounded-[12px] bg-[rgba(15,169,160,0.08)] px-4 py-3 text-[13px] text-[var(--m-ink-secondary)]">
          {t.alreadyNote}
        </p>
      )}

      {questions.map((q) => (
        <fieldset key={q.id} {...(errors[q.id] ? { 'data-q-error': '' } : {})} className="space-y-2.5">
          <legend className="text-[15px] font-semibold text-[var(--m-ink-primary)]">
            {prompt(q)}
            {q.required && <span className="ml-1 text-[var(--m-accent-coral)]">*</span>}
          </legend>
          {help(q) && <p className="text-[13px] text-[var(--m-ink-secondary)]">{help(q)}</p>}

          {q.qtype === 'text' ? (
            <textarea
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setOne(q.id, e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-[10px] border border-[var(--m-border-strong)] bg-[var(--m-white)] px-3.5 py-2.5 text-[15px] text-[var(--m-ink-primary)] focus:border-[var(--m-accent-teal)] focus:outline-none"
            />
          ) : (
            <div className="space-y-2">
              {q.options.map((o) => {
                const selected =
                  q.qtype === 'single'
                    ? answers[q.id] === o.value
                    : ((answers[q.id] as string[]) ?? []).includes(o.value);
                const atMax =
                  q.qtype === 'multi' &&
                  !selected &&
                  !!q.maxSelect &&
                  ((answers[q.id] as string[]) ?? []).length >= q.maxSelect;
                return (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-[15px] transition-colors ${
                      selected
                        ? 'border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.06)]'
                        : 'border-[var(--m-border-strong)] hover:border-[var(--m-accent-teal)]'
                    } ${atMax ? 'opacity-50' : ''}`}
                  >
                    <input
                      type={q.qtype === 'single' ? 'radio' : 'checkbox'}
                      name={q.id}
                      checked={selected}
                      disabled={atMax}
                      onChange={() =>
                        q.qtype === 'single' ? setOne(q.id, o.value) : toggleMulti(q, o.value)
                      }
                      className="accent-[var(--m-accent-teal)]"
                    />
                    <span className="text-[var(--m-ink-primary)]">{optLabel(o)}</span>
                  </label>
                );
              })}
              {q.qtype === 'multi' && q.maxSelect && (
                <p className="text-[12px] text-[var(--m-ink-secondary)]">{t.tooMany(q.maxSelect)}</p>
              )}
            </div>
          )}

          {errors[q.id] && <p className="text-[13px] text-[var(--m-accent-coral)]">{errors[q.id]}</p>}
        </fieldset>
      ))}

      {status === 'error' && <p className="text-[13px] text-[var(--m-accent-coral)]">{message}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-[10px] bg-[var(--m-accent-teal)] px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--m-accent-teal-dark)] disabled:opacity-60"
      >
        {status === 'submitting' ? t.submitting : submitLabel}
      </button>
    </form>
  );
}
