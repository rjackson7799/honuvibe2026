import { NextRequest, NextResponse, after } from 'next/server';
import { regenerateSurveySummary } from '@/lib/survey/summarize';
import { generateAndSendStudentProfile } from '@/lib/survey/profile';
import { createClient } from '@supabase/supabase-js';
import { getResendClient, getFromAddress } from '@/lib/email/client';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Required field validation
    const requiredFields = [
      'name',
      'professional_background',
      'role_description',
      'ai_knowledge_level',
      'ai_tools_used',
      'ai_usage_frequency',
      'learning_reasons',
      'ai_help_with',
      'success_definition',
      'current_feeling',
      'has_laptop',
      'used_zoom_before',
    ];

    for (const field of requiredFields) {
      const value = data[field];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Enforce max 3 on ai_help_with
    if (Array.isArray(data.ai_help_with) && data.ai_help_with.length > 3) {
      return NextResponse.json(
        { error: 'Please select at most 3 items for what you want AI to help with.' },
        { status: 400 },
      );
    }

    // Insert into Supabase (service role bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Resolve user_id from assignment if assignmentId provided
      const assignmentId =
        typeof data.assignmentId === 'string' && data.assignmentId.length > 0
          ? data.assignmentId
          : null;

      let userId: string | null = null;
      if (assignmentId) {
        const { data: assignment } = await supabase
          .from('survey_assignments')
          .select('user_id')
          .eq('id', assignmentId)
          .single();
        userId = (assignment as { user_id: string } | null)?.user_id ?? null;
      }

      const { error: dbError } = await supabase.from('survey_responses').insert({
        course_slug: 'ai-essentials',
        name: data.name,
        professional_background: data.professional_background,
        role_description: data.role_description,
        ai_knowledge_level: data.ai_knowledge_level,
        ai_tools_used: data.ai_tools_used,
        ai_usage_frequency: data.ai_usage_frequency,
        learning_reasons: data.learning_reasons,
        ai_help_with: data.ai_help_with,
        success_definition: data.success_definition,
        current_feeling: data.current_feeling,
        specific_interests: data.specific_interests ?? null,
        has_laptop: data.has_laptop,
        used_zoom_before: data.used_zoom_before,
        user_id: userId,
        assignment_id: assignmentId,
      });

      if (dbError) {
        console.error('[Survey] DB insert failed:', dbError.message);
        return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
      }

      // Mark assignment completed
      if (assignmentId) {
        const { error: assignmentError } = await supabase
          .from('survey_assignments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', assignmentId);

        if (assignmentError) {
          console.error('[Survey] Failed to mark assignment completed:', assignmentError.message);
        }
      }

      // Fire-and-forget: regenerate cohort AI summary in background
      after(() => regenerateSurveySummary('ai-essentials'));

      // Fire-and-forget: generate + send personalized AI study profile to student
      if (assignmentId && userId) {
        after(() => generateAndSendStudentProfile({
          userId,
          surveyData: data as Parameters<typeof generateAndSendStudentProfile>[0]['surveyData'],
        }));
      }
    }

    // Fire-and-forget admin notification email
    const notificationEmail =
      process.env.SURVEY_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;

    if (notificationEmail) {
      const resend = getResendClient();
      if (resend) {
        void resend.emails.send({
          from: getFromAddress(),
          to: notificationEmail,
          subject: `[AI Essentials] New survey response — ${data.name}`,
          html: buildSurveyEmailHtml(data),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildSurveyEmailHtml(data: Record<string, unknown>): string {
  const tools = Array.isArray(data.ai_tools_used)
    ? (data.ai_tools_used as string[]).join(', ')
    : '';
  const reasons = Array.isArray(data.learning_reasons)
    ? (data.learning_reasons as string[]).join(', ')
    : '';
  const helpWith = Array.isArray(data.ai_help_with)
    ? (data.ai_help_with as string[]).join(', ')
    : '';
  const interests = data.specific_interests
    ? `<p><strong>Additional thoughts:</strong><br>${data.specific_interests}</p>`
    : '';

  return `
    <h2>New AI Essentials Pre-Course Survey Response</h2>
    <hr>
    <h3>About</h3>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Background:</strong> ${data.professional_background}</p>
    <p><strong>Role:</strong> ${data.role_description}</p>
    <hr>
    <h3>AI Experience</h3>
    <p><strong>Knowledge Level:</strong> ${data.ai_knowledge_level}</p>
    <p><strong>Tools Used:</strong> ${tools}</p>
    <p><strong>Usage Frequency:</strong> ${data.ai_usage_frequency}</p>
    <hr>
    <h3>Goals</h3>
    <p><strong>Why Learning AI:</strong> ${reasons}</p>
    <p><strong>Wants AI to Help With:</strong> ${helpWith}</p>
    <hr>
    <h3>Expectations</h3>
    <p><strong>Success Looks Like:</strong> ${data.success_definition}</p>
    <p><strong>Current Feeling:</strong> ${data.current_feeling}</p>
    ${interests}
    <hr>
    <h3>Logistics</h3>
    <p><strong>Has Laptop:</strong> ${data.has_laptop}</p>
    <p><strong>Used Zoom Before:</strong> ${data.used_zoom_before}</p>
  `;
}
