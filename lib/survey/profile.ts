import { createAdminClient } from '@/lib/supabase/server';
import { sendStudentProfileEmail } from '@/lib/email/send';
import type { Locale } from '@/lib/email/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SurveyData {
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
  specific_interests?: string | null;
}

interface RecommendedTool {
  name: string;
  reason: string;
}

interface SuggestedProject {
  title: string;
  description: string;
}

interface ClaudeStudentProfile {
  level_label: string;
  level_description: string;
  recommended_tools: RecommendedTool[];
  suggested_projects: SuggestedProject[];
  ai_for_your_work: string;
  learning_path: string;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isRecommendedTool(value: unknown): value is RecommendedTool {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.reason === 'string';
}

function isSuggestedProject(value: unknown): value is SuggestedProject {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.title === 'string' && typeof obj.description === 'string';
}

function isClaudeStudentProfile(value: unknown): value is ClaudeStudentProfile {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.level_label === 'string' &&
    typeof obj.level_description === 'string' &&
    Array.isArray(obj.recommended_tools) &&
    (obj.recommended_tools as unknown[]).length === 3 &&
    (obj.recommended_tools as unknown[]).every(isRecommendedTool) &&
    Array.isArray(obj.suggested_projects) &&
    (obj.suggested_projects as unknown[]).length === 3 &&
    (obj.suggested_projects as unknown[]).every(isSuggestedProject) &&
    typeof obj.ai_for_your_work === 'string' &&
    typeof obj.learning_path === 'string'
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateAndSendStudentProfile(params: {
  userId: string;
  surveyData: SurveyData;
}): Promise<void> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('[StudentProfile] ANTHROPIC_API_KEY not set — skipping profile generation');
      return;
    }

    const supabase = createAdminClient();

    // 1. Look up user email + locale
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('email, full_name, locale_preference')
      .eq('id', params.userId)
      .single();

    if (userError || !userRow?.email) {
      console.warn('[StudentProfile] No email found for user', params.userId, userError?.message ?? '(null row)');
      return;
    }

    const locale: Locale = (userRow.locale_preference as string) === 'ja' ? 'ja' : 'en';
    const { surveyData } = params;

    // 2. Build Claude prompt
    const userMessage = `Create a personalized AI study profile for the following student enrolling in an AI Essentials course.

Student Information:
- Name: ${surveyData.name}
- Professional background: ${surveyData.professional_background}
- Current role: ${surveyData.role_description}
- AI knowledge level (self-assessed): ${surveyData.ai_knowledge_level}
- AI tools currently used: ${Array.isArray(surveyData.ai_tools_used) ? surveyData.ai_tools_used.join(', ') || 'none' : 'none'}
- AI usage frequency: ${surveyData.ai_usage_frequency}
- Reasons for learning AI: ${Array.isArray(surveyData.learning_reasons) ? surveyData.learning_reasons.join(', ') : ''}
- Wants AI to help with: ${Array.isArray(surveyData.ai_help_with) ? surveyData.ai_help_with.join(', ') : ''}
- Definition of success: ${surveyData.success_definition}
- Current feeling about AI: ${surveyData.current_feeling}
${surveyData.specific_interests ? `- Additional thoughts: ${surveyData.specific_interests}` : ''}

Respond with exactly this JSON shape — no markdown, no code fences, no extra text:
{
  "level_label": "Short evocative label for their AI level (e.g. 'Curious Beginner', 'Confident Explorer', 'Strategic Practitioner')",
  "level_description": "2 sentences describing their current level and what that means for this course",
  "recommended_tools": [
    {"name": "tool name", "reason": "1 sentence — why this tool fits their specific role and goals"},
    {"name": "tool name", "reason": "1 sentence"},
    {"name": "tool name", "reason": "1 sentence"}
  ],
  "suggested_projects": [
    {"title": "Short project title", "description": "2 sentences — what to build and how it will improve their AI skills in a way relevant to their work"},
    {"title": "Short project title", "description": "2 sentences"},
    {"title": "Short project title", "description": "2 sentences"}
  ],
  "ai_for_your_work": "3 sentences explaining specifically how AI can help with their stated interests, role, and goals — be concrete and practical, not generic",
  "learning_path": "2-3 sentences of personalized advice for how they should approach this course given their background"
}

Important:
- recommended_tools must contain exactly 3 items
- suggested_projects must contain exactly 3 items
- All recommendations must be specific to this student's background, role, and goals — not generic AI advice`;

    // 3. Call Claude API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        temperature: 0.3,
        system:
          'You are an AI education specialist creating personalized AI study profiles. Return JSON only — no markdown, no explanation.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    }).finally(() => clearTimeout(timeoutId));

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => '(unreadable)');
      console.error(`[StudentProfile] Claude API error ${apiResponse.status}: ${errorText}`);
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

    // 4. Parse + validate
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[StudentProfile] Failed to parse Claude JSON response:', parseErr);
      return;
    }

    if (!isClaudeStudentProfile(parsed)) {
      console.error('[StudentProfile] Claude response missing required fields:', JSON.stringify(parsed));
      return;
    }

    // 5. Send profile email
    await sendStudentProfileEmail({
      locale,
      fullName: (userRow.full_name as string | null) ?? surveyData.name,
      email: userRow.email as string,
      levelLabel: parsed.level_label,
      levelDescription: parsed.level_description,
      recommendedTools: parsed.recommended_tools,
      suggestedProjects: parsed.suggested_projects,
      aiForYourWork: parsed.ai_for_your_work,
      learningPath: parsed.learning_path,
    });

    console.log(`[StudentProfile] Profile email sent for user ${params.userId}`);
  } catch (err) {
    console.error('[StudentProfile] Unexpected error:', err);
  }
}
