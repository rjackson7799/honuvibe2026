import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVaultUserNotes } from '@/lib/vault/queries';
import { saveNote } from '@/lib/vault/actions';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const notes = await getVaultUserNotes(user.id);
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { contentItemId, noteText, timestampSeconds } = await request.json();
    if (!contentItemId || typeof noteText !== 'string') {
      return NextResponse.json({ error: 'Missing contentItemId or noteText' }, { status: 400 });
    }
    const result = await saveNote(contentItemId, noteText, timestampSeconds);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
