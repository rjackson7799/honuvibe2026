import type { CatalogItem } from './types';

export const GENERATION_PROMPT_VERSION = 'v1.1';

export interface StudentContext {
  enrolledCourses: { title: string; status: string }[];
  completedContentIds: string[];
}

export function buildGenerationPrompt(
  goal: string,
  difficulty: string,
  language: string,
  focusAreas: string[],
  catalog: CatalogItem[],
  userTier: string,
  studentContext?: StudentContext,
): string {
  const tierNote =
    userTier === 'free'
      ? 'NOTE: This student is on the free tier. All items in the catalog are accessible to them.'
      : "NOTE: This student has premium access. Include the best content regardless of tier, but try to start with a few free items so they can begin immediately.";

  let studentContextSection = '';
  if (studentContext) {
    const parts: string[] = [];

    if (studentContext.enrolledCourses.length > 0) {
      parts.push(
        `Enrolled courses:\n${studentContext.enrolledCourses
          .map((c) => `  - ${c.title} (${c.status})`)
          .join('\n')}`,
      );
    }

    if (studentContext.completedContentIds.length > 0) {
      parts.push(
        `Already completed ${studentContext.completedContentIds.length} content items from previous study paths. Avoid including items they have already completed unless essential for the learning progression.`,
      );
    }

    if (parts.length > 0) {
      studentContextSection = `\nSTUDENT CONTEXT (existing learning history):\n${parts.join('\n\n')}\n\nUse this context to avoid redundancy and build on what the student already knows.\n`;
    }
  }

  return `You are a curriculum designer for HonuVibe.AI, a Hawaii-based AI education platform.

A student has described what they want to learn. Your job is to assemble a personalized study path from the available content library.

STUDENT PROFILE:
- Goal: "${goal}"
- Difficulty level: ${difficulty}
- Preferred language: ${language === 'ja' ? 'Japanese' : 'English'}
- Focus areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'not specified'}
- Subscription tier: ${userTier}
${studentContextSection}
AVAILABLE CONTENT LIBRARY (${catalog.length} items):
${JSON.stringify(catalog, null, 2)}

INSTRUCTIONS:
1. Select 8-15 items from the library that form a logical learning progression for this student's goal.
2. Order them from foundational to advanced — the student should build knowledge sequentially.
3. For each selected item, provide:
   - A brief rationale for why it's included (1-2 sentences)
   - A learning focus note — what specifically to pay attention to (1 sentence)
4. Generate a title and description for the overall study path.
5. Do not include items whose difficulty is significantly above the student's level unless they build naturally from easier items.
6. Prefer a mix of content types (videos, articles, tools) for varied learning.
7. If the student specified focus areas, weight heavily toward content tagged with those areas.
8. If there aren't enough items to build a good path, include what you can and note the gap.

${tierNote}

Return ONLY valid JSON with this exact structure:
{
  "title_en": "string — path title in English",
  "title_jp": "string — path title in Japanese (translate the English title)",
  "description_en": "string — 2-3 sentence summary of what this path covers, in English",
  "description_jp": "string — same summary in Japanese",
  "estimated_hours": number,
  "items": [
    {
      "content_item_id": "uuid from the catalog",
      "sort_order": 1,
      "rationale_en": "string — why this item is included, in English",
      "rationale_jp": "string — same in Japanese",
      "learning_focus_en": "string — what to focus on, in English",
      "learning_focus_jp": "string — same in Japanese"
    }
  ],
  "gaps": "string or null — if the library doesn't fully cover the student's goal, describe what's missing"
}`;
}
