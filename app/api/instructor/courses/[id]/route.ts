import { NextRequest, NextResponse } from 'next/server';
import { updateInstructorProposal } from '@/lib/instructor-portal/actions';
import type { CourseProposalInput } from '@/lib/instructor-portal/types';

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Partial<CourseProposalInput>;

    const input: CourseProposalInput = {
      title_en: String(body.title_en ?? ''),
      description_en: String(body.description_en ?? ''),
      level: (body.level ?? 'beginner') as CourseProposalInput['level'],
      learning_outcomes_en: Array.isArray(body.learning_outcomes_en)
        ? body.learning_outcomes_en.map(String)
        : [],
      who_is_for_en: Array.isArray(body.who_is_for_en) ? body.who_is_for_en.map(String) : [],
      tools_covered: Array.isArray(body.tools_covered) ? body.tools_covered.map(String) : [],
      price_usd: Number(body.price_usd ?? 0),
      price_jpy: Number(body.price_jpy ?? 0),
    };

    await updateInstructorProposal(id, input);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/instructor/courses/[id]] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
