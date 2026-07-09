'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Plus, ExternalLink, Eye, PencilLine, Images, X, Download } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SessionReportView } from '@/components/learn/SessionReportView';
import { splitReport } from '@/lib/tutoring/split';
import { PATTERN_CATEGORIES, PATTERN_LABELS } from '@/lib/tutoring/schemas';
import {
  updateSessionReport,
  unpublishSessionReport,
  deleteSessionReport,
} from '@/lib/tutoring/actions';
import type { GeneratedSessionReport, SessionReportStatus, PatternCategory } from '@/lib/tutoring/types';

type ReportProp = {
  id: string;
  status: SessionReportStatus;
  sessionDate: string;
  topic: string | null;
  durationMinutes: number | null;
  publishedAt: string | null;
  patternsAppliedAt: string | null;
  instructorJson: GeneratedSessionReport | null;
  marginNotes: string | null;
  generationError: string | null;
  hasTranscript: boolean;
  hasImages: boolean;
  hasStudentJson: boolean;
};

// ---- small field helpers ----
function Field({
  label,
  value,
  onChange,
  mono,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-[13px]">
      <span className="mb-1 block font-medium text-fg-secondary">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary ${
          mono ? 'font-mono text-[12px]' : ''
        }`}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-[13px]">
      <span className="mb-1 block font-medium text-fg-secondary">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-[13px] text-fg-primary"
      />
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
      <h2 className="text-[15px] font-semibold text-fg-primary">{title}</h2>
      {children}
    </section>
  );
}

function ItemCard({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="relative space-y-2 rounded-lg border border-border-default p-3">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 text-fg-tertiary hover:text-red-600"
        aria-label="Remove"
      >
        <Trash2 size={14} />
      </button>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-teal hover:opacity-80"
    >
      <Plus size={13} /> {label}
    </button>
  );
}

function rid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function DownloadGroup({
  label, disabled, downloading, onDownload, variant,
}: {
  label: string;
  disabled: boolean;
  downloading: string | null;
  onDownload: (format: 'pdf' | 'docx') => void;
  variant: 'student' | 'teacher';
}) {
  const btn = (format: 'pdf' | 'docx', text: string) => {
    const tag = `${variant}-${format}`;
    return (
      <button
        type="button"
        onClick={() => onDownload(format)}
        disabled={disabled || downloading === tag}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
      >
        {downloading === tag ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {text}
      </button>
    );
  };
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-fg-tertiary">{label}</p>
      <div className="flex items-center gap-2">
        {btn('pdf', 'PDF')}
        {btn('docx', 'Word')}
      </div>
    </div>
  );
}

export function SessionReportReviewPanel({
  courseId,
  studentName,
  report,
}: {
  courseId: string;
  studentName: string | null;
  report: ReportProp;
}) {
  const router = useRouter();

  const [sessionDate, setSessionDate] = useState(report.sessionDate);
  const [topic, setTopic] = useState(report.topic ?? '');
  const [duration, setDuration] = useState(report.durationMinutes?.toString() ?? '');
  const [marginNotes, setMarginNotes] = useState(report.marginNotes ?? '');
  const [data, setData] = useState<GeneratedSessionReport | null>(report.instructorJson);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ja'>('en');

  const [saving, startSave] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [worksheetUrls, setWorksheetUrls] = useState<string[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const patch = (u: (r: GeneratedSessionReport) => GeneratedSessionReport) => {
    setData((prev) => (prev ? u(prev) : prev));
    setDirty(true);
  };

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
  }

  // ---- lifecycle actions ----
  function handleSave() {
    if (!data) return;
    setMsg(null);
    startSave(async () => {
      try {
        await updateSessionReport({
          reportId: report.id,
          sessionDate,
          topic: topic.trim() || null,
          durationMinutes: duration ? Number(duration) : null,
          marginNotes: marginNotes.trim() || null,
          report: data,
        });
        flash(true, 'Saved.');
        setDirty(false);
        router.refresh();
      } catch {
        flash(false, 'Save failed — every section needs text in both English and Japanese.');
      }
    });
  }

  async function callRoute(path: string, body?: unknown, tag = 'action') {
    setBusy(tag);
    setMsg(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(false, json.error ?? 'Action failed.');
        return false;
      }
      return json;
    } catch {
      flash(false, 'Network error.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish() {
    const r = await callRoute(`/api/tutoring/${report.id}/publish`, {}, 'publish');
    if (r) {
      flash(true, r.emailed ? 'Published and emailed the student.' : 'Published (no student email on file).');
      router.refresh();
    }
  }

  async function handleResend() {
    const r = await callRoute(`/api/tutoring/${report.id}/publish`, { resend: true }, 'resend');
    if (r) flash(r.emailed, r.emailed ? 'Re-sent to the student.' : 'No student email on file.');
  }

  async function handleRegenerate() {
    const r = await callRoute('/api/tutoring/generate', { reportId: report.id }, 'regen');
    if (r) {
      flash(true, 'Regenerating — this can take a minute or two.');
      router.refresh();
    }
  }

  function handleUnpublish() {
    setBusy('unpublish');
    setMsg(null);
    startSave(async () => {
      try {
        await unpublishSessionReport(report.id);
        flash(true, 'Moved back to review (hidden from the student).');
        router.refresh();
      } catch {
        flash(false, 'Unpublish failed.');
      } finally {
        setBusy(null);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this report and its transcript and photos permanently?')) return;
    setBusy('delete');
    startSave(async () => {
      try {
        await deleteSessionReport(report.id);
        router.push(`/admin/tutoring/${courseId}`);
      } catch {
        flash(false, 'Delete failed.');
        setBusy(null);
      }
    });
  }

  async function handleViewTranscript() {
    setBusy('transcript');
    try {
      const res = await fetch(`/api/tutoring/${report.id}/transcript`);
      const json = await res.json();
      if (res.ok && json.url) window.open(json.url, '_blank', 'noopener');
      else flash(false, json.error ?? 'Could not open transcript.');
    } catch {
      flash(false, 'Could not open transcript.');
    } finally {
      setBusy(null);
    }
  }

  async function handleViewWorksheet() {
    setBusy('worksheet');
    try {
      const res = await fetch(`/api/tutoring/${report.id}/images`);
      const json = (await res.json()) as { images?: { url: string }[]; error?: string };
      if (res.ok && json.images?.length) {
        setWorksheetUrls(json.images.map((i) => i.url));
      } else {
        flash(false, json.error ?? 'Could not load worksheet photos.');
      }
    } catch {
      flash(false, 'Could not load worksheet photos.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(variant: 'student' | 'teacher', format: 'pdf' | 'docx') {
    const tag = `${variant}-${format}`;
    setDownloading(tag);
    setMsg(null);
    try {
      const res = await fetch(`/api/tutoring/${report.id}/document?variant=${variant}&format=${format}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        flash(false, j.error ?? 'Download failed.');
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(cd);
      const name = m?.[1] ?? `HonuVibe-1v1-${variant}.${format}`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      flash(false, 'Network error.');
    } finally {
      setDownloading(null);
    }
  }

  const isGenerating = report.status === 'generating';
  const isFailed = report.status === 'failed';
  const isPublished = report.status === 'published';
  const isReview = report.status === 'review';

  return (
    <div className="space-y-5">
      {/* Worksheet photos modal */}
      {worksheetUrls && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setWorksheetUrls(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-bg-primary p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-fg-primary">
                Worksheet photos <span className="text-fg-tertiary">(instructor-only)</span>
              </h3>
              <button
                type="button"
                onClick={() => setWorksheetUrls(null)}
                aria-label="Close"
                className="text-fg-tertiary hover:text-fg-primary"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {worksheetUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-border-default"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Worksheet photo ${i + 1}`} className="w-full object-contain" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-fg-tertiary">
              Click a photo to open it full size. These links expire in about an hour.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={report.status} />
          <span className="text-sm text-fg-secondary">
            {studentName ?? 'Student'} ·{' '}
            {new Date(`${report.sessionDate}T00:00:00`).toLocaleDateString('en-US', {
              dateStyle: 'medium',
            })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report.hasTranscript && (
            <button
              type="button"
              onClick={handleViewTranscript}
              disabled={busy === 'transcript'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
            >
              <ExternalLink size={14} /> Transcript
            </button>
          )}
          {report.hasImages && (
            <button
              type="button"
              onClick={handleViewWorksheet}
              disabled={busy === 'worksheet'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
            >
              {busy === 'worksheet' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Images size={14} />
              )}{' '}
              Worksheet photos
            </button>
          )}
          {(isReview || isFailed) && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={busy === 'regen'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
            >
              {busy === 'regen' ? <Loader2 size={14} className="animate-spin" /> : null} Regenerate
            </button>
          )}
          {isReview && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={busy === 'publish'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : null} Publish
            </button>
          )}
          {isPublished && (
            <>
              <button
                type="button"
                onClick={handleResend}
                disabled={busy === 'resend'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
              >
                Re-send email
              </button>
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={busy === 'unpublish'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-amber-500 hover:text-amber-600 disabled:opacity-50"
              >
                Unpublish
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy === 'delete'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-tertiary hover:border-red-500 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-[13px] ${msg.ok ? 'text-accent-teal' : 'text-red-600'}`}>{msg.text}</p>
      )}

      {isPublished && (
        <p className="rounded-lg bg-accent-teal/8 px-4 py-2.5 text-[13px] text-fg-secondary">
          Published — the student can see this now. Edits save immediately to their view; unpublish
          first if you want to regenerate.
        </p>
      )}

      {/* Generating / failed states */}
      {isGenerating && (
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-4 py-6 text-[14px] text-fg-secondary">
          <Loader2 size={16} className="animate-spin text-accent-teal" />
          Generating the report… refresh in a minute or two.
        </div>
      )}
      {isFailed && (
        <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-4 text-[14px]">
          <p className="font-medium text-red-600">Generation failed</p>
          {report.generationError && (
            <p className="font-mono text-[12px] text-fg-secondary">{report.generationError}</p>
          )}
          <p className="text-fg-tertiary">Use Regenerate above to try again.</p>
        </div>
      )}

      {/* Editor / preview */}
      {data && (
        <>
          {/* metadata + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-secondary p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <Field label="Session date" value={sessionDate} onChange={(v) => { setSessionDate(v); setDirty(true); }} type="date" />
              <Field label="Topic" value={topic} onChange={(v) => { setTopic(v); setDirty(true); }} />
              <Field label="Duration (min)" value={duration} onChange={(v) => { setDuration(v); setDirty(true); }} type="number" />
            </div>
            <div className="inline-flex overflow-hidden rounded-lg border border-border-default">
              <button
                type="button"
                onClick={() => setView('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[13px] ${
                  view === 'edit' ? 'bg-accent-teal/10 text-accent-teal' : 'text-fg-tertiary'
                }`}
              >
                <PencilLine size={14} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setView('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[13px] ${
                  view === 'preview' ? 'bg-accent-teal/10 text-accent-teal' : 'text-fg-tertiary'
                }`}
              >
                <Eye size={14} /> Student preview
              </button>
            </div>
          </div>

          {(isReview || isPublished) && (
            <div className="rounded-xl border border-border-default bg-bg-secondary p-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <DownloadGroup
                  label="Send to student"
                  disabled={!report.hasStudentJson || dirty}
                  downloading={downloading}
                  onDownload={(f) => handleDownload('student', f)}
                  variant="student"
                />
                <DownloadGroup
                  label="Teacher copy (next session)"
                  disabled={!data || dirty}
                  downloading={downloading}
                  onDownload={(f) => handleDownload('teacher', f)}
                  variant="teacher"
                />
              </div>
              {dirty && (
                <p className="mt-2 text-[12px] text-amber-600">Save changes before downloading.</p>
              )}
            </div>
          )}

          {view === 'preview' ? (
            <div className="space-y-4 rounded-xl border border-border-default bg-bg-primary p-6">
              <div className="flex items-center justify-between">
                <p className="text-[12px] uppercase tracking-[0.08em] text-fg-tertiary">
                  What the student sees (answer keys &amp; instructor analysis removed)
                </p>
                <div className="inline-flex overflow-hidden rounded-lg border border-border-default text-[12px]">
                  {(['en', 'ja'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPreviewLocale(l)}
                      className={`px-2.5 py-1 ${
                        previewLocale === l ? 'bg-accent-teal/10 text-accent-teal' : 'text-fg-tertiary'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <SessionReportView report={splitReport(data).student_json} locale={previewLocale} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Snapshot */}
              <SectionCard title="Snapshot">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Area
                    label="Summary (EN)"
                    value={data.snapshot.summary_en}
                    onChange={(v) => patch((r) => ({ ...r, snapshot: { ...r.snapshot, summary_en: v } }))}
                  />
                  <Area
                    label="Summary (JP)"
                    value={data.snapshot.summary_jp}
                    onChange={(v) => patch((r) => ({ ...r, snapshot: { ...r.snapshot, summary_jp: v } }))}
                  />
                </div>
              </SectionCard>

              {/* Wins */}
              <SectionCard title="Wins">
                {data.wins.map((w, i) => (
                  <ItemCard
                    key={i}
                    onRemove={() => patch((r) => ({ ...r, wins: r.wins.filter((_, x) => x !== i) }))}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Win (EN)" value={w.win_en} onChange={(v) => patch((r) => ({ ...r, wins: r.wins.map((x, xi) => (xi === i ? { ...x, win_en: v } : x)) }))} />
                      <Field label="Win (JP)" value={w.win_jp} onChange={(v) => patch((r) => ({ ...r, wins: r.wins.map((x, xi) => (xi === i ? { ...x, win_jp: v } : x)) }))} />
                    </div>
                    <Field label="Quote (optional)" value={w.quote ?? ''} onChange={(v) => patch((r) => ({ ...r, wins: r.wins.map((x, xi) => (xi === i ? { ...x, quote: v || undefined } : x)) }))} />
                  </ItemCard>
                ))}
                <AddButton label="Add win" onClick={() => patch((r) => ({ ...r, wins: [...r.wins, { win_en: '', win_jp: '' }] }))} />
              </SectionCard>

              {/* Trouble spots */}
              <SectionCard title="Things to work on">
                {data.trouble_spots.map((t, i) => (
                  <ItemCard
                    key={t.id}
                    onRemove={() => patch((r) => ({ ...r, trouble_spots: r.trouble_spots.filter((_, x) => x !== i) }))}
                  >
                    <label className="block text-[13px]">
                      <span className="mb-1 block font-medium text-fg-secondary">Pattern</span>
                      <select
                        value={t.pattern_category}
                        onChange={(e) => {
                          const cat = e.target.value as PatternCategory;
                          patch((r) => ({
                            ...r,
                            trouble_spots: r.trouble_spots.map((x, xi) =>
                              xi === i
                                ? { ...x, pattern_category: cat, pattern_label_en: PATTERN_LABELS[cat].en, pattern_label_jp: PATTERN_LABELS[cat].jp }
                                : x,
                            ),
                          }));
                        }}
                        className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
                      >
                        {PATTERN_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {PATTERN_LABELS[c].en} / {PATTERN_LABELS[c].jp}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field label="Quote (verbatim)" value={t.quote} mono onChange={(v) => patch((r) => ({ ...r, trouble_spots: r.trouble_spots.map((x, xi) => (xi === i ? { ...x, quote: v } : x)) }))} />
                    <Field label="Correction" value={t.correction} onChange={(v) => patch((r) => ({ ...r, trouble_spots: r.trouble_spots.map((x, xi) => (xi === i ? { ...x, correction: v } : x)) }))} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Area label="Explanation (EN)" value={t.explanation_en} onChange={(v) => patch((r) => ({ ...r, trouble_spots: r.trouble_spots.map((x, xi) => (xi === i ? { ...x, explanation_en: v } : x)) }))} />
                      <Area label="Explanation (JP)" value={t.explanation_jp} onChange={(v) => patch((r) => ({ ...r, trouble_spots: r.trouble_spots.map((x, xi) => (xi === i ? { ...x, explanation_jp: v } : x)) }))} />
                    </div>
                  </ItemCard>
                ))}
                <AddButton
                  label="Add trouble spot"
                  onClick={() =>
                    patch((r) => ({
                      ...r,
                      trouble_spots: [
                        ...r.trouble_spots,
                        { id: rid('trouble'), quote: '', correction: '', explanation_en: '', explanation_jp: '', pattern_category: 'other', pattern_label_en: PATTERN_LABELS.other.en, pattern_label_jp: PATTERN_LABELS.other.jp },
                      ],
                    }))
                  }
                />
              </SectionCard>

              {/* Recurring patterns */}
              <SectionCard title="Patterns over time">
                {data.recurring_patterns.map((p, i) => (
                  <ItemCard
                    key={i}
                    onRemove={() => patch((r) => ({ ...r, recurring_patterns: r.recurring_patterns.filter((_, x) => x !== i) }))}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[13px]">
                        <span className="mb-1 block font-medium text-fg-secondary">Category</span>
                        <select
                          value={p.category}
                          onChange={(e) => patch((r) => ({ ...r, recurring_patterns: r.recurring_patterns.map((x, xi) => (xi === i ? { ...x, category: e.target.value as PatternCategory } : x)) }))}
                          className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
                        >
                          {PATTERN_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{PATTERN_LABELS[c].en}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[13px]">
                        <span className="mb-1 block font-medium text-fg-secondary">Trend</span>
                        <select
                          value={p.trend}
                          onChange={(e) => patch((r) => ({ ...r, recurring_patterns: r.recurring_patterns.map((x, xi) => (xi === i ? { ...x, trend: e.target.value as typeof x.trend } : x)) }))}
                          className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
                        >
                          {(['improving', 'persistent', 'new'] as const).map((tr) => (
                            <option key={tr} value={tr}>{tr}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Area label="Note (EN)" value={p.note_en} onChange={(v) => patch((r) => ({ ...r, recurring_patterns: r.recurring_patterns.map((x, xi) => (xi === i ? { ...x, note_en: v } : x)) }))} />
                      <Area label="Note (JP)" value={p.note_jp} onChange={(v) => patch((r) => ({ ...r, recurring_patterns: r.recurring_patterns.map((x, xi) => (xi === i ? { ...x, note_jp: v } : x)) }))} />
                    </div>
                  </ItemCard>
                ))}
                <AddButton
                  label="Add pattern"
                  onClick={() => patch((r) => ({ ...r, recurring_patterns: [...r.recurring_patterns, { category: 'other', note_en: '', note_jp: '', trend: 'new' }] }))}
                />
              </SectionCard>

              {/* Study areas */}
              <SectionCard title="Focus for practice">
                {data.study_areas.map((s, i) => (
                  <ItemCard key={i} onRemove={() => patch((r) => ({ ...r, study_areas: r.study_areas.filter((_, x) => x !== i) }))}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Area (EN)" value={s.area_en} onChange={(v) => patch((r) => ({ ...r, study_areas: r.study_areas.map((x, xi) => (xi === i ? { ...x, area_en: v } : x)) }))} />
                      <Field label="Area (JP)" value={s.area_jp} onChange={(v) => patch((r) => ({ ...r, study_areas: r.study_areas.map((x, xi) => (xi === i ? { ...x, area_jp: v } : x)) }))} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Why (EN)" value={s.why_en} onChange={(v) => patch((r) => ({ ...r, study_areas: r.study_areas.map((x, xi) => (xi === i ? { ...x, why_en: v } : x)) }))} />
                      <Field label="Why (JP)" value={s.why_jp} onChange={(v) => patch((r) => ({ ...r, study_areas: r.study_areas.map((x, xi) => (xi === i ? { ...x, why_jp: v } : x)) }))} />
                    </div>
                  </ItemCard>
                ))}
                <AddButton label="Add focus area" onClick={() => patch((r) => ({ ...r, study_areas: [...r.study_areas, { area_en: '', area_jp: '', why_en: '', why_jp: '' }] }))} />
              </SectionCard>

              {/* Vocabulary */}
              <SectionCard title="Vocabulary">
                {data.vocabulary.map((v, i) => (
                  <ItemCard key={v.id} onRemove={() => patch((r) => ({ ...r, vocabulary: r.vocabulary.filter((_, x) => x !== i) }))}>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Field label="Term (EN)" value={v.term_en} onChange={(val) => patch((r) => ({ ...r, vocabulary: r.vocabulary.map((x, xi) => (xi === i ? { ...x, term_en: val } : x)) }))} />
                      <Field label="Term (JP)" value={v.term_jp} onChange={(val) => patch((r) => ({ ...r, vocabulary: r.vocabulary.map((x, xi) => (xi === i ? { ...x, term_jp: val } : x)) }))} />
                      <Field label="Reading (IPA)" value={v.reading_en ?? ''} onChange={(val) => patch((r) => ({ ...r, vocabulary: r.vocabulary.map((x, xi) => (xi === i ? { ...x, reading_en: val || undefined } : x)) }))} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Example (EN)" value={v.example_en} onChange={(val) => patch((r) => ({ ...r, vocabulary: r.vocabulary.map((x, xi) => (xi === i ? { ...x, example_en: val } : x)) }))} />
                      <Field label="Example (JP)" value={v.example_jp} onChange={(val) => patch((r) => ({ ...r, vocabulary: r.vocabulary.map((x, xi) => (xi === i ? { ...x, example_jp: val } : x)) }))} />
                    </div>
                  </ItemCard>
                ))}
                <AddButton label="Add word" onClick={() => patch((r) => ({ ...r, vocabulary: [...r.vocabulary, { id: rid('vocab'), term_en: '', term_jp: '', example_en: '', example_jp: '' }] }))} />
              </SectionCard>

              {/* Grammar points */}
              <SectionCard title="Grammar points">
                {data.grammar_points.map((g, i) => (
                  <ItemCard key={g.id} onRemove={() => patch((r) => ({ ...r, grammar_points: r.grammar_points.filter((_, x) => x !== i) }))}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Title (EN)" value={g.title_en} onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, title_en: v } : x)) }))} />
                      <Field label="Title (JP)" value={g.title_jp} onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, title_jp: v } : x)) }))} />
                    </div>
                    <Field label="Pattern" value={g.pattern} mono onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, pattern: v } : x)) }))} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Area label="Explanation (EN)" value={g.explanation_en} onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, explanation_en: v } : x)) }))} />
                      <Area label="Explanation (JP)" value={g.explanation_jp} onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, explanation_jp: v } : x)) }))} />
                    </div>
                    <div className="space-y-2">
                      <span className="block text-[12px] font-medium text-fg-tertiary">Examples</span>
                      {g.examples.map((ex, ei) => (
                        <div key={ei} className="grid gap-2 sm:grid-cols-2">
                          <Field label={`EN #${ei + 1}`} value={ex.sentence_en} onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, examples: x.examples.map((e2, e2i) => (e2i === ei ? { ...e2, sentence_en: v } : e2)) } : x)) }))} />
                          <Field label={`JP #${ei + 1}`} value={ex.sentence_jp} onChange={(v) => patch((r) => ({ ...r, grammar_points: r.grammar_points.map((x, xi) => (xi === i ? { ...x, examples: x.examples.map((e2, e2i) => (e2i === ei ? { ...e2, sentence_jp: v } : e2)) } : x)) }))} />
                        </div>
                      ))}
                    </div>
                  </ItemCard>
                ))}
                <AddButton label="Add grammar point" onClick={() => patch((r) => ({ ...r, grammar_points: [...r.grammar_points, { id: rid('grammar'), title_en: '', title_jp: '', pattern: '', explanation_en: '', explanation_jp: '', examples: [{ sentence_en: '', sentence_jp: '' }] }] }))} />
              </SectionCard>

              {/* Homework */}
              <SectionCard title="Homework">
                {data.homework.map((h, i) => (
                  <ItemCard key={h.id} onRemove={() => patch((r) => ({ ...r, homework: r.homework.filter((_, x) => x !== i) }))}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Area label="Task (EN)" value={h.task_en} onChange={(v) => patch((r) => ({ ...r, homework: r.homework.map((x, xi) => (xi === i ? { ...x, task_en: v } : x)) }))} />
                      <Area label="Task (JP)" value={h.task_jp} onChange={(v) => patch((r) => ({ ...r, homework: r.homework.map((x, xi) => (xi === i ? { ...x, task_jp: v } : x)) }))} />
                    </div>
                    <Area label="Answer key (EN) — instructor-only, hidden from the student" value={h.answer_key_en ?? ''} onChange={(v) => patch((r) => ({ ...r, homework: r.homework.map((x, xi) => (xi === i ? { ...x, answer_key_en: v || undefined } : x)) }))} />
                  </ItemCard>
                ))}
                <AddButton label="Add homework" onClick={() => patch((r) => ({ ...r, homework: [...r.homework, { id: rid('hw'), task_en: '', task_jp: '' }] }))} />
              </SectionCard>

              {/* Next session */}
              <SectionCard title="Next session focus">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Area label="Focus (EN)" value={data.next_session_focus.focus_en} onChange={(v) => patch((r) => ({ ...r, next_session_focus: { ...r.next_session_focus, focus_en: v } }))} />
                  <Area label="Focus (JP)" value={data.next_session_focus.focus_jp} onChange={(v) => patch((r) => ({ ...r, next_session_focus: { ...r.next_session_focus, focus_jp: v } }))} />
                </div>
              </SectionCard>

              {/* Instructor analysis (private) */}
              <SectionCard title="Instructor analysis (private — never shown to the student)">
                <Area label="" value={data.instructor_analysis} rows={5} onChange={(v) => patch((r) => ({ ...r, instructor_analysis: v }))} />
                <Area label="Margin notes (private)" value={marginNotes} onChange={(v) => { setMarginNotes(v); setDirty(true); }} rows={2} />
              </SectionCard>

              {/* Save */}
              <div className="sticky bottom-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-5 py-2.5 text-[14px] font-medium text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {msg && (
                  <span className={`text-[13px] ${msg.ok ? 'text-accent-teal' : 'text-red-600'}`}>
                    {msg.text}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
