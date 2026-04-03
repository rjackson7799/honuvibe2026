// lib/survey/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';

export type SurveyTokenResult = {
  userId: string;
  assignmentId: string;
  userName: string;
  surveySlug: string;
  status: 'pending' | 'completed';
} | null;

export async function validateSurveyToken(token: string): Promise<SurveyTokenResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('survey_assignments')
    .select(`
      id,
      status,
      user_id,
      survey:surveys(slug),
      user:users(full_name)
    `)
    .eq('token', token)
    .single();

  if (error || !data) return null;

  const survey = data.survey as unknown as { slug: string } | null;
  const user = data.user as unknown as { full_name: string | null } | null;

  return {
    userId: data.user_id,
    assignmentId: data.id,
    userName: user?.full_name ?? '',
    surveySlug: survey?.slug ?? '',
    status: data.status as 'pending' | 'completed',
  };
}
