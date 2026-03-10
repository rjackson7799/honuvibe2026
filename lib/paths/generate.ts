import { buildCatalog } from './catalog';
import { buildGenerationPrompt, GENERATION_PROMPT_VERSION } from './prompt';
import type { StudentContext } from './prompt';
import { claudePathResponseSchema } from './schemas';
import { createClient } from '@/lib/supabase/server';
import type {
  PathIntakeInput,
  PathGenerationResult,
  CatalogItem,
} from './types';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4000;
const TEMPERATURE = 0.3;

export class PathGenerationError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'CATALOG_TOO_SMALL',
  ) {
    super(message);
    this.name = 'PathGenerationError';
  }
}

export async function generateStudyPath(
  input: PathIntakeInput,
  userId: string,
  userTier: 'free' | 'premium',
): Promise<PathGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  // 1. Build content catalog
  const catalog = await buildCatalog(input.language_preference, userTier);

  if (catalog.length < 5) {
    throw new PathGenerationError(
      `Not enough content available (${catalog.length} items). At least 5 published items are required.`,
      'CATALOG_TOO_SMALL',
    );
  }

  // 2. Fetch student context (enrolled courses + completed content)
  const studentContext = await fetchStudentContext(userId, input.language_preference);

  // 3. Build prompt
  const prompt = buildGenerationPrompt(
    input.goal_description,
    input.difficulty_preference,
    input.language_preference,
    input.focus_areas,
    catalog,
    userTier,
    studentContext,
  );

  // 4. Call Claude API
  const startTime = Date.now();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: 'You are a curriculum designer. Respond ONLY with valid JSON, no markdown fencing or extra text.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new PathGenerationError(
      `Claude API error: ${response.status} — ${errorText}`,
      'API_ERROR',
    );
  }

  const result = await response.json();
  const generationTimeMs = Date.now() - startTime;

  const textBlock = result.content?.find(
    (block: { type: string }) => block.type === 'text',
  );

  if (!textBlock?.text) {
    throw new PathGenerationError(
      'No text response from Claude API',
      'API_ERROR',
    );
  }

  // 5. Extract JSON (may be wrapped in ```json blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new PathGenerationError(
      'Failed to parse Claude response as JSON',
      'PARSE_ERROR',
    );
  }

  // 6. Validate with Zod
  const validated = claudePathResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new PathGenerationError(
      `Response validation failed: ${validated.error.message}`,
      'VALIDATION_ERROR',
    );
  }

  // 7. Cross-validate: all content_item_ids exist in catalog
  const catalogIds = new Set(catalog.map((item: CatalogItem) => item.id));
  const invalidIds = validated.data.items.filter(
    (item) => !catalogIds.has(item.content_item_id),
  );

  if (invalidIds.length > 0) {
    throw new PathGenerationError(
      `Claude referenced ${invalidIds.length} content items not in the catalog`,
      'VALIDATION_ERROR',
    );
  }

  // 8. Extract token usage
  const inputTokens = result.usage?.input_tokens ?? 0;
  const outputTokens = result.usage?.output_tokens ?? 0;

  return {
    response: validated.data,
    generationTimeMs,
    inputTokens,
    outputTokens,
    catalogSize: catalog.length,
  };
}

async function fetchStudentContext(
  userId: string,
  language: string,
): Promise<StudentContext | undefined> {
  const supabase = await createClient();

  // Fetch enrolled courses
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('status, courses(title_en, title_jp)')
    .eq('user_id', userId)
    .in('status', ['active', 'completed']);

  const enrolledCourses = (enrollments ?? []).map((e) => {
    const course = e.courses as unknown as { title_en: string; title_jp: string | null } | null;
    const title =
      language === 'ja' && course?.title_jp ? course.title_jp : (course?.title_en ?? 'Unknown');
    return { title, status: e.status };
  });

  // Fetch completed content item IDs from existing study paths
  const { data: completedItems } = await supabase
    .from('study_path_items')
    .select('content_item_id, study_paths!inner(user_id)')
    .eq('study_paths.user_id', userId)
    .eq('is_completed', true);

  const completedContentIds = [
    ...new Set((completedItems ?? []).map((i) => i.content_item_id)),
  ];

  // Only return context if there's something useful
  if (enrolledCourses.length === 0 && completedContentIds.length === 0) {
    return undefined;
  }

  return { enrolledCourses, completedContentIds };
}
