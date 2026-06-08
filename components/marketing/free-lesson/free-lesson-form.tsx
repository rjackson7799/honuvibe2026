'use client';

import { useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { trackFreeSampleStarted } from '@/lib/analytics';
import { CONTENT, type FreeLessonLocale } from '@/lib/free-lesson/content';

const LESSON_SLUG = 'prompt-before-after';

export function FreeLessonForm() {
  const locale = useLocale();
  const loc: FreeLessonLocale = locale === 'ja' ? 'ja' : 'en';
  const c = CONTENT[loc].capture;

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '');

    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/free-lesson/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company_url: data.get('company_url') }),
      });
      if (res.ok) {
        // Funnel: top-of-funnel capture (no email in the event — slug + locale only).
        trackFreeSampleStarted({ lesson_slug: LESSON_SLUG, locale: loc });
        setStatus('success');
        form.reset();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus('error');
        setErrorMsg(body?.error ?? c.error);
      }
    } catch {
      setStatus('error');
      setErrorMsg(c.error);
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[14px] border-[1.5px] border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.08)] p-6 text-center">
        <p className="mb-1.5 text-[18px] font-bold text-[var(--m-accent-teal)]">{c.success_heading}</p>
        <p className="text-[15px] text-[var(--m-ink-secondary)]">{c.success_body}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {/* Honeypot */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Company URL
          <input type="text" name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder={c.email_placeholder}
          disabled={status === 'submitting'}
          aria-label={c.email_placeholder}
          className={cn(
            'flex-1 rounded-[10px] border-[1.5px] border-[var(--m-border-strong)]',
            'bg-[var(--m-white)] px-4 py-3.5 text-[15px] text-[var(--m-ink-primary)]',
            'outline-none transition-colors',
            'focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[var(--m-accent-teal-soft)]',
            'disabled:opacity-60',
          )}
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className={cn(
            'shrink-0 rounded-[10px] bg-[var(--m-accent-teal)] px-6 py-3.5',
            'text-[15px] font-bold text-white transition-colors',
            'hover:bg-[var(--m-accent-teal-dark)] disabled:opacity-60',
          )}
        >
          {status === 'submitting' ? c.submitting : c.submit}
        </button>
      </div>
      {status === 'error' && errorMsg && (
        <p className="text-[13px] text-[var(--m-accent-coral)]">{errorMsg}</p>
      )}
    </form>
  );
}
