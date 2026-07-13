// Vault content editor — EN→JP translate assist. Mirrors the workbench
// authoring assist: the result lands in the editor form for human review;
// nothing here writes to the database (project rule: never machine-translate
// without human review for production).

import { z } from 'zod';
import { AuthoringError, runAuthoringCall } from '@/lib/workbench/authoring';

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export const vaultTranslateInputSchema = z
  .object({
    title_en: z.string().trim().min(1).nullable(),
    description_en: z.string().trim().min(1).nullable(),
    body_en: z.string().trim().min(1).nullable(),
  })
  .refine(
    (v) => v.title_en !== null || v.description_en !== null || v.body_en !== null,
    { message: 'At least one field to translate is required' },
  );
export type VaultTranslateInput = z.infer<typeof vaultTranslateInputSchema>;

export const vaultTranslationResultSchema = z.object({
  title_jp: z.string().trim().min(1).nullable(),
  description_jp: z.string().trim().min(1).max(500).nullable(),
  body_jp: z.string().trim().min(1).nullable(),
});
export type VaultTranslationResult = z.infer<typeof vaultTranslationResultSchema>;

// ---------------------------------------------------------------------------
// Prompt (exported so unit tests can assert it without a network call)
// ---------------------------------------------------------------------------

export function buildVaultTranslatePrompt(input: VaultTranslateInput): {
  system: string;
  userContent: string;
} {
  const system = [
    'You are a professional English-to-Japanese translator specializing in AI education and technology content for HonuVibe.AI, a bilingual education platform based in Hawaii.',
    '',
    'You will receive a JSON object containing the English fields of a learning-content item (some fields may be null). Translate every non-null field to natural, professional Japanese and reply with raw JSON in exactly this shape (no markdown code fences, no commentary):',
    '{ "title_jp": "..." | null, "description_jp": "..." | null, "body_jp": "..." | null }',
    '',
    'Translation guidelines:',
    '- Use polite です/ます form for descriptions and instructional content.',
    '- Keep technical terms (AI, LLM, API, ChatGPT, Claude, Python, etc.) in their commonly used form in Japan — usually the English term or katakana.',
    '- For concepts like "machine learning" use 機械学習, "deep learning" use ディープラーニング, etc.',
    '- Translate naturally for a Japanese professional/student audience — avoid overly literal translations.',
    '- "description_jp" must stay under 500 characters.',
    '- "body_en" is Markdown. "body_jp" must preserve the Markdown structure exactly — same headings, lists, links, and fenced code blocks. Translate prose only; leave code inside fenced code blocks untranslated.',
    '- For any input field that is null, output null for the corresponding _jp field.',
    '- Output raw JSON only — no prose, no markdown fences.',
  ].join('\n');

  return { system, userContent: JSON.stringify(input, null, 2) };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function translateVaultContentToJp(
  input: VaultTranslateInput,
): Promise<VaultTranslationResult> {
  const { system, userContent } = buildVaultTranslatePrompt(input);
  return runAuthoringCall(system, userContent, vaultTranslationResultSchema, {
    contextLabel: 'Vault translate assist',
    temperature: 0.2,
    // Article bodies are long-form Markdown; give them headroom. The plain
    // title/description call stays small and fast.
    maxTokens: input.body_en ? 16000 : 2000,
    timeoutMs: input.body_en ? 100_000 : 60_000,
  });
}

export { AuthoringError };
