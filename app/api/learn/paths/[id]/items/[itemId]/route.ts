import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markItemComplete } from '@/lib/paths/queries';

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const supabase = await createClient();
    const { id: pathId, itemId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user owns the path
    const { data: path } = await supabase
      .from('study_paths')
      .select('user_id')
      .eq('id', pathId)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }
    if (path.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const result = await markItemComplete(itemId, pathId);

    return NextResponse.json({
      item: result.item,
      pathCompleted: result.pathCompleted,
    });
  } catch (error) {
    console.error('Error updating path item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
