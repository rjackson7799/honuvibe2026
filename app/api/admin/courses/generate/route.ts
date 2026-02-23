import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCourseFromWizard } from '@/lib/courses/generator';
import type { WizardParams } from '@/lib/courses/types';

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

  let uploadId: string | null = null;

  try {
    const { wizardParams } = (await request.json()) as { wizardParams: WizardParams };

    if (!wizardParams?.title || !wizardParams?.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Save upload record for audit trail
    const { data: upload, error: uploadError } = await supabase
      .from('course_uploads')
      .insert({
        admin_user_id: user.id,
        filename: 'wizard-generated',
        raw_markdown: JSON.stringify(wizardParams),
        status: 'parsing',
      })
      .select()
      .single();

    if (uploadError) throw uploadError;
    uploadId = upload.id;

    // Generate with Claude API
    const parsedData = await generateCourseFromWizard(wizardParams);

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
    const message = err instanceof Error ? err.message : 'Generation failed';

    // Update upload record with error if we have one
    if (uploadId) {
      await supabase
        .from('course_uploads')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', uploadId);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
