'use client';

// Seven textareas (title editable, key fixed) with a per-section Preview
// toggle rendering through ProposalBlocks — the parity renderer, so the
// preview shows exactly what the PDF and the client page will show. Read-only
// once issued or while the AI drafts (the trigger would reject the write; the
// UI says why).

import { useState } from 'react';
import { ProposalBlocks } from '@/components/proposal/ProposalBlocks';
import { parseProposalMarkdown } from '@/lib/studio/engagement/proposal-markdown';
import type { ProposalSection } from '@/lib/studio/engagement/proposal-schema';
import { PROPOSAL_AI_SECTION_KEYS, PROPOSAL_REQUIRED_SECTION_KEYS } from '@/lib/studio/engagement/types';

const previewCls =
  'text-[13px] text-fg-secondary [&_h3]:text-[14px] [&_h3]:font-bold [&_h3]:text-fg-primary [&_h3]:mt-2 [&_h4]:text-[13px] [&_h4]:font-bold [&_h4]:text-fg-primary [&_h4]:mt-2 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-fg-primary';

export function ProposalSectionsEditor({
  sections,
  onChange,
  readOnly,
  lockMessage,
}: {
  sections: ProposalSection[];
  onChange: (sections: ProposalSection[]) => void;
  readOnly: boolean;
  /** Shown above the editor when readOnly (why edits are refused). */
  lockMessage?: string | null;
}) {
  const [preview, setPreview] = useState<Record<string, boolean>>({});

  function update(key: string, patch: Partial<ProposalSection>) {
    onChange(sections.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-4">
      {readOnly && lockMessage && (
        <div className="rounded-lg border border-border-default bg-bg-tertiary px-4 py-2.5 text-[13px] text-fg-secondary">{lockMessage}</div>
      )}
      {sections.map((s) => {
        const required = (PROPOSAL_REQUIRED_SECTION_KEYS as readonly string[]).includes(s.key);
        const ai = (PROPOSAL_AI_SECTION_KEYS as readonly string[]).includes(s.key);
        const showPreview = !!preview[s.key];
        return (
          <div key={s.key} className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                aria-label={`${s.key} title`}
                className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-fg-primary text-base sm:text-sm font-semibold focus:border-accent-teal outline-none disabled:opacity-60"
                value={s.title}
                maxLength={200}
                disabled={readOnly}
                onChange={(e) => update(s.key, { title: e.target.value })}
              />
              <span className="font-mono text-[11px] text-fg-tertiary">{s.key}{required ? ' · required' : ''}{ai ? ' · AI' : ' · yours'}</span>
              <button
                type="button"
                onClick={() => setPreview((p) => ({ ...p, [s.key]: !showPreview }))}
                className="inline-flex items-center min-h-[44px] px-2 text-[12px] font-semibold text-[color:var(--accent-teal)] hover:underline"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div className="rounded-lg border border-border-default bg-bg-secondary p-3 min-h-[60px]">
                {s.body_md.trim() ? <ProposalBlocks blocks={parseProposalMarkdown(s.body_md)} className={previewCls} /> : <p className="text-[13px] text-fg-tertiary">(empty)</p>}
              </div>
            ) : (
              <textarea
                aria-label={`${s.key} body`}
                value={s.body_md}
                maxLength={8000}
                rows={s.key === 'scope' || s.key === 'recommendation' ? 10 : 6}
                disabled={readOnly}
                placeholder={required ? 'Required before Mark ready' : 'Optional'}
                onChange={(e) => update(s.key, { body_md: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-fg-primary text-base sm:text-sm placeholder:text-fg-tertiary focus:border-accent-teal outline-none font-mono disabled:opacity-60"
              />
            )}
          </div>
        );
      })}
      <p className="text-[11.5px] text-fg-tertiary">Markdown subset: paragraphs, # / ## headings, - bullets, **bold**. Anything else prints as literal text — in the preview, the PDF and the client page alike.</p>
    </div>
  );
}
