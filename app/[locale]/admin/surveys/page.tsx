import { setRequestLocale } from 'next-intl/server';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminSurveyList } from '@/components/admin/AdminSurveyList';
import { SurveySummaryPanel } from '@/components/admin/SurveySummaryPanel';
import type { SurveySummary } from '@/components/admin/SurveySummaryPanel';

export const metadata = {
  title: 'Survey Responses — Admin',
};

export type SurveyResponse = {
  id: string;
  course_slug: string;
  submitted_at: string;
  name: string;
  professional_background: string;
  role_description: string;
  ai_knowledge_level: string;
  ai_tools_used: string[];
  ai_usage_frequency: string;
  learning_reasons: string[];
  ai_help_with: string[];
  success_definition: string;
  current_feeling: string;
  specific_interests: string | null;
  used_zoom_before: string;
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ course?: string }>;
};

export default async function AdminSurveysPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { course = 'ai-essentials' } = await searchParams;
  setRequestLocale(locale);

  const supabase = createAdminClient();
  const { data: responses, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('course_slug', course)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[Admin/Surveys] Failed to load responses:', error.message);
  }

  let summary: SurveySummary | null = null;
  try {
    const { data: summaryData } = await supabase
      .from('survey_summaries')
      .select(`
        id, survey_id, response_count, stats, summary_text,
        key_takeaways, tool_recommendations, instructor_notes, generated_at,
        surveys!inner(slug)
      `)
      .eq('surveys.slug', course)
      .maybeSingle();
    summary = summaryData as SurveySummary | null;
  } catch {
    // surveys table may not exist yet (migration 022 pending)
  }

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-fg-primary">Survey Responses</h1>
        <span className="text-sm text-fg-tertiary">
          {responses?.length ?? 0} response{responses?.length !== 1 ? 's' : ''} · {course}
        </span>
      </div>
      <SurveySummaryPanel summary={summary} responseCount={responses?.length ?? 0} />
      <AdminSurveyList responses={(responses as SurveyResponse[]) ?? []} />
    </div>
  );
}
