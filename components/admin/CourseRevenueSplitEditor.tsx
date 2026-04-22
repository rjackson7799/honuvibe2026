'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { computeEnrollmentSplit } from '@/lib/revenue-split/compute';
import { updateCourseRevenueSplit } from '@/lib/revenue-split/actions';

type CourseInstructorRow = {
  id: string;
  instructor_id: string;
  revenue_share_pct: number;
  instructor: {
    display_name: string;
  };
};

type CourseRevenueSplitEditorProps = {
  courseId: string;
  instructorSharePct: number;
  instructors: CourseInstructorRow[];
  priceUsd: number | null;
  priceJpy: number | null;
};

function formatMoney(amount: number, currency: 'usd' | 'jpy') {
  if (currency === 'jpy') {
    return `¥${amount.toLocaleString('ja-JP')}`;
  }
  return `$${(amount / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getInstructorName(
  instructors: CourseInstructorRow[],
  instructorId: string,
) {
  return (
    instructors.find((instructor) => instructor.instructor_id === instructorId)
      ?.instructor.display_name ?? instructorId
  );
}

function PreviewCard({
  label,
  gross,
  currency,
  split,
  instructors,
}: {
  label: string;
  gross: number;
  currency: 'usd' | 'jpy';
  split: ReturnType<typeof computeEnrollmentSplit>;
  instructors: CourseInstructorRow[];
}) {
  return (
    <div className="rounded-lg border border-border-default/70 bg-bg-secondary p-3">
      <p className="text-sm text-fg-primary">
        {label}: {formatMoney(gross, currency)}
      </p>
      <p className="mt-1 text-xs text-fg-tertiary">
        Instructor pool {formatMoney(split.instructor_total, currency)} · HonuVibe{' '}
        {formatMoney(split.honuvibe, currency)}
      </p>
      {split.per_instructor.length > 0 ? (
        <div className="mt-3 space-y-1">
          {split.per_instructor.map((row) => (
            <div key={`${currency}-${row.instructor_id}`} className="flex items-center justify-between text-xs text-fg-secondary">
              <span>{getInstructorName(instructors, row.instructor_id)}</span>
              <span>{formatMoney(row.amount, currency)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CourseRevenueSplitEditor({
  courseId,
  instructorSharePct,
  instructors,
  priceUsd,
  priceJpy,
}: CourseRevenueSplitEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [poolPct, setPoolPct] = useState(Number(instructorSharePct ?? 0));
  const [weights, setWeights] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        instructors.map((instructor) => [
          instructor.id,
          Number(instructor.revenue_share_pct ?? 0),
        ]),
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const weightSum = useMemo(
    () => instructors.reduce((sum, instructor) => sum + (weights[instructor.id] ?? 0), 0),
    [instructors, weights],
  );

  const canSave = poolPct === 0 || Math.abs(weightSum - 100) < 0.001;

  function clampPct(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
  }

  const usdPreview = useMemo(
    () =>
      computeEnrollmentSplit({
        gross: priceUsd ?? 10000,
        partnerSharePct: 0,
        instructorSharePct: poolPct,
        instructorWeights: instructors.map((instructor) => ({
          instructor_id: instructor.instructor_id,
          pct: weights[instructor.id] ?? 0,
        })),
      }),
    [instructors, poolPct, priceUsd, weights],
  );

  const jpyPreview = useMemo(
    () =>
      computeEnrollmentSplit({
        gross: priceJpy ?? 15000,
        partnerSharePct: 0,
        instructorSharePct: poolPct,
        instructorWeights: instructors.map((instructor) => ({
          instructor_id: instructor.instructor_id,
          pct: weights[instructor.id] ?? 0,
        })),
      }),
    [instructors, poolPct, priceJpy, weights],
  );

  return (
    <section className="rounded-lg border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-fg-primary">Revenue Split</h3>
          <p className="mt-1 max-w-[640px] text-xs text-fg-tertiary">
            Configure the instructor pool for new Stripe enrollments. Partner share is still
            handled separately at checkout time.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || !canSave}
          onClick={() => {
            setError(null);
            setSaved(false);
            startTransition(async () => {
              try {
                await updateCourseRevenueSplit(courseId, {
                  instructorSharePct: poolPct,
                  weights: instructors.map((instructor) => ({
                    courseInstructorId: instructor.id,
                    revenueSharePct: weights[instructor.id] ?? 0,
                  })),
                });
                setSaved(true);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to save revenue split.');
              }
            });
          }}
        >
          {isPending ? 'Saving...' : 'Save Split'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-fg-tertiary">
            Instructor Pool %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={poolPct}
            onChange={(event) => {
              setSaved(false);
              setPoolPct(clampPct(Number(event.target.value) || 0));
            }}
            className="w-full rounded-lg border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-fg-primary"
          />
          <p className="text-xs text-fg-tertiary">
            Sum: <span className={canSave ? 'text-accent-teal' : 'text-red-400'}>{weightSum}</span>
            {poolPct > 0 ? ' / needs 100' : ' / ignored while pool is 0'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-fg-tertiary">
                <th className="py-2 pr-4 font-medium">Instructor</th>
                <th className="py-2 pr-4 font-medium">Weight %</th>
              </tr>
            </thead>
            <tbody>
              {instructors.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 text-fg-tertiary">
                    Assign instructors above to enable revenue sharing.
                  </td>
                </tr>
              ) : (
                instructors.map((instructor) => (
                  <tr key={instructor.id} className="border-b border-border-default/50">
                    <td className="py-3 pr-4 text-fg-primary">
                      {instructor.instructor.display_name}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={weights[instructor.id] ?? 0}
                        onChange={(event) => {
                          setSaved(false);
                          setWeights((current) => ({
                            ...current,
                            [instructor.id]: clampPct(Number(event.target.value) || 0),
                          }));
                        }}
                        className="w-28 rounded-lg border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-fg-primary"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border-default bg-bg-primary/30 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-tertiary">Preview</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <PreviewCard
            label="USD sample"
            gross={priceUsd ?? 10000}
            currency="usd"
            split={usdPreview}
            instructors={instructors}
          />
          <PreviewCard
            label="JPY sample"
            gross={priceJpy ?? 15000}
            currency="jpy"
            split={jpyPreview}
            instructors={instructors}
          />
        </div>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {saved ? <p className="text-xs text-accent-teal">Revenue split saved.</p> : null}
      {!canSave ? (
        <p className="text-xs text-red-400">
          Instructor weights must sum to exactly 100 before saving a non-zero pool.
        </p>
      ) : null}
    </section>
  );
}
