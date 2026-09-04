'use client';

// Studio lead editor — create or edit a single lead, following the workbench
// scenario-form pattern: one draft object backs every field, dirty state is
// tracked against a JSON snapshot, and save/error feedback is inline (no modals,
// no toasts). Fields speak the aliased vocabulary (full_name/company/status);
// lib/studio/lead-actions.ts maps them to leads-table columns. Status + preview
// fields (and the outreach panel) are edit-mode only — a new lead always starts
// at status 'new', and preview/outreach only make sense once a lead exists.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { createLead, updateLead } from '@/lib/studio/lead-actions';
import { startEngagement } from '@/lib/studio/engagement/engagement-actions';
import { STAGE_LABELS } from '@/lib/studio/engagement/stages';
import { StatusBadge } from './StatusBadge';
import { StudioLeadOutreachPanel } from './StudioLeadOutreachPanel';
import { StudioLeadAuditPanel } from './StudioLeadAuditPanel';
import type { EngagementRef, StudioLeadDetail, StudioLeadStatus } from '@/lib/admin/types';

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';
const labelCls = 'block text-[13px] font-medium text-fg-secondary mb-1';

const STATUS_OPTIONS: StudioLeadStatus[] = [
  'new',
  'qualified',
  'proposal',
  'won',
  'lost',
];

type LeadDraft = {
  company: string;
  full_name: string;
  email: string;
  phone: string;
  industry: string;
  existing_url: string;
  status: StudioLeadStatus;
  notes: string;
  preview_url: string;
  preview_password: string;
};

function draftFromLead(lead: StudioLeadDetail | null): LeadDraft {
  return {
    company: lead?.company ?? '',
    full_name: lead?.full_name ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    industry: lead?.industry ?? '',
    existing_url: lead?.existing_url ?? '',
    status: lead?.status ?? 'new',
    notes: lead?.notes ?? '',
    preview_url: lead?.preview_url ?? '',
    preview_password: lead?.preview_password ?? '',
  };
}

export function AdminStudioLeadForm({
  lead,
  engagement,
}: {
  lead: StudioLeadDetail | null;
  /** The lead's engagement (067). When present it owns the sales stage. */
  engagement: EngagementRef | null;
}) {
  const router = useRouter();
  const isCreate = lead === null;

  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [draft, setDraft] = useState<LeadDraft>(() => draftFromLead(lead));
  const [snapshot, setSnapshot] = useState<string>(() =>
    JSON.stringify(draftFromLead(lead)),
  );

  const dirty = JSON.stringify(draft) !== snapshot;
  const canSubmit = draft.company.trim() !== '';

  // Warn before a full navigation/refresh loses unsaved edits. Client-side route
  // changes are covered by the back-link confirm below.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function set<K extends keyof LeadDraft>(key: K, value: LeadDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setSaveMessage('');
    setSaveError('');
    try {
      await fn();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    await run(async () => {
      const { id } = await createLead({
        company: draft.company,
        full_name: draft.full_name,
        email: draft.email,
        phone: draft.phone,
        industry: draft.industry,
        existing_url: draft.existing_url,
        notes: draft.notes,
      });
      // App Router keeps this client component mounted across the new→[id]
      // navigation (same component, same position), so reset the dirty snapshot
      // here — otherwise `draft` (typed) vs the stale all-blank `snapshot` reads
      // as unsaved and fires a false "unsaved changes" warning on the next click.
      setSnapshot(JSON.stringify(draft));
      // Navigate to the workspace; the detail page re-renders in edit mode.
      router.replace(`/admin/studio/leads/${id}`);
    });
  }

  async function handleSave() {
    await run(async () => {
      await updateLead(lead!.id, {
        company: draft.company,
        full_name: draft.full_name,
        email: draft.email,
        phone: draft.phone,
        industry: draft.industry,
        existing_url: draft.existing_url,
        // Once an engagement exists its stage drives sales_stage through the
        // 067 mirror — the payload omits status entirely (updateLead also
        // refuses a status change for an engaged lead, server-side).
        ...(engagement ? {} : { status: draft.status }),
        notes: draft.notes,
        preview_url: draft.preview_url,
        preview_password: draft.preview_password,
      });
      setSnapshot(JSON.stringify(draft));
      setSaveMessage('Saved.');
      router.refresh();
    });
  }

  async function handleStartEngagement() {
    await run(async () => {
      const { engagementId } = await startEngagement(lead!.id);
      router.push(`/admin/studio/engagements/${engagementId}`);
    });
  }

  // Start needs the SAVED status to be qualified (the RPC reads the row, not
  // the draft), and no unsaved edits that navigating away would lose.
  const canStartEngagement = !isCreate && lead!.status === 'qualified' && !dirty;

  function handleBack(e: React.MouseEvent) {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      e.preventDefault();
    }
  }

  const previewUrlValid = useMemo(() => {
    const v = draft.preview_url.trim();
    if (v === '') return false;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }, [draft.preview_url]);

  return (
    <div className="max-w-[880px] space-y-6">
      <a
        href="/admin/studio/leads"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft size={15} /> All leads
      </a>

      <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
        {isCreate ? 'New Lead' : draft.company || 'Untitled lead'}
      </h1>

      {saveMessage && (
        <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-secondary">
          {saveMessage}
        </div>
      )}
      {saveError && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {saveError}
        </div>
      )}

      <Section title="Business & contact">
        <Labeled label="Company / business name (required)">
          <input
            className={inputCls}
            value={draft.company}
            onChange={(e) => set('company', e.target.value)}
            placeholder="Hawaii Palms Café"
          />
        </Labeled>
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Contact person">
            <input
              className={inputCls}
              value={draft.full_name}
              onChange={(e) => set('full_name', e.target.value)}
            />
          </Labeled>
          <Labeled label="Contact email">
            <input
              type="email"
              className={inputCls}
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Labeled>
          <Labeled label="Phone">
            <input
              className={inputCls}
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Labeled>
          <Labeled label="Industry">
            <input
              className={inputCls}
              value={draft.industry}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="Restaurant, salon, clinic…"
            />
          </Labeled>
        </div>
        <Labeled label="Current website">
          <input
            className={inputCls}
            value={draft.existing_url}
            onChange={(e) => set('existing_url', e.target.value)}
            placeholder="https://…"
          />
        </Labeled>
        <Labeled label="Notes">
          <textarea
            className={inputCls}
            rows={4}
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Labeled>
      </Section>

      {!isCreate && (
        <Section title="Pipeline & preview">
          {engagement ? (
            // Replaced, not hidden: the stage is engagement-derived now.
            <div className="block">
              <span className={labelCls}>Sales stage</span>
              <div className="flex items-center gap-3 flex-wrap rounded-lg bg-bg-primary border border-border-default px-3 py-2.5 min-h-[44px]">
                <StatusBadge status={lead!.status} />
                <span className="text-[13px] text-fg-tertiary">
                  Managed by the engagement (stage: {STAGE_LABELS[engagement.stage]})
                </span>
                <Link
                  href={`/admin/studio/engagements/${engagement.id}`}
                  className="text-[12px] font-semibold text-[color:var(--accent-teal)] hover:underline"
                >
                  Open engagement →
                </Link>
              </div>
            </div>
          ) : (
            <Labeled label="Sales stage">
              <select
                className={inputCls}
                value={draft.status}
                onChange={(e) => set('status', e.target.value as StudioLeadStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </Labeled>
          )}
          <Labeled
            label={
              <span className="inline-flex items-center gap-2">
                Preview URL
                {previewUrlValid && (
                  <a
                    href={draft.preview_url.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--accent-teal)] hover:underline"
                  >
                    Open <ExternalLink size={12} />
                  </a>
                )}
              </span>
            }
          >
            <input
              className={inputCls}
              value={draft.preview_url}
              onChange={(e) => set('preview_url', e.target.value)}
              placeholder="https://…"
            />
          </Labeled>
          <Labeled label="Preview password (shared gate secret — not a user credential)">
            <input
              className={inputCls}
              value={draft.preview_password}
              onChange={(e) => set('preview_password', e.target.value)}
            />
          </Labeled>
        </Section>
      )}

      {!isCreate && (
        <Section title="Engagement">
          {engagement ? (
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={engagement.stage} />
              <span className="text-[13px] text-fg-secondary">
                This lead has an engagement — stages, discovery and the timeline live there.
              </span>
              <Link
                href={`/admin/studio/engagements/${engagement.id}`}
                className="inline-flex items-center justify-center h-10 px-4 rounded-[10px] bg-bg-primary border border-border-default text-fg-secondary text-[13px] font-semibold hover:text-fg-primary hover:border-border-hover transition-colors"
              >
                Open engagement →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleStartEngagement}
                disabled={busy || !canStartEngagement}
                className="inline-flex items-center justify-center h-10 px-5 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {busy ? 'Starting…' : 'Start engagement'}
              </button>
              <span className="text-[12px] text-fg-tertiary">
                {lead!.status !== 'qualified'
                  ? 'Mark this lead Qualified and save to start an engagement.'
                  : dirty
                    ? 'Save your changes first.'
                    : 'Opens the engagement at Discovery; the lead’s stage is managed there from then on.'}
              </span>
            </div>
          )}
        </Section>
      )}

      <div className="flex items-center gap-3">
        {isCreate ? (
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy || !canSubmit}
            className="inline-flex items-center justify-center h-10 px-5 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {busy ? 'Creating…' : 'Create lead'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !canSubmit || !dirty}
            className="inline-flex items-center justify-center h-10 px-5 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        )}
        {!canSubmit && (
          <span className="text-[12px] text-fg-tertiary">
            Company is required.
          </span>
        )}
      </div>

      {!isCreate && lead && <StudioLeadOutreachPanel lead={lead} />}
      {!isCreate && lead && <StudioLeadAuditPanel lead={lead} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <h2 className="text-[14px] font-bold text-fg-primary">{title}</h2>
      {children}
    </section>
  );
}

function Labeled({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
