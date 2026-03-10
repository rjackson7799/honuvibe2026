import { NextRequest, NextResponse } from 'next/server';
import { recordView } from '@/lib/vault/actions';

export async function POST(request: NextRequest) {
  try {
    const { contentItemId } = await request.json();
    if (!contentItemId) {
      return NextResponse.json({ error: 'Missing contentItemId' }, { status: 400 });
    }
    await recordView(contentItemId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
