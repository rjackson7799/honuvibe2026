import type {
  CourseWithCurriculum,
  SessionTopic,
  MaterialSummaryItem,
} from './types';

// --- Translation input/output types ---

interface CourseTranslationInput {
  course: {
    title_en: string;
    description_en: string | null;
    learning_outcomes_en: string[] | null;
    prerequisites_en: string | null;
    who_is_for_en: string[] | null;
    schedule_notes_en: string | null;
    cancellation_policy_en: string | null;
    completion_requirements_en: string[] | null;
    materials_summary_en: MaterialSummaryItem[] | null;
  };
  weeks: {
    id: string;
    title_en: string;
    subtitle_en: string | null;
    description_en: string | null;
    sessions: {
      id: string;
      title_en: string;
      materials_en: string[] | null;
      topics_en: SessionTopic[] | null;
    }[];
    assignments: {
      id: string;
      title_en: string;
      description_en: string;
    }[];
  }[];
}

export interface CourseTranslationOutput {
  course: {
    title_jp: string;
    description_jp: string | null;
    learning_outcomes_jp: string[] | null;
    prerequisites_jp: string | null;
    who_is_for_jp: string[] | null;
    schedule_notes_jp: string | null;
    cancellation_policy_jp: string | null;
    completion_requirements_jp: string[] | null;
    materials_summary_jp: MaterialSummaryItem[] | null;
  };
  weeks: {
    id: string;
    title_jp: string;
    subtitle_jp: string | null;
    description_jp: string | null;
    sessions: {
      id: string;
      title_jp: string;
      materials_jp: string[] | null;
      topics_jp: SessionTopic[] | null;
    }[];
    assignments: {
      id: string;
      title_jp: string;
      description_jp: string;
    }[];
  }[];
}

// --- System prompt ---

const TRANSLATION_SYSTEM_PROMPT = `You are a professional English-to-Japanese translator specializing in AI education and technology content for HonuVibe.AI, a bilingual education platform based in Hawaii.

You will receive a JSON object containing English course content. Translate ALL English text fields to natural, professional Japanese.

Translation guidelines:
- Use polite です/ます form for descriptions and instructional content
- Keep technical terms (AI, LLM, API, ChatGPT, Claude, Python, etc.) in their commonly used form in Japan — usually the English term or katakana
- For concepts like "machine learning" use 機械学習, "deep learning" use ディープラーニング, etc.
- Translate naturally for a Japanese professional/student audience — avoid overly literal translations
- Maintain the exact same JSON structure as the input
- Preserve all "id" fields exactly as-is (these are database UUIDs)
- For arrays (like topics with subtopics), maintain the same array length and structure
- For MaterialSummaryItem objects, translate "material" and "provided_with" but keep "language" as-is
- If an input field is null, output null for the corresponding _jp field

Output ONLY valid JSON. No markdown formatting, no explanation, no code blocks — just the JSON object.`;

// --- Build translation input from course data ---

export function buildTranslationInput(
  course: CourseWithCurriculum,
): CourseTranslationInput {
  return {
    course: {
      title_en: course.title_en,
      description_en: course.description_en,
      learning_outcomes_en: course.learning_outcomes_en,
      prerequisites_en: course.prerequisites_en,
      who_is_for_en: course.who_is_for_en,
      schedule_notes_en: course.schedule_notes_en,
      cancellation_policy_en: course.cancellation_policy_en,
      completion_requirements_en: course.completion_requirements_en,
      materials_summary_en: course.materials_summary_en,
    },
    weeks: course.weeks.map((week) => ({
      id: week.id,
      title_en: week.title_en,
      subtitle_en: week.subtitle_en,
      description_en: week.description_en,
      sessions: week.sessions.map((s) => ({
        id: s.id,
        title_en: s.title_en,
        materials_en: s.materials_en,
        topics_en: s.topics_en,
      })),
      assignments: week.assignments.map((a) => ({
        id: a.id,
        title_en: a.title_en,
        description_en: a.description_en,
      })),
    })),
  };
}

// --- Call Claude API to translate ---

export async function translateCourseContent(
  input: CourseTranslationInput,
): Promise<CourseTranslationOutput> {
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
      system: TRANSLATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Translate the following course content from English to Japanese. Return a JSON object with the same structure, replacing _en suffixes with _jp. Preserve all "id" fields unchanged.\n\n${JSON.stringify(input, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errorText}`);
  }

  const result = await response.json();

  // Check for truncation
  if (result.stop_reason === 'max_tokens') {
    throw new Error(
      'Translation response was truncated. The course may be too large for a single translation request.',
    );
  }

  const textBlock = result.content?.find(
    (block: { type: string }) => block.type === 'text',
  );

  if (!textBlock?.text) {
    throw new Error('No text response from Claude API');
  }

  // Extract JSON (may be wrapped in ```json blocks despite instructions)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as CourseTranslationOutput;

  // Basic validation
  if (!parsed.course?.title_jp) {
    throw new Error('Translation output missing course title_jp');
  }
  if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
    throw new Error('Translation output missing weeks array');
  }

  return parsed;
}
