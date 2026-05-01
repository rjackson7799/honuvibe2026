'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { InstructorPayoutRow } from '@/lib/revenue-split/queries';

type AdminPayoutsTableProps = {
  rows: InstructorPayoutRow[];
};

function formatMoney(amount: number, currency: string) {
  if (currency === 'jpy') {
    return `¥${amount.toLocaleString('ja-JP')}`;
  }
  return `$${(amount / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AdminPayoutsTable({ rows }: AdminPayoutsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRows = useMemo(
    () => rows.filter((row) => row.status === 'pending'),
    [rows],
  );
  const selectableIds = pendingRows.map((row) => row.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  async function markSelectedPaid() {
    const payoutReference = window.prompt('Payout reference');
    if (!payoutReference) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/payouts/instructors/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareIds: selectedIds,
          payoutReference,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to mark payouts as paid.');
      }

      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark payouts as paid.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
        <p className="text-sm text-fg-tertiary">No payout rows match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif text-fg-primary">Instructor Shares</h2>
          <p className="text-xs text-fg-tertiary">
            Select pending rows to stamp them paid with a payout reference.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isSubmitting || selectedIds.length === 0}
          onClick={markSelectedPaid}
        >
          {isSubmitting ? 'Marking...' : 'Mark selected as paid'}
        </Button>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-fg-tertiary">
              <th className="py-2 pr-3 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    setSelectedIds(event.target.checked ? selectableIds : [])
                  }
                  aria-label="Select all pending payout rows"
                />
              </th>
              <th className="py-2 pr-4 font-medium">Course</th>
              <th className="py-2 pr-4 font-medium">Student</th>
              <th className="py-2 pr-4 font-medium">Instructor</th>
              <th className="py-2 pr-4 font-medium">Gross</th>
              <th className="py-2 pr-4 font-medium">Share</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Created</th>
              <th className="py-2 pr-4 font-medium">Paid</th>
              <th className="py-2 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selectable = row.status === 'pending';
              const checked = selectedIds.includes(row.id);
              return (
                <tr key={row.id} className="border-b border-border-default/50 align-top">
                  <td className="py-3 pr-3">
                    <input
                      type="checkbox"
                      disabled={!selectable}
                      checked={checked}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, row.id]
                            : current.filter((id) => id !== row.id),
                        );
                      }}
                      aria-label={`Select payout row ${row.id}`}
                    />
                  </td>
                  <td className="py-3 pr-4 text-fg-primary">{row.course_title_en ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="text-fg-primary">{row.student_name ?? row.student_email ?? '—'}</div>
                    <div className="text-xs text-fg-tertiary">{row.student_email ?? '—'}</div>
                  </td>
                  <td className="py-3 pr-4 text-fg-secondary">
                    {row.instructor_display_name ?? row.instructor_id}
                  </td>
                  <td className="py-3 pr-4 text-fg-secondary">
                    {formatMoney(row.gross, row.currency)}
                  </td>
                  <td className="py-3 pr-4 text-fg-primary font-medium">
                    {formatMoney(row.amount, row.currency)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        row.status === 'pending'
                          ? 'text-amber-300'
                          : row.status === 'paid'
                            ? 'text-accent-teal'
                            : 'text-red-400'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-fg-tertiary">
                    {new Date(row.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 pr-4 text-fg-tertiary">
                    {row.paid_at
                      ? new Date(row.paid_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="py-3 text-fg-tertiary">{row.payout_reference ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
