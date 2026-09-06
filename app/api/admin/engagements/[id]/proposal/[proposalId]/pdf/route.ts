// GET /api/admin/engagements/[id]/proposal/[proposalId]/pdf — admin-only.
//   issued rows (issued_pdf_path set: sent / accepted / voided, and a
//   withdrawn / superseded row that was issued)  → STREAM THE ARCHIVED BYTES
//   from the private bucket. Never re-rendered: a later font or renderer
//   change cannot alter an issued document. The sha256 is asserted against
//   the stored bytes and a mismatch is logged (not surfaced).
//   draft | ready (and an unissued withdrawn / superseded row) → a LIVE
//   preview rendered from a snapshot built on the fly, with the
//   "PREVIEW — not issued" band.
// Content-Disposition: attachment, ASCII-slugged filename, no-store.

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateProposalPdf } from '@/lib/studio/engagement/generate-proposal-pdf';
import {
  ENGAGEMENT_DOCUMENTS_BUCKET,
  buildIssuedSnapshot,
  buildProposalDocModel,
  issuedSnapshotSchema,
  proposalFileName,
} from '@/lib/studio/engagement/proposal-document';
import type { Engagement, EngagementProposal } from '@/lib/admin/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', status: 401 as const };
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Not authorized', status: 403 as const };
  return { user };
}

function pdfResponse(bytes: Buffer, fileName: string): NextResponse {
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.length),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  const gate = await requireAdmin();
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id, proposalId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: eRow }, { data: pRow }] = await Promise.all([
    admin.from('engagements').select('*').eq('id', id).maybeSingle(),
    admin.from('engagement_proposals').select('*').eq('id', proposalId).eq('engagement_id', id).maybeSingle(),
  ]);
  const engagement = (eRow ?? null) as Engagement | null;
  const proposal = (pRow ?? null) as EngagementProposal | null;
  if (!engagement || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  try {
    if (proposal.issued_pdf_path) {
      const { data, error } = await admin.storage.from(ENGAGEMENT_DOCUMENTS_BUCKET).download(proposal.issued_pdf_path);
      if (error || !data) {
        console.error('[admin/proposal/pdf] archive download failed:', error?.message);
        return NextResponse.json({ error: 'The archived PDF could not be read.' }, { status: 500 });
      }
      const bytes = Buffer.from(await data.arrayBuffer());
      const sha = createHash('sha256').update(bytes).digest('hex');
      if (proposal.issued_pdf_sha256 && sha !== proposal.issued_pdf_sha256) {
        console.error(`[admin/proposal/pdf] sha256 mismatch for ${proposal.id}: stored ${proposal.issued_pdf_sha256}, got ${sha}`);
      }
      const snap = issuedSnapshotSchema.safeParse(proposal.issued_snapshot);
      const business = snap.success ? snap.data.cover.business_name : engagement.title;
      return pdfResponse(bytes, proposalFileName(business, proposal.version));
    }

    // Live preview of an unissued row — watermarked.
    const snapshot = buildIssuedSnapshot(proposal, engagement, new Date());
    const model = buildProposalDocModel(snapshot, { validUntil: proposal.valid_until, preview: true });
    const bytes = await generateProposalPdf(model);
    return pdfResponse(bytes, proposalFileName(engagement.title, proposal.version).replace(/\.pdf$/, '-PREVIEW.pdf'));
  } catch (err) {
    console.error('[admin/proposal/pdf] failed:', err);
    return NextResponse.json({ error: 'Failed to produce the PDF.' }, { status: 500 });
  }
}
