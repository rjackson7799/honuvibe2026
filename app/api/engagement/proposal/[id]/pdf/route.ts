// GET /api/engagement/proposal/[id]/pdf — the client's download of the
// ARCHIVED proposal PDF (slice 3, slice B). Cookie-authenticated
// (authorizeProposalSession: 403 / 410 exactly as the page), rate-limited
// 30 / 1 h per proposal id. This is the admin route's archived-bytes branch
// ONLY: the stored object is streamed from the private bucket — never
// re-rendered, so what the client downloads is byte-identical to what Ryan
// archived at issue (the sha256 is asserted against the stored bytes and a
// mismatch is logged, not surfaced). A token only exists on an issued row,
// so issued_pdf_path is always set here; its absence is a data fault (404).
// Content-Disposition: attachment, ASCII-slugged filename, no-store.

import { createHash } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { tryConsume } from '@/lib/community/rate-limit';
import { authorizeProposalSession } from '@/lib/studio/engagement/proposal-session';
import { ENGAGEMENT_DOCUMENTS_BUCKET, issuedSnapshotSchema, proposalFileName } from '@/lib/studio/engagement/proposal-document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PDF_LIMIT = 30;
const PDF_WINDOW_MS = 60 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'forbidden' }, 403);

  const auth = await authorizeProposalSession(id);
  if (!auth.ok) {
    const error = auth.status === 410 ? 'link_expired' : auth.status === 503 ? 'unavailable' : 'forbidden';
    return json({ error }, auth.status);
  }
  const { proposal, supabase } = auth;

  // After auth on purpose: an unauthenticated caller who knows the UUID must
  // not be able to drain the legitimate client's per-proposal bucket.
  if (!tryConsume(`engp-pdf:${proposal.id}`, PDF_LIMIT, PDF_WINDOW_MS)) {
    return json({ error: 'rate_limited' }, 429);
  }

  if (!proposal.issued_pdf_path) {
    console.error(`[engagement/proposal/pdf] no archived PDF on an issued row ${proposal.id}`);
    return json({ error: 'not_found' }, 404);
  }

  try {
    const { data, error } = await supabase.storage.from(ENGAGEMENT_DOCUMENTS_BUCKET).download(proposal.issued_pdf_path);
    if (error || !data) {
      console.error('[engagement/proposal/pdf] archive download failed:', error?.message);
      return json({ error: 'unavailable' }, 500);
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (proposal.issued_pdf_sha256 && sha !== proposal.issued_pdf_sha256) {
      console.error(`[engagement/proposal/pdf] sha256 mismatch for ${proposal.id}`);
    }
    const snap = issuedSnapshotSchema.safeParse(proposal.issued_snapshot);
    const business = snap.success ? snap.data.cover.business_name : 'client';
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.length),
        'Content-Disposition': `attachment; filename="${proposalFileName(business, proposal.version)}"`,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (err) {
    console.error('[engagement/proposal/pdf] failed:', err);
    return json({ error: 'unavailable' }, 500);
  }
}
