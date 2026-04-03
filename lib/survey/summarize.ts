import { createAdminClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SurveyResponse {
  ai_knowledge_level: string | null;
  ai_usage_frequency: string | null;
  ai_tools_used: string[] | null;
  learning_reasons: string[] | null;
  ai_help_with: string[] | null;
  current_feeling: string | null;
}

interface Stats {
  ai_knowledge_level: Record<string, number>;
  ai_usage_frequency: Record<string, number>;
  ai_tools_used: Record<string, number>;
  learning_reasons: Record<string, number>;
  ai_help_with: Record<string, number>;
}

interface ClaudeSummary {
  summary_text: string;
  key_takeaways: string[];
  tool_recommendations: string;
  instructor_notes: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countValues(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, val) => {
    acc[val] = (acc[val] ?? 0) + 1;
    return acc;
  }, {});
}

function aggregateStats(responses: SurveyResponse[]): Stats {
  const aiKnowledgeLevels: string[] = [];
  const aiUsageFrequencies: string[] = [];
  const aiToolsUsed: string[] = [];
  const learningReasons: string[] = [];
  const aiHelpWith: string[] = [];

  for (const r of responses) {
    if (r.ai_knowledge_level) aiKnowledgeLevels.push(r.ai_knowledge_level);
    if (r.ai_usage_frequency) aiUsageFrequencies.push(r.ai_usage_frequency);
    if (Array.isArray(r.ai_tools_used)) aiToolsUsed.push(...r.ai_tools_used);
    if (Array.isArray(r.learning_reasons)) learningReasons.push(...r.learning_reasons);
    if (Array.isArray(r.ai_help_with)) aiHelpWith.push(...r.ai_help_with);
  }

  return {
    ai_knowledge_level: countValues(aiKnowledgeLevels),
    ai_usage_frequency: countValues(aiUsageFrequencies),
    ai_tools_used: countValues(aiToolsUsed),
    learning_reasons: countValues(learningReasons),
    ai_help_with: countValues(aiHelpWith),
  };
}

/** Strip PII — keep only the fields safe to send to Claude. */
function anonymize(r: SurveyResponse): Record<string, unknown> {
  return {
    ai_knowledge_level: r.ai_knowledge_level,
    ai_usage_frequency: r.ai_usage_frequency,
    ai_tools_used: r.ai_tools_used,
    learning_reasons: r.learning_reasons,
    ai_help_with: r.ai_help_with,
    current_feeling: r.current_feeling,
  };
}

function isClaudeSummary(value: unknown): value is ClaudeSummary {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.summary_text === 'string' &&
    Array.isArray(obj.key_takeaways) &&
    typeof obj.tool_recommendations === 'string' &&
    typeof obj.instructor_notes === 'string'
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function regenerateSurveySummary(courseSlug: string): Promise<void> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('[SurveySummary] ANTHROPIC_API_KEY not set — skipping summary generation');
      return;
    }

    const supabase = createAdminClient();

    // 1. Look up survey_id — wrap in try/catch in case the table doesn't exist yet
    let surveyId: string;
    try {
      const { data: surveyRow, error: surveyError } = await supabase
        .from('surveys')
        .select('id')
        .eq('slug', courseSlug)
        .single();

      if (surveyError || !surveyRow) {
        console.warn(
          `[SurveySummary] No survey found for slug "${courseSlug}" — skipping`,
          surveyError?.message ?? '(no row)'
        );
        return;
      }

      surveyId = surveyRow.id as string;
    } catch (lookupErr) {
      console.warn(
        `[SurveySummary] surveys table lookup failed for "${courseSlug}" — skipping`,
        lookupErr
      );
      return;
    }

    // 2. Fetch all responses for this course_slug
    const { data: rawResponses, error: responsesError } = await supabase
      .from('survey_responses')
      .select(
        'ai_knowledge_level, ai_usage_frequency, ai_tools_used, learning_reasons, ai_help_with, current_feeling'
      )
      .eq('course_slug', courseSlug);

    if (responsesError) {
      console.error('[SurveySummary] Error fetching responses:', responsesError.message);
      return;
    }

    if (!rawResponses || rawResponses.length === 0) {
      console.warn(`[SurveySummary] No responses for "${courseSlug}" — skipping`);
      return;
    }

    const responses = rawResponses as SurveyResponse[];

    // 3. Aggregate stats
    const stats = aggregateStats(responses);

    // 4. Build Claude prompt (anonymized, no PII)
    const anonymizedSample = responses.slice(0, 30).map(anonymize);

    const userMessage = `You are analyzing pre-course survey data for an AI Essentials cohort.

Total responses: ${responses.length}

Aggregated statistics:
${JSON.stringify(stats, null, 2)}

Individual responses (up to 30, names and personal details removed):
${JSON.stringify(anonymizedSample, null, 2)}

Respond with exactly this JSON shape — no markdown, no code fences, no extra text:
{
  "summary_text": "2-3 sentence narrative description of the cohort",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "tool_recommendations": "Which AI tools the instructor should focus on teaching based on the cohort's current usage and goals",
  "instructor_notes": "Actionable notes for the instructor: what to emphasize, what to skip, how to pace the course"
}`;

    // 5. Call Claude API
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        temperature: 0.3,
        system:
          'You are an AI education specialist analyzing pre-course survey data for an AI Essentials cohort. Return JSON only — no markdown, no explanation.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => '(unreadable)');
      console.error(`[SurveySummary] Claude API error ${apiResponse.status}: ${errorText}`);
      return;
    }

    const result = (await apiResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlock = result.content?.find((b) => b.type === 'text');
    let jsonStr = textBlock?.text?.trim() ?? '';

    // Strip markdown fences if Claude included them despite instructions
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    // 5. Parse Claude response
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[SurveySummary] Failed to parse Claude JSON response:', parseErr);
      return;
    }

    if (!isClaudeSummary(parsed)) {
      console.error(
        '[SurveySummary] Claude response missing required fields:',
        JSON.stringify(parsed)
      );
      return;
    }

    // 6. Upsert to survey_summaries
    const { error: upsertError } = await supabase.from('survey_summaries').upsert(
      {
        survey_id: surveyId,
        response_count: responses.length,
        stats,
        summary_text: parsed.summary_text,
        key_takeaways: parsed.key_takeaways,
        tool_recommendations: parsed.tool_recommendations,
        instructor_notes: parsed.instructor_notes,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'survey_id' }
    );

    if (upsertError) {
      console.error('[SurveySummary] Failed to upsert survey_summaries:', upsertError.message);
      return;
    }

    console.log(
      `[SurveySummary] Summary generated for "${courseSlug}" (${responses.length} responses)`
    );
  } catch (err) {
    console.error('[SurveySummary] Unexpected error:', err);
  }
}
