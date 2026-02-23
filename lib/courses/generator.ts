import type { ParsedCourseData, WizardParams } from './types';

const GENERATION_SYSTEM_PROMPT = `You are a course curriculum designer for HonuVibe.AI, an educational platform focused on AI education, consulting, and community. Your task is to generate a complete, structured course from the given parameters.

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
      "phase": "string or null (e.g., 'Foundation', 'Application', 'Mastery')",
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
- Generate a complete week-by-week curriculum based on the provided parameters
- Create meaningful, progressive session titles and topics that build on each other
- Include practical assignments that reinforce each week's learning
- Generate a URL-friendly slug from the course title
- Create a course ID code in the format "HV-XXNNN" (e.g., HV-AI101)
- If the student language includes Japanese, generate Japanese translations for all _jp fields AND include vocabulary terms with English-Japanese pairs relevant to each week's content
- If the student language is English only, set all _jp fields to null and include minimal vocabulary
- Assign logical phase labels to weeks (e.g., "Foundation", "Building", "Application", "Mastery")
- Set reasonable session durations (typically 60-90 minutes for live, 15-45 for recorded)
- Include 1-3 resources per week (articles, tools, guides)
- Ensure completion requirements are specific and measurable
- Always output valid JSON with no additional text`;

function buildUserPrompt(params: WizardParams): string {
  const lines = [
    `Generate a complete course curriculum with the following parameters:`,
    ``,
    `Title: ${params.title}`,
    `Description: ${params.description}`,
    `Instructor: ${params.instructorName}`,
    `Course Type: ${params.courseType}`,
    `Level: ${params.level}`,
    `Format: ${params.format}`,
    `Primary Student Language: ${params.studentLanguage}`,
    `Content Difficulty: ${params.contentDifficulty}`,
    `Total Weeks: ${params.totalWeeks}`,
    `Price USD: $${params.priceUsd}`,
    `Price JPY: ¥${params.priceJpy}`,
  ];

  if (params.maxEnrollment) {
    lines.push(`Max Enrollment: ${params.maxEnrollment}`);
  }
  if (params.startDate) {
    lines.push(`Start Date: ${params.startDate}`);
  }

  lines.push(``, `Topic Overview: ${params.topicOverview}`);

  if (params.learningOutcomes.length > 0) {
    lines.push(``, `Learning Outcomes:`);
    params.learningOutcomes.forEach((o) => lines.push(`- ${o}`));
  }

  if (params.toolsToCover.length > 0) {
    lines.push(``, `Tools to Cover: ${params.toolsToCover.join(', ')}`);
  }

  if (params.targetAudience) {
    lines.push(``, `Target Audience: ${params.targetAudience}`);
  }

  if (params.prerequisites) {
    lines.push(``, `Prerequisites: ${params.prerequisites}`);
  }

  if (params.specialInstructions) {
    lines.push(``, `Special Instructions: ${params.specialInstructions}`);
  }

  return lines.join('\n');
}

export async function generateCourseFromWizard(
  params: WizardParams,
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
      system: GENERATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(params),
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
    throw new Error('Generated data missing required course title');
  }
  if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
    throw new Error('Generated data missing weeks array');
  }

  return parsed;
}
