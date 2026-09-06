// Server-renderable terminal states for the proposal page — FatalCard.tsx
// with proposal wording: 403 ("open from your email again" — the cookie is
// missing, wrong, or the link was revoked/replaced; deliberately not an
// error page), 410 (the LINK expired — ask Ryan for a fresh one; distinct
// from the proposal's own valid_until, which the page shows as a band), 503.

import { Clock, KeyRound } from 'lucide-react';
import { JP_TEXT_CLASS, T } from './copy';

export function ProposalFatalCard({ locale, kind }: { locale: 'en' | 'ja'; kind: 'forbidden' | 'expired' | 'unavailable' }) {
  const t = T[locale];
  const isJa = locale === 'ja';
  const title = kind === 'expired' ? t.linkExpiredTitle : kind === 'unavailable' ? t.unavailableTitle : t.forbiddenTitle;
  const body = kind === 'expired' ? t.linkExpiredBody : kind === 'unavailable' ? t.unavailableBody : t.forbiddenBody;
  return (
    <div data-shell="marketing" className="learn-zone min-h-screen px-5 py-12 sm:px-6" style={{ backgroundColor: 'var(--m-canvas)' }}>
      {/* JP typography on the inner wrapper — see QuestionnaireApp for why. */}
      <div lang={locale} className={`mx-auto w-full max-w-[560px] ${isJa ? JP_TEXT_CLASS : ''}`}>
        <div className="mb-8 text-center">
          <span className="text-[17px] font-semibold tracking-tight text-[var(--m-ink-primary)]">
            HonuVibe<span className="text-[var(--m-accent-teal)]">.AI</span>
            <span className="ml-1.5 text-[12px] font-medium text-[var(--m-ink-secondary)]">Studio</span>
          </span>
        </div>
        <div className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 text-center shadow-[var(--m-shadow-md)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(232,118,90,0.10)' }}>
            {kind === 'expired' ? (
              <Clock size={28} strokeWidth={2} style={{ color: 'var(--m-accent-coral)' }} />
            ) : (
              <KeyRound size={28} strokeWidth={2} style={{ color: 'var(--m-accent-coral)' }} />
            )}
          </div>
          <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">{title}</h1>
          <p className="text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">{body}</p>
        </div>
      </div>
    </div>
  );
}
