import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCourseMarkdown } from '@/lib/courses/parser';

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
    const { markdown, filename } = await request.json();

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Markdown content is required' }, { status: 400 });
    }

    // Save upload record
    const { data: upload, error: uploadError } = await supabase
      .from('course_uploads')
      .insert({
        admin_user_id: user.id,
        filename: filename || 'pasted_content.md',
        raw_markdown: markdown,
        status: 'parsing',
      })
      .select()
      .single();

    if (uploadError) throw uploadError;

    // Parse with Claude API
    const parsedData = await parseCourseMarkdown(markdown);

    // Update upload record with parsed data
    await supabase
      .from('course_uploads')
      .update({
        parsed_json: parsedData as unknown as Record<string, unknown>,
        status: 'parsed',
      })
      .eq('id', upload.id);

    return NextResponse.json({
      uploadId: upload.id,
      parsedData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parsing failed';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
