import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { regenerateSurveySummary } from '@/lib/survey/summarize';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth: admin only
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Fetch the course_slug before deleting so we can regenerate the summary
    const { data: response, error: fetchError } = await adminSupabase
      .from('survey_responses')
      .select('course_slug')
      .eq('id', id)
      .single();

    if (fetchError || !response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    const { error: deleteError } = await adminSupabase
      .from('survey_responses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 });
    }

    // Regenerate cohort summary in the background
    regenerateSurveySummary(response.course_slug).catch((err) =>
      console.error('[Admin] Summary regeneration after delete failed:', err),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin] Survey delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
