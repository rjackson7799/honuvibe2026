import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_id, action } = await request.json();

    if (!video_id || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. Requires video_id and action (add|remove).' },
        { status: 400 },
      );
    }

    if (action === 'add') {
      const { error } = await supabase
        .from('user_library_favorites')
        .upsert({ user_id: user.id, video_id });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('user_library_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', video_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
