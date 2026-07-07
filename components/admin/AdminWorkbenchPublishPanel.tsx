'use client';

// Publish-readiness panel for the Workbench scenario editor. Shows a live
// checklist (validateScenarioForPublish run client-side against the current
// draft) plus the lifecycle actions. Publish itself stays server-gated — the
// publish action re-validates the saved row — so the panel disables Publish
// while there are unsaved changes.

import Link from 'next/link';
import { Check, Circle, Eye, EyeOff, Star, Trash2, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ReactNode } from 'react';
import type { WorkbenchScenario } from '@/lib/workbench/types';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold disabled:opacity-50 transition-all w-full';
const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-[10px] bg-bg-primary border border-border-default text-fg-secondary text-[13px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors w-full';

type Props = {
  scenario: WorkbenchScenario | null;
  publishErrors: string[];
  dirty: boolean;
  busy: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
  /** AI sanity-check widget (rendered between the checklist and lifecycle actions). */
  sanitySlot?: ReactNode;
};

export function AdminWorkbenchPublishPanel({
  scenario,
  publishErrors,
  dirty,
  busy,
  canCreate,
  onCreate,
  onSave,
  onPublish,
  onUnpublish,
  onToggleFeatured,
  onDelete,
  sanitySlot,
}: Props) {
  const isCreate = scenario === null;
  const ready = publishErrors.length === 0;

  return (
    <aside className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4 lg:sticky lg:top-6">
      {!isCreate && (
        <div className="flex gap-1.5 flex-wrap">
          <StatusBadge status={scenario.is_published ? 'published' : 'draft'} />
          {scenario.is_featured && <StatusBadge status="featured" />}
        </div>
      )}

      {isCreate ? (
        <div className="space-y-2">
          <button className={btnPrimary} disabled={busy || !canCreate} onClick={onCreate}>
            Create scenario
          </button>
          <p className="text-[12px] text-fg-tertiary leading-[1.5]">
            Fill the English fields and pick at least one dimension to create the
            draft. Japanese companions can come later — both languages are
            required to publish.
          </p>
        </div>
      ) : (
        <button className={btnPrimary} disabled={busy || !dirty} onClick={onSave}>
          {dirty ? 'Save changes' : 'Saved'}
        </button>
      )}

      {/* Publish checklist */}
      <div className="space-y-2">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary">
          Publish checklist
        </p>
        {ready ? (
          <p className="flex items-start gap-2 text-[13px] text-fg-secondary">
            <Check size={15} className="text-[color:var(--accent-teal)] mt-0.5 shrink-0" />
            Ready to publish.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {publishErrors.map((error) => (
              <li key={error} className="flex items-start gap-2 text-[13px] text-fg-secondary">
                <Circle size={7} className="text-[color:var(--accent-coral)] mt-[5px] shrink-0 fill-current" />
                {error}
              </li>
            ))}
          </ul>
        )}
        {dirty && !isCreate && (
          <p className="text-[12px] text-fg-tertiary leading-[1.5]">
            Unsaved changes — save first. Publishing checks the saved version.
          </p>
        )}
      </div>

      {sanitySlot}

      {!isCreate && (
        <div className="space-y-2 pt-1 border-t border-border-default">
          {scenario.is_published ? (
            <button className={btnGhost} disabled={busy} onClick={onUnpublish}>
              <EyeOff size={15} /> Unpublish
            </button>
          ) : (
            <button
              className={btnGhost}
              disabled={busy || dirty || !ready}
              onClick={onPublish}
            >
              <Eye size={15} /> Publish
            </button>
          )}
          <button className={btnGhost} disabled={busy} onClick={onToggleFeatured}>
            <Star size={15} /> {scenario.is_featured ? 'Unfeature' : 'Feature'}
          </button>
          <Link
            href={`/admin/workbench/${scenario.id}/preview`}
            className={btnGhost}
          >
            <ExternalLink size={15} /> Preview as member
          </Link>
          <button
            className={`${btnGhost} hover:!text-[color:var(--accent-coral)] hover:!border-[color:var(--accent-coral)]/40`}
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </aside>
  );
}
