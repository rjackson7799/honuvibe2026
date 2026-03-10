import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPaths } from '@/lib/paths/queries';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const paths = await getUserPaths(user.id);

    return NextResponse.json({ paths });
  } catch (error) {
    console.error('Error fetching paths:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
