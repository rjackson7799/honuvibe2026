'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';
import { SubscribeButton } from '@/components/billing/SubscribeButton';
import { trackEvent } from '@/lib/analytics';

type VaultUnlockModalProps = {
  open: boolean;
  onClose: () => void;
  count: number;
};

export function VaultUnlockModal({ open, onClose, count }: VaultUnlockModalProps) {
  const t = useTranslations('vault');

  useEffect(() => {
    if (open) trackEvent('vault_unlock_modal_open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-sm bg-bg-primary border border-border-default rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fg-tertiary hover:text-fg-secondary transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-gold/10 mb-5 mx-auto">
          <Lock size={26} className="text-accent-gold" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-serif text-fg-primary text-center mb-2">
          {t('modal.heading')}
        </h2>
        <p className="text-sm text-fg-secondary text-center mb-6">
          {t('modal.sub', { count })}
        </p>

        {/* Primary CTA */}
        <div className="flex justify-center mb-5" onClick={() => trackEvent('vault_unlock_subscribe_click')}>
          <SubscribeButton />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-xs text-fg-tertiary">{t('modal.divider')}</span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        {/* Secondary CTA */}
        <div className="text-center">
          <p className="text-xs text-fg-tertiary mb-2">
            {t('modal.enroll_note')}
          </p>
          <Link
            href="/learn"
            onClick={onClose}
            className="text-sm text-accent-teal hover:text-accent-teal/80 transition-colors underline underline-offset-2"
          >
            {t('modal.browse')}
          </Link>
        </div>
      </div>
    </div>
  );
}
