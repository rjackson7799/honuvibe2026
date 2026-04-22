import { NextRequest, NextResponse } from 'next/server';
import { approveProposal, rejectProposal } from '@/lib/instructor-portal/actions';

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    if (body.action === 'approve') {
      await approveProposal(id);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'reject') {
      if (!body.reviewNotes) {
        return NextResponse.json({ error: 'reviewNotes is required' }, { status: 400 });
      }
      await rejectProposal(id, String(body.reviewNotes));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/courses/[id]/proposal PATCH] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
