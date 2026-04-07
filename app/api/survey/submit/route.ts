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

      const submitterEmail =
        typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null;

      const { error: dbError } = await supabase.from('survey_responses').insert({
        course_slug: 'ai-essentials',
        name: data.name,
        email: submitterEmail,
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
      const surveyData = data as Parameters<typeof generateAndSendStudentProfile>[0]['surveyData'];
      if (assignmentId && userId) {
        after(() => generateAndSendStudentProfile({ userId, surveyData }));
      } else if (submitterEmail) {
        after(() => generateAndSendStudentProfile({ email: submitterEmail, surveyData }));
      }

      // Build admin notification recipient list: fixed admins + all instructors from DB
      const fixedRecipients = ['sperrygroup@gmail.com', 'ryan.jackson.2009@gmail.com'];
      const { data: instructorRows } = await supabase
        .from('users')
        .select('email')
        .eq('role', 'instructor');
      const instructorEmails = (instructorRows ?? [])
        .map((r: { email: string | null }) => r.email)
        .filter((e): e is string => !!e);
      const notifyRecipients = [...new Set([...fixedRecipients, ...instructorEmails])];

      // Fire-and-forget admin notification email
      const resend = getResendClient();
      if (resend && notifyRecipients.length > 0) {
        void resend.emails.send({
          from: getFromAddress(),
          to: notifyRecipients,
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
    ? `<p><strong>Additional thoughts / その他のご関心:</strong><br>${data.specific_interests}</p>`
    : '';

  return `
    <h2>New AI Essentials Pre-Course Survey Response / 新しいアンケート回答</h2>
    <hr>
    <h3>About / 受講生について</h3>
    <p><strong>Name / 氏名:</strong> ${data.name}</p>
    <p><strong>Background / バックグラウンド:</strong> ${data.professional_background}</p>
    <p><strong>Role / 役割:</strong> ${data.role_description}</p>
    <hr>
    <h3>AI Experience / AIの経験</h3>
    <p><strong>Knowledge Level / AIの理解度:</strong> ${data.ai_knowledge_level}</p>
    <p><strong>Tools Used / 使用ツール:</strong> ${tools}</p>
    <p><strong>Usage Frequency / 使用頻度:</strong> ${data.ai_usage_frequency}</p>
    <hr>
    <h3>Goals / 目標</h3>
    <p><strong>Why Learning AI / 学習理由:</strong> ${reasons}</p>
    <p><strong>Wants AI to Help With / AIに任せたいこと:</strong> ${helpWith}</p>
    <hr>
    <h3>Expectations / 期待</h3>
    <p><strong>Success Looks Like / 成功のイメージ:</strong> ${data.success_definition}</p>
    <p><strong>Current Feeling / 現在の気持ち:</strong> ${data.current_feeling}</p>
    ${interests}
    <hr>
    <h3>Logistics / 確認事項</h3>
    <p><strong>Used Zoom Before / Zoom使用経験:</strong> ${data.used_zoom_before}</p>
  `;
}
