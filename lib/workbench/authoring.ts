// Apply-It Workbench — admin authoring assists (draft-from-idea, EN→JP
// translate). Mirrors lib/workbench/evaluator.ts exactly: direct fetch to the
// Anthropic Messages API, parseJsonFromClaude with one corrective retry, zod
// validation, and a typed AuthoringError the admin API routes map to responses.
//
// Both assists are admin-only conveniences — the output always lands in the
// scenario form for human review; nothing here writes to the database.

import { z } from 'zod';
import { AUTHORING_MODEL } from '@/lib/workbench/models';
import { parseJsonFromClaude } from '@/lib/courses/json-response';
import {
  workbenchDimensionSchema,
  type WorkbenchDifficulty,
  type WorkbenchDomain,
} from '@/lib/workbench/types';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export type AuthoringErrorCode =
  | 'CONFIG_ERROR'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'SCHEMA_ERROR';

export class AuthoringError extends Error {
  readonly code: AuthoringErrorCode;
  constructor(code: AuthoringErrorCode, message: string) {
    super(message);
    this.name = 'AuthoringError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Result contracts
// ---------------------------------------------------------------------------

export const workbenchDraftResultSchema = z.object({
  title_en: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  brief_en: z.string().trim().min(1),
  expert_prompt_en: z.string().trim().min(1),
  expert_output_en: z.string().trim().min(1),
  why_this_works_en: z.string().trim().min(1),
  applicable_dimensions: z.array(workbenchDimensionSchema).min(1).max(6),
});
export type WorkbenchDraftResult = z.infer<typeof workbenchDraftResultSchema>;

export const workbenchTranslationResultSchema = z.object({
  title_jp: z.string().trim().min(1),
  brief_jp: z.string().trim().min(1),
  expert_prompt_jp: z.string().trim().min(1),
  expert_output_jp: z.string().trim().min(1),
  why_this_works_jp: z.string().trim().min(1).nullable(),
});
export type WorkbenchTranslationResult = z.infer<
  typeof workbenchTranslationResultSchema
>;

export interface WorkbenchDraftInput {
  idea: string;
  domain: WorkbenchDomain;
  difficulty: WorkbenchDifficulty;
}

export interface WorkbenchTranslateInput {
  title_en: string;
  brief_en: string;
  expert_prompt_en: string;
  expert_output_en: string;
  why_this_works_en: string | null;
}

// ---------------------------------------------------------------------------
// Prompts (exported so unit tests can assert them without a network call)
// ---------------------------------------------------------------------------

export function buildDraftPrompt({
  idea,
  domain,
  difficulty,
}: WorkbenchDraftInput): { system: string; userContent: string } {
  const system = [
    'You author training scenarios for the Apply-It Workbench, where members of an AI-education platform practice writing AI prompts and are scored on six prompting dimensions: role, context, task, constraints, format, examples.',
    '',
    'Given a one-line idea, a domain, and a difficulty, produce ONE scenario as raw JSON in exactly this shape (no markdown code fences, no commentary before or after):',
    '{',
    '  "title_en": "<short scenario title>",',
    '  "slug": "<lowercase-hyphenated, 3-6 words>",',
    '  "brief_en": "<the situation the member is dropped into>",',
    '  "expert_prompt_en": "<an excellent prompt for this scenario>",',
    '  "expert_output_en": "<the realistic output that expert prompt would produce>",',
    '  "why_this_works_en": "<why the expert prompt is effective>",',
    '  "applicable_dimensions": ["<dimension>", ...]',
    '}',
    '',
    'Rules:',
    '- "slug" is lowercase letters, numbers, and hyphens only.',
    '- "brief_en" is 2-4 sentences, second person, describing the member\'s situation and what they must get the AI to produce. It must NOT hint at prompt-writing techniques — discovering those is the exercise.',
    '- "applicable_dimensions": pick the 3-5 dimensions this scenario most naturally exercises (beginner scenarios ~3, advanced up to 5-6). Only use: role, context, task, constraints, format, examples.',
    '- "expert_prompt_en" must be a genuinely excellent prompt that would score 5/5 on every chosen dimension — and only the chosen ones need to be exercised.',
    '- "expert_output_en" is the realistic, high-quality output that expert prompt would produce, written in full.',
    '- "why_this_works_en" is 2-4 sentences naming how the expert prompt exercises each chosen dimension.',
    '- Difficulty calibration: beginner = a short, concrete everyday task; intermediate = a task with a specific audience and a couple of competing requirements; advanced = multi-constraint, nuanced audience, judgment calls.',
    '- Output raw JSON only — no prose, no markdown fences.',
  ].join('\n');

  const userContent = [
    `Idea: ${idea}`,
    `Domain: ${domain}`,
    `Difficulty: ${difficulty}`,
  ].join('\n');

  return { system, userContent };
}

export function buildTranslatePrompt(input: WorkbenchTranslateInput): {
  system: string;
  userContent: string;
} {
  const system = [
    'You are a professional English-to-Japanese translator specializing in AI education content for HonuVibe.AI, a bilingual education platform based in Hawaii.',
    '',
    'You will receive a JSON object containing the English fields of a prompting-practice scenario. Translate every field to natural, professional Japanese and reply with raw JSON in exactly this shape (no markdown code fences, no commentary):',
    '{ "title_jp": "...", "brief_jp": "...", "expert_prompt_jp": "...", "expert_output_jp": "...", "why_this_works_jp": "..." | null }',
    '',
    'Translation guidelines:',
    '- Use polite です/ます form for instructional content.',
    '- Keep technical terms (AI, LLM, API, ChatGPT, Claude, etc.) in their commonly used form in Japan — usually the English term or katakana.',
    '- Translate naturally for a Japanese professional/student audience — avoid overly literal translations.',
    '- "expert_prompt_jp" must read like a prompt a Japanese member would actually write to an AI assistant — translate the intent and keep it idiomatic, not word-for-word.',
    '- "expert_output_jp" is the output that Japanese prompt would produce, translated to match.',
    '- If "why_this_works_en" is null, output null for "why_this_works_jp".',
    '- Output raw JSON only — no prose, no markdown fences.',
  ].join('\n');

  return { system, userContent: JSON.stringify(input, null, 2) };
}

// ---------------------------------------------------------------------------
// Provider call + JSON discipline (mirrors evaluator.ts)
// ---------------------------------------------------------------------------

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResult {
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
}

async function callAuthoringModel(
  system: string,
  messages: AnthropicMessage[],
  temperature: number,
  limits?: { maxTokens?: number; timeoutMs?: number },
): Promise<AnthropicResult> {
  const apiKey = process.env[AUTHORING_MODEL.envVar];
  if (!apiKey) {
    throw new AuthoringError(
      'CONFIG_ERROR',
      `Authoring assist is not configured (${AUTHORING_MODEL.envVar} missing)`,
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    limits?.timeoutMs ?? AUTHORING_MODEL.timeoutMs,
  );
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AUTHORING_MODEL.apiId,
        max_tokens: limits?.maxTokens ?? AUTHORING_MODEL.maxTokens,
        temperature,
        system,
        messages,
      }),
    });
  } catch (err) {
    throw new AuthoringError(
      'PROVIDER_ERROR',
      err instanceof Error ? err.message : 'Authoring request failed',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '(unreadable)');
    throw new AuthoringError(
      'PROVIDER_ERROR',
      `Anthropic ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  return (await response.json()) as AnthropicResult;
}

function assistantText(result: AnthropicResult): string {
  return (
    result.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('') ?? ''
  );
}

/**
 * Call the model, parse JSON with one corrective retry, validate with `schema`.
 * Exported for reuse by other admin authoring assists (e.g. the Vault
 * translate assist in lib/vault/translate.ts). `maxTokens`/`timeoutMs`
 * default to AUTHORING_MODEL's values when omitted.
 */
export async function runAuthoringCall<S extends z.ZodTypeAny>(
  system: string,
  userContent: string,
  schema: S,
  opts: {
    contextLabel: string;
    temperature: number;
    maxTokens?: number;
    timeoutMs?: number;
  },
): Promise<z.infer<S>> {
  let messages: AnthropicMessage[] = [{ role: 'user', content: userContent }];
  let raw: unknown;
  let parseError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callAuthoringModel(system, messages, opts.temperature, {
      maxTokens: opts.maxTokens,
      timeoutMs: opts.timeoutMs,
    });
    try {
      raw = parseJsonFromClaude<unknown>(result, {
        contextLabel: opts.contextLabel,
      });
      parseError = undefined;
      break;
    } catch (err) {
      parseError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        messages = [
          { role: 'user', content: userContent },
          { role: 'assistant', content: assistantText(result) },
          {
            role: 'user',
            content:
              `Your previous reply could not be parsed as JSON (${parseError.message}). ` +
              'Reply with ONLY the JSON object described above - no prose, no markdown code fences.',
          },
        ];
      }
    }
  }

  if (parseError) {
    throw new AuthoringError('PARSE_ERROR', parseError.message);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AuthoringError(
      'SCHEMA_ERROR',
      `${opts.contextLabel} JSON failed validation: ${parsed.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
    );
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateScenarioDraft(
  input: WorkbenchDraftInput,
): Promise<WorkbenchDraftResult> {
  const { system, userContent } = buildDraftPrompt(input);
  return runAuthoringCall(system, userContent, workbenchDraftResultSchema, {
    contextLabel: 'Workbench draft assist',
    temperature: AUTHORING_MODEL.temperature,
  });
}

export async function translateScenarioToJp(
  input: WorkbenchTranslateInput,
): Promise<WorkbenchTranslationResult> {
  const { system, userContent } = buildTranslatePrompt(input);
  return runAuthoringCall(system, userContent, workbenchTranslationResultSchema, {
    contextLabel: 'Workbench translate assist',
    temperature: 0.2, // fidelity over creativity for translation
  });
}
