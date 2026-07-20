'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type Status = 'idle' | 'copied' | 'error';

// 'unknown' is the SSR + pre-hydration state: we render the button (disabled)
// rather than the bulky manual fallback, so there's no first-paint flash / CLS.
// The mount effect resolves it to 'available' or 'unavailable'.
type Clipboard = 'unknown' | 'available' | 'unavailable';

/**
 * Copies the teaser prompt to the clipboard.
 *
 * - Feature-detects the async Clipboard API at mount. SSR renders the button
 *   disabled; once hydrated, it enables only when writeText is actually
 *   available. Where it isn't, the button is replaced by a hint + the prompt is
 *   rendered as selectable text so a keyboard/manual copy still works.
 * - The button keeps a stable accessible name ("Copy prompt"); success/failure
 *   are announced through a polite live region, not by relabelling the control.
 * - trackEvent('prompt_copy', …) fires ONLY after a genuinely successful copy.
 */
export function CopyPromptButton({
  prompt,
  locale,
}: {
  prompt: string;
  locale: string;
}) {
  const t = useTranslations('home.membership.teaser');
  const [clipboard, setClipboard] = useState<Clipboard>('unknown');
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setClipboard(
      typeof navigator !== 'undefined' &&
        typeof navigator.clipboard?.writeText === 'function'
        ? 'available'
        : 'unavailable',
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus('copied');
      trackEvent('prompt_copy', { source: 'home_teaser', locale });
    } catch {
      setStatus('error');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  }

  const statusText =
    status === 'copied'
      ? t('copied_label')
      : status === 'error'
        ? t('error_label')
        : '';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {clipboard === 'unavailable' ? (
        <p className="text-[13.5px] font-medium text-[var(--m-ink-tertiary)]">
          {t('manual_label')}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleCopy}
          disabled={clipboard === 'unknown'}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] bg-[var(--m-teal-dark-2)] px-5 py-2.5 text-[14px] font-semibold text-[var(--m-white)] transition-colors hover:bg-[var(--m-teal-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'copied' ? (
            <Check size={15} strokeWidth={2.4} aria-hidden />
          ) : (
            <Copy size={15} strokeWidth={2} aria-hidden />
          )}
          {t('copy_label')}
        </button>
      )}

      <span
        role="status"
        aria-live="polite"
        className={
          statusText
            ? 'text-[13px] font-semibold text-[var(--m-seafoam)]'
            : 'sr-only'
        }
      >
        {statusText}
      </span>

      {clipboard === 'unavailable' && (
        <pre className="mt-2 w-full max-w-full overflow-x-auto whitespace-pre-wrap rounded-[8px] border border-[var(--m-border-soft)] bg-[var(--m-sand)] px-4 py-3 text-[12.5px] leading-[1.6] text-[var(--m-ink-secondary)] select-all">
          {prompt}
        </pre>
      )}
    </div>
  );
}
