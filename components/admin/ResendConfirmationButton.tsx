'use client';

import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { resendConfirmationEmail } from '@/lib/admin/actions';

export function ResendConfirmationButton({
  studentId,
  email,
  fullName,
}: {
  studentId: string;
  email: string;
  fullName: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  function handleResend() {
    setError(null);
    startTransition(async () => {
      const result = await resendConfirmationEmail(studentId, email, fullName);
      if (result.success) {
        setStatus('sent');
        setCooldown(true);
        setTimeout(() => setCooldown(false), 60_000);
      } else {
        setStatus('error');
        setError(result.error ?? 'Failed to send');
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleResend}
        disabled={isPending || cooldown}
        className="flex items-center gap-1.5 text-sm text-accent-teal hover:text-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Mail size={15} />
        {isPending ? 'Sending...' : cooldown ? 'Sent' : 'Resend Confirmation Email'}
      </button>

      {status === 'sent' && !isPending && (
        <span className="text-xs text-accent-teal">Confirmation email sent via Resend</span>
      )}

      {status === 'error' && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
