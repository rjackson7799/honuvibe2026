'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Loader2, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { SessionReport, StudentPattern } from '@/lib/tutoring/types';

type CourseProp = {
  id: string;
  titleEn: string;
  student: { id: string; name: string | null; email: string | null } | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export function TutoringCourseDashboard({
  course,
  initialReports,
  patterns,
}: {
  course: CourseProp;
  initialReports: SessionReport[];
  patterns: StudentPattern[];
}) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(initialReports.length === 0);
  const [sessionDate, setSessionDate] = useState(today());
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [transcript, setTranscript] = useState('');
  const [marginNotes, setMarginNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const hasGenerating =
    pendingIds.length > 0 || initialReports.some((r) => r.status === 'generating');

  // Poll generation status while any report is generating; refresh on completion.
  const poll = useCallback(async () => {
    const ids = Array.from(
      new Set([
        ...pendingIds,
        ...initialReports.filter((r) => r.status === 'generating').map((r) => r.id),
      ]),
    );
    if (ids.length === 0) return;
    try {
      const res = await fetch(`/api/tutoring/status?reportIds=${ids.join(',')}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        reports: { id: string; status: string; generation_error: string | null }[];
      };
      const settled = data.reports.filter((r) => r.status !== 'generating');
      if (settled.length > 0) {
        setPendingIds((prev) => prev.filter((id) => !settled.some((s) => s.id === id)));
        router.refresh();
      }
    } catch {
      /* transient — try again next tick */
    }
  }, [pendingIds, initialReports, router]);

  useEffect(() => {
    if (!hasGenerating) return;
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [hasGenerating, poll]);

  const canSubmit = !!course.student && sessionDate.trim() !== '' && transcript.trim() !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/tutoring/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          sessionDate,
          topic: topic.trim() || null,
          durationMinutes: duration ? Number(duration) : null,
          transcript,
          marginNotes: marginNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start generation.');
        return;
      }
      setPendingIds((prev) => [...prev, data.reportId]);
      setTopic('');
      setDuration('');
      setTranscript('');
      setMarginNotes('');
      setShowForm(false);
      router.refresh();
    } catch {
      setError('Network error — please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.02em] text-fg-primary">
            {course.titleEn}
          </h1>
          <p className="text-sm text-fg-tertiary">
            {course.student ? (
              <>Student: {course.student.name ?? course.student.email ?? 'Unknown'}</>
            ) : (
              <span className="text-red-600">No active student enrolled — enroll one to generate reports.</span>
            )}
          </p>
        </div>
        {!showForm && course.student && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={15} /> New session report
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          {/* New report form */}
          {showForm && course.student && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5"
            >
              <h2 className="text-[15px] font-semibold text-fg-primary">New session report</h2>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-[13px]">
                  <span className="mb-1 block font-medium text-fg-secondary">Session date</span>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
                    required
                  />
                </label>
                <label className="block text-[13px]">
                  <span className="mb-1 block font-medium text-fg-secondary">Topic (optional)</span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Work project discussion"
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
                  />
                </label>
                <label className="block text-[13px]">
                  <span className="mb-1 block font-medium text-fg-secondary">Duration (min)</span>
                  <input
                    type="number"
                    min={0}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="45"
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
                  />
                </label>
              </div>

              <label className="block text-[13px]">
                <span className="mb-1 block font-medium text-fg-secondary">
                  Transcript <span className="text-fg-tertiary">(pasted, kept private — never shown to the student)</span>
                </span>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={10}
                  placeholder="Paste the full session transcript here…"
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 font-mono text-[13px] text-fg-primary"
                  required
                />
              </label>

              <label className="block text-[13px]">
                <span className="mb-1 block font-medium text-fg-secondary">
                  Margin notes <span className="text-fg-tertiary">(optional, instructor-only)</span>
                </span>
                <textarea
                  value={marginNotes}
                  onChange={(e) => setMarginNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything you want kept alongside this report."
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-[13px] text-fg-primary"
                />
              </label>

              {error && <p className="text-[13px] text-red-600">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {submitting ? 'Starting…' : 'Generate report'}
                </button>
                {initialReports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg px-3 py-2 text-[13px] text-fg-tertiary hover:text-fg-primary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {hasGenerating && (
            <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-4 py-3 text-[13px] text-fg-secondary">
              <Loader2 size={15} className="animate-spin text-accent-teal" />
              Generating report — this can take a minute or two on Opus. It&apos;ll move to{' '}
              <span className="font-medium">Review</span> when ready.
            </div>
          )}

          {/* Reports table */}
          <div className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] uppercase tracking-[0.04em] text-fg-tertiary">
                  <th className="px-4 py-3 font-semibold">Session</th>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold sr-only">Open</th>
                </tr>
              </thead>
              <tbody>
                {initialReports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-fg-tertiary">
                      No reports yet.
                    </td>
                  </tr>
                ) : (
                  initialReports.map((r) => (
                    <tr key={r.id} className="border-t border-border-default">
                      <td className="px-4 py-3 whitespace-nowrap text-fg-primary">
                        {fmtDate(r.session_date)}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">{r.topic ?? '—'}</td>
                      <td className="px-4 py-3">
                        {r.status === 'generating' ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-tertiary">
                            <Loader2 size={13} className="animate-spin" /> Generating
                          </span>
                        ) : (
                          <StatusBadge status={r.status} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/tutoring/${course.id}/reports/${r.id}`}
                          className="inline-flex items-center text-fg-tertiary hover:text-accent-teal"
                          aria-label="Open report"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patterns sidebar */}
        <aside className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
            Recurring patterns
          </h2>
          {patterns.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-default px-3 py-4 text-[13px] text-fg-tertiary">
              None yet — patterns accumulate as you publish reports.
            </p>
          ) : (
            <ul className="space-y-2">
              {patterns.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-border-default bg-bg-secondary px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-fg-primary">
                      {p.label_en ?? p.category}
                    </span>
                    <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-fg-secondary">
                      ×{p.occurrence_count}
                    </span>
                  </div>
                  {p.last_seen_on && (
                    <p className="text-[11px] text-fg-tertiary">last {fmtDate(p.last_seen_on)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
