'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteEventRsvp } from '@/lib/events/public-rsvps-actions';

export function DeleteRsvpButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm('Delete this registration? This cannot be undone.')) return;
        startTransition(async () => {
          await deleteEventRsvp(id);
        });
      }}
      className="text-fg-tertiary transition-colors hover:text-red-600 disabled:opacity-50"
      aria-label="Delete registration"
    >
      <Trash2 size={15} />
    </button>
  );
}
