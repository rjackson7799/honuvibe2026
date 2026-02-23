import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCourseFromParsedData } from '@/lib/courses/actions';
import type { ParsedCourseData } from '@/lib/courses/types';

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Admin check
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const { parsedData, uploadId, startDate } = await request.json();

    if (!parsedData || !uploadId) {
      return NextResponse.json({ error: 'Parsed data and upload ID are required' }, { status: 400 });
    }

    const result = await createCourseFromParsedData(
      parsedData as ParsedCourseData,
      uploadId,
      startDate,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Course creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
