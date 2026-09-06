// "Seed from proposal scope" — the NON-AI candidate extractor (slice 4B,
// decision 7). Pure: no DB, no model call, no React.
//
// The accepted proposal's `scope` section already lists, in Ryan's own words,
// what will be delivered. Its top-level markdown bullets ARE the deliverables,
// so this reads them with the one markdown parser the page, the PDF and the
// editor preview already share (proposal-markdown.ts) rather than inventing a
// second interpretation of the same text.
//
// The result is a CANDIDATE list, not a commitment: the panel renders it as an
// editable checklist and only what Ryan confirms is inserted. That review-first
// UI is also the seam for a later AI extractor — swap this function, keep the
// flow.

import { blocksToText, parseProposalMarkdown } from './proposal-markdown';

/** Deliverable titles are capped at 200 chars by the table CHECK. */
export const DELIVERABLE_TITLE_MAX = 200;

export interface DeliverableCandidate {
  title: string;
}

type SnapshotSection = { key?: unknown; body_md?: unknown };

/** The scope section's body from an issued_snapshot, whatever shape it is in. */
function scopeBodyOf(issuedSnapshot: unknown): string {
  if (!issuedSnapshot || typeof issuedSnapshot !== 'object') return '';
  const sections = (issuedSnapshot as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return '';
  const scope = (sections as SnapshotSection[]).find((s) => s?.key === 'scope');
  return typeof scope?.body_md === 'string' ? scope.body_md : '';
}

/**
 * The scope's TOP-LEVEL BULLETS as candidate deliverables, in document order.
 *
 * Bold is stripped (`blocksToText` returns text content, so `- **Homepage**
 * redesign` becomes `Homepage redesign`); paragraphs and headings are ignored
 * — they are framing, not line items; blanks are dropped; a title longer than
 * the column allows is truncated; and duplicates are removed case- and
 * whitespace-insensitively so the same item listed under two phases seeds once.
 */
export function scopeBulletsToDeliverables(issuedSnapshot: unknown): DeliverableCandidate[] {
  const blocks = parseProposalMarkdown(scopeBodyOf(issuedSnapshot));
  const seen = new Set<string>();
  const out: DeliverableCandidate[] = [];

  for (const block of blocks) {
    if (block.type !== 'bullets') continue;
    for (const item of block.items) {
      const title = blocksToText([{ type: 'paragraph', spans: item }]).replace(/\s+/g, ' ').trim();
      if (!title) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ title: title.slice(0, DELIVERABLE_TITLE_MAX) });
    }
  }
  return out;
}
