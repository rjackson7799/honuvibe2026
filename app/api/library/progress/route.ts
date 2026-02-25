import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_id, progress_percent } = await request.json();

    if (!video_id || typeof progress_percent !== 'number' || progress_percent < 0 || progress_percent > 100) {
      return NextResponse.json(
        { error: 'Invalid request. Requires video_id and progress_percent (0-100).' },
        { status: 400 },
      );
    }

    const completed = progress_percent >= 80;

    const { error } = await supabase
      .from('user_library_progress')
      .upsert(
        {
          user_id: user.id,
          video_id,
          progress_percent: Math.round(progress_percent),
          completed,
          last_watched_at: new Date().toISOString(),
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,video_id' },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
