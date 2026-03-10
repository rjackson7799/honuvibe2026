import { NextRequest, NextResponse } from 'next/server';
import { deleteNote } from '@/lib/vault/actions';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
    }
    await deleteNote(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
