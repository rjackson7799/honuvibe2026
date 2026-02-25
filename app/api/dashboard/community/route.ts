import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityLinksForStudent } from '@/lib/dashboard/queries';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const links = await getCommunityLinksForStudent(user.id);

  return NextResponse.json({ links });
}
