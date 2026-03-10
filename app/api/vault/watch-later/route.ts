import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVaultUserBookmarks } from '@/lib/vault/queries';
import { toggleBookmark } from '@/lib/vault/actions';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const items = await getVaultUserBookmarks(user.id, 'watch_later');
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch watch later items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { contentItemId } = await request.json();
    if (!contentItemId) {
      return NextResponse.json({ error: 'Missing contentItemId' }, { status: 400 });
    }
    const result = await toggleBookmark(contentItemId, 'watch_later');
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to toggle watch later' }, { status: 500 });
  }
}
