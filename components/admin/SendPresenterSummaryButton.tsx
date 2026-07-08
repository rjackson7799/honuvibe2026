'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { sendPresenterSummaryAction } from '@/lib/events/public-rsvps-actions';

const REASON: Record<string, string> = {
  no_presenter_email: 'Set a presenter email in the event survey first.',
  no_responses: 'No survey responses yet.',
  no_survey: 'No survey for this event.',
  unknown_event: 'Unknown event.',
  email_not_configured: 'Email is not configured.',
};

export function SendPresenterSummaryButton({
  eventSlug,
  disabled,
  disabledReason,
}: {
  eventSlug: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  if (disabled) {
    return <span className="text-[12px] text-fg-tertiary">{disabledReason}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setOk(null);
          start(async () => {
            try {
              const res = await sendPresenterSummaryAction(eventSlug);
              setOk(res.sent);
              setMsg(
                res.sent
                  ? 'Sent to presenter.'
                  : REASON[res.reason ?? ''] ?? res.reason ?? 'Send failed.',
              );
            } catch {
              setOk(false);
              setMsg('Send failed.');
            }
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-medium text-fg-secondary transition-colors hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
      >
        <Send size={14} /> {pending ? 'Sending…' : 'Send summary to presenter'}
      </button>
      {msg && <span className={`text-[12px] ${ok ? 'text-accent-teal' : 'text-red-600'}`}>{msg}</span>}
    </div>
  );
}
