'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';
import { trackCommunityPostReported } from '@/lib/analytics';

const REASONS = ['spam', 'harassment', 'off_topic', 'other'] as const;
type Reason = (typeof REASONS)[number];

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  partnerScope,
}: {
  open: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment';
  targetId: string;
  partnerScope: string;
}) {
  const t = useTranslations('community');
  const [reason, setReason] = useState<Reason>('spam');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          note: note.trim().length > 0 ? note.trim() : null,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? 'error');
        setSubmitting(false);
        return;
      }
      trackCommunityPostReported({ partner_scope: partnerScope, target_type: targetType, reason });
      setSubmitted(true);
      setSubmitting(false);
      setTimeout(() => {
        setSubmitted(false);
        setReason('spam');
        setNote('');
        onClose();
      }, 1200);
    } catch {
      setError('network');
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('report_dialog_title')}>
      {submitted ? (
        <p className="text-sm text-fg-secondary py-4">{t('report_thanks_toast')}</p>
      ) : (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2.5 cursor-pointer text-[14px] text-fg-primary"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[color:var(--accent-teal)]"
                />
                {t(`report_reason_${r}`)}
              </label>
            ))}
          </fieldset>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('report_note_placeholder')}
            maxLength={200}
            rows={3}
            className="w-full resize-none p-3 rounded-[10px] bg-bg-primary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-teal)] text-[13.5px]"
          />
          {error && (
            <p className="text-[12px] text-[color:var(--accent-coral,#dc2626)]">{error}</p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '…' : t('report_submit')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
