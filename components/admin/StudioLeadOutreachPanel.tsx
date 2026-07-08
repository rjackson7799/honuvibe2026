'use client';

// Outreach email workspace for a lead (edit-mode only). "Generate" hits the
// Claude-backed route, drops the result into editable subject/body fields, and
// shows the generated-at timestamp without a page refresh. "Save draft" persists
// hand-edits. Two independent copy affordances — the subject icon copies the
// subject only; "Copy email" copies the body only (no "Subject:" prefix) — so
// each pastes into its own mail-client field.

import { useState } from 'react';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { saveOutreachEmail } from '@/lib/studio/lead-actions';
import type { StudioLeadDetail } from '@/lib/admin/types';

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';

export function StudioLeadOutreachPanel({ lead }: { lead: StudioLeadDetail }) {
  const [subject, setSubject] = useState(lead.outreach_email_subject ?? '');
  const [body, setBody] = useState(lead.outreach_email_body ?? '');
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    lead.outreach_email_generated_at,
  );

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const hasContent = subject.trim() !== '' || body.trim() !== '';

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/studio-leads/${lead.id}/outreach`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Generation failed.');
        return;
      }
      setSubject(data.subject);
      setBody(data.body);
      setGeneratedAt(data.generated_at);
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveOutreachEmail(lead.id, { subject, body });
      setMessage('Draft saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, mark: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      mark(true);
      setTimeout(() => mark(false), 1500);
    } catch {
      setError('Copy failed — your browser blocked clipboard access.');
    }
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Outreach email</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          {generating
            ? 'Generating…'
            : hasContent
              ? 'Regenerate'
              : 'Generate email'}
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-border-default bg-bg-primary px-4 py-2.5 text-[13px] text-fg-secondary">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      <label className="block">
        <span className="block text-[13px] font-medium text-fg-secondary mb-1">
          Subject
        </span>
        <div className="flex items-center gap-2">
          <input
            className={inputCls}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line…"
          />
          <button
            type="button"
            onClick={() => copy(subject, setCopiedSubject)}
            disabled={subject.trim() === ''}
            title="Copy subject"
            aria-label="Copy subject"
            className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg bg-bg-primary border border-border-default text-fg-tertiary hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
          >
            {copiedSubject ? (
              <Check size={15} className="text-[color:var(--accent-teal)]" />
            ) : (
              <Copy size={15} />
            )}
          </button>
        </div>
      </label>

      <label className="block">
        <span className="block text-[13px] font-medium text-fg-secondary mb-1">
          Body
        </span>
        <textarea
          className={inputCls}
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email body…"
        />
      </label>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => copy(body, setCopiedBody)}
          disabled={body.trim() === ''}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {copiedBody ? (
            <>
              <Check size={14} className="text-[color:var(--accent-teal)]" /> Copied ✓
            </>
          ) : (
            <>
              <Copy size={14} /> Copy email
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        {generatedAt && (
          <span className="text-[12px] text-fg-tertiary">
            Generated{' '}
            {new Date(generatedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </section>
  );
}
