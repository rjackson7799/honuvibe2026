import type { ParsedCourseData } from './types';

const SYSTEM_PROMPT = `You are a course data extraction assistant for HonuVibe.AI, an educational platform. Your task is to parse course markdown documents and extract structured data.

Given a course description in markdown format, extract the following structured JSON. Be precise and thorough.

Output ONLY valid JSON matching this exact schema:

{
  "course": {
    "course_id_code": "string (e.g., 'HV-AI101')",
    "slug": "string (kebab-case URL slug, e.g., 'ai-foundations')",
    "title_en": "string",
    "title_jp": "string or null",
    "description_en": "string (1-3 sentence summary)",
    "description_jp": "string or null",
    "instructor_name": "string",
    "price_usd": "number (in dollars, not cents)",
    "price_jpy": "number",
    "language": "'en' | 'ja' | 'both'",
    "subtitle_language": "string or null",
    "level": "'beginner' | 'intermediate' | 'advanced'",
    "format": "string describing delivery format",
    "start_date": "string (ISO date) or null",
    "total_weeks": "number",
    "live_sessions_count": "number",
    "recorded_lessons_count": "number",
    "max_enrollment": "number",
    "learning_outcomes_en": ["string array"],
    "learning_outcomes_jp": ["string array"] or null,
    "prerequisites_en": "string",
    "prerequisites_jp": "string or null",
    "who_is_for_en": ["string array - target audience"],
    "who_is_for_jp": ["string array"] or null,
    "tools_covered": ["string array of tools/software"],
    "community_platform": "string (e.g., 'Skool', 'LINE', 'Discord')",
    "community_duration_months": "number",
    "schedule_notes_en": "string",
    "schedule_notes_jp": "string or null",
    "cancellation_policy_en": "string",
    "cancellation_policy_jp": "string or null",
    "completion_requirements_en": ["string array"],
    "completion_requirements_jp": ["string array"] or null,
    "materials_summary": [{"material": "string", "language": "string", "provided_with": "string"}],
    "tags": ["string array of category tags"]
  },
  "weeks": [
    {
      "week_number": "number",
      "title_en": "string",
      "title_jp": "string or null",
      "subtitle_en": "string or null",
      "subtitle_jp": "string or null",
      "description_en": "string or null",
      "phase": "string or null (e.g., 'Foundation', 'Application')",
      "sessions": [
        {
          "session_number": "number",
          "title_en": "string",
          "title_jp": "string or null",
          "format": "'live' | 'recorded' | 'hybrid'",
          "duration_minutes": "number or null",
          "materials_en": ["string array"] or null,
          "materials_jp": ["string array"] or null,
          "topics_en": [{"title": "string", "subtopics": ["string"]}] or null,
          "topics_jp": [{"title": "string", "subtopics": ["string"]}] or null
        }
      ],
      "assignments": [
        {
          "title_en": "string",
          "title_jp": "string or null",
          "description_en": "string",
          "description_jp": "string or null",
          "assignment_type": "'homework' | 'action-challenge' | 'project'"
        }
      ],
      "vocabulary": [
        {
          "term_en": "string",
          "term_jp": "string"
        }
      ],
      "resources": [
        {
          "title_en": "string",
          "url": "string or null",
          "resource_type": "'article' | 'video' | 'tool' | 'template' | 'download' | 'guide' | null",
          "description_en": "string or null"
        }
      ]
    }
  ]
}

Rules:
- Extract ALL weeks and sessions mentioned in the document
- If Japanese translations are present, include them. If not, set JP fields to null
- Generate a URL-friendly slug from the course title
- If a course ID code isn't explicitly mentioned, generate one like "HV-XXNNN"
- Infer the level from the content if not explicitly stated
- Be thorough with topics - extract all subtopics from the curriculum
- For vocabulary, pair English and Japanese terms
- If price isn't mentioned, use 0
- Always output valid JSON with no additional text`;

export async function parseCourseMarkdown(
  markdown: string,
): Promise<ParsedCourseData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse this course document and extract structured data as JSON:\n\n${markdown}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errorText}`);
  }

  const result = await response.json();
  const textBlock = result.content?.find(
    (block: { type: string }) => block.type === 'text',
  );

  if (!textBlock?.text) {
    throw new Error('No text response from Claude API');
  }

  // Extract JSON from response (may be wrapped in ```json blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as ParsedCourseData;

  // Basic validation
  if (!parsed.course?.title_en) {
    throw new Error('Parsed data missing required course title');
  }
  if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
    throw new Error('Parsed data missing weeks array');
  }

  return parsed;
}
