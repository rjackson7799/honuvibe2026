import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current count and increment
    const { data: download, error: fetchError } = await supabase
      .from('vault_downloads')
      .select('download_count')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !download) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('vault_downloads')
      .update({ download_count: (download.download_count ?? 0) + 1 })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
