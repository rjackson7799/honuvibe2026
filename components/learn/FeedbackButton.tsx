'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, Check, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

type Category = 'general' | 'idea' | 'problem';
type Status = 'idle' | 'loading' | 'success' | 'error';

const CATEGORIES: Category[] = ['general', 'idea', 'problem'];
const MAX_MESSAGE = 2000;

/**
 * Feedback pill for the member top bar. Opens a small dialog (the shared Modal)
 * with an optional category + a message, POSTs to /api/feedback (which derives the
 * user server-side), and shows an in-panel success confirmation that auto-closes.
 * Label is hidden on mobile (icon-only) to keep the bar compact.
 */
export function FeedbackButton() {
  const t = useTranslations('feedback');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  // Auto-close shortly after a successful submit.
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => setOpen(false), 1800);
    return () => clearTimeout(timer);
  }, [status]);

  // Reset the form after the close transition settles, so reopening is fresh.
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setCategory('general');
      setMessage('');
      setStatus('idle');
    }, 300);
    return () => clearTimeout(timer);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, category, page_path: pathname }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const fieldBase =
    'w-full rounded-[9px] border border-border-default bg-bg-primary px-3.5 py-2.5 text-[15px] text-fg-primary placeholder:text-fg-tertiary outline-none transition-colors focus:border-[color:var(--accent-teal)]';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('button')}
        className="inline-flex items-center gap-2 h-[38px] px-2 sm:px-3.5 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-all"
      >
        <MessageSquarePlus size={17} />
        <span className="hidden sm:inline text-[13px] font-medium">{t('button')}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={status === 'success' ? undefined : t('title')}
        ariaLabel={t('title')}
      >
        {status === 'success' ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent-teal-subtle)]">
              <Check size={26} className="text-[color:var(--accent-teal)]" />
            </div>
            <h3 className="mb-1.5 text-[18px] font-bold text-fg-primary">{t('success_title')}</h3>
            <p className="text-[14px] text-fg-tertiary">{t('success_body')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="-mt-1 text-[14px] text-fg-tertiary">{t('subtitle')}</p>

            <div>
              <label
                htmlFor="feedback-category"
                className="mb-1.5 block text-[13px] font-semibold text-fg-secondary"
              >
                {t('category_label')}
              </label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={`${fieldBase} cursor-pointer`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category_${c}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="feedback-message"
                className="mb-1.5 block text-[13px] font-semibold text-fg-secondary"
              >
                {t('message_label')}
              </label>
              <div className="relative">
                <textarea
                  id="feedback-message"
                  required
                  rows={5}
                  maxLength={MAX_MESSAGE}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('message_placeholder')}
                  className={`${fieldBase} resize-y pb-7 leading-[1.6]`}
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-fg-tertiary">
                  {message.length} / {MAX_MESSAGE}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || message.trim().length === 0}
              className="flex items-center justify-center gap-2 rounded-[10px] bg-[color:var(--accent-teal)] px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[color:var(--accent-teal-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </button>

            {status === 'error' && (
              <p
                role="alert"
                aria-live="assertive"
                className="text-center text-[13px] text-[color:var(--accent-coral)]"
              >
                {t('error')}
              </p>
            )}
          </form>
        )}
      </Modal>
    </>
  );
}
