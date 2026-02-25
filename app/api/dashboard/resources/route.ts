import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getContentLibrary } from '@/lib/dashboard/queries';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { items, collections } = await getContentLibrary();

  return NextResponse.json({ items, collections });
}
