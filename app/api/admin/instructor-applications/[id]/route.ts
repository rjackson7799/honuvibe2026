import { NextRequest, NextResponse } from 'next/server';
import {
  approveInstructorApplication,
  rejectInstructorApplication,
  saveInstructorApplicationNotes,
} from '@/lib/instructor-applications/actions';

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    if (body.action === 'approve') {
      if (!body.displayName) {
        return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
      }
      const result = await approveInstructorApplication(id, {
        displayName: String(body.displayName),
        titleEn: body.titleEn ? String(body.titleEn) : null,
        titleJp: body.titleJp ? String(body.titleJp) : null,
        bioShortEn: body.bioShortEn ? String(body.bioShortEn) : null,
        bioShortJp: body.bioShortJp ? String(body.bioShortJp) : null,
        reviewNotes: body.reviewNotes ? String(body.reviewNotes) : undefined,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (body.action === 'reject') {
      if (!body.rejectionReason) {
        return NextResponse.json({ error: 'rejectionReason is required' }, { status: 400 });
      }
      await rejectInstructorApplication(id, {
        rejectionReason: String(body.rejectionReason),
        reviewNotes: body.reviewNotes ? String(body.reviewNotes) : undefined,
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'save_notes') {
      await saveInstructorApplicationNotes(id, String(body.reviewNotes ?? ''));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/instructor-applications PATCH] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
