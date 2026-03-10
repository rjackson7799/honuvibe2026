import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPathWithItems,
  archivePath,
  updatePathLastAccessed,
} from '@/lib/paths/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const path = await getPathWithItems(id);

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    if (path.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update last accessed timestamp (non-blocking)
    updatePathLastAccessed(id).catch(console.error);

    return NextResponse.json({ path });
  } catch (error) {
    console.error('Error fetching path:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify ownership
    const path = await getPathWithItems(id);
    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }
    if (path.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();

    if (body.status === 'archived') {
      await archivePath(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid update operation' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Error updating path:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
