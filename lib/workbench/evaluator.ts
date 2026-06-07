// Apply-It Workbench — Claude Sonnet rubric evaluator (one call per Score).
//
// Given a member's prompt + the output it produced, the evaluator scores the
// scenario's applicable prompting dimensions (0-5 each) and returns rationale +
// improvement text, plus a denormalized overall score and derived strengths /
// improvements lists.
//
// JSON discipline (docs/plans/2026-05-27-apply-it-workbench-v1.md → Evaluator
// engineering plan): strip code fences, one retry on a parse failure with the
// error appended, then a graceful error. Any config / provider / parse / schema
// failure throws EvaluatorError; the caller (POST /api/workbench/attempts/[id]/
// score) refunds the consumed 'score' quota and returns 502.
//
// Providers are called directly via fetch, matching the codebase convention
// (lib/workbench/executors.ts, lib/survey/summarize.ts). EVALUATOR_MODEL is the
// single source of truth for the model id / key / limits.

import { EVALUATOR_MODEL } from '@/lib/workbench/models';
import { parseJsonFromClaude } from '@/lib/courses/json-response';
import { EVALUATOR_EXEMPLARS } from '@/lib/workbench/evaluator-exemplars';
import {
  workbenchEvaluatorResultSchema,
  type WorkbenchAttempt,
  type WorkbenchDimension,
  type WorkbenchEvaluatorResult,
  type WorkbenchLanguage,
  type WorkbenchScenario,
  type WorkbenchScores,
} from '@/lib/workbench/types';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export type EvaluatorErrorCode =
  | 'CONFIG_ERROR'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'SCHEMA_ERROR';

export class EvaluatorError extends Error {
  readonly code: EvaluatorErrorCode;
  constructor(code: EvaluatorErrorCode, message: string) {
    super(message);
    this.name = 'EvaluatorError';
    this.code = code;
  }
}

export interface EvaluateAttemptParams {
  scenario: WorkbenchScenario;
  attempt: Pick<WorkbenchAttempt, 'language' | 'prompt_text' | 'output_text'>;
}

export interface EvaluateAttemptResult {
  /** Numeric score per applicable dimension — persisted to scores_json. */
  scores: WorkbenchScores;
  /** Average of applicable scores x 20, rounded to 0-100. */
  overallScore: number;
  /** Up to 3 rationale strings for dimensions scoring 4-5. */
  strengths: string[];
  /** Up to 3 improvement strings, largest (5 - score) gap first. */
  improvements: string[];
  /** Full per-dimension detail for the immediate rubric-panel response. */
  dimensions: WorkbenchEvaluatorResult;
}

// One-line definition of each dimension, kept stable (English) in the rubric
// instructions; the language-specific calibration comes from the exemplars and
// the per-attempt output-language rule.
const DIMENSION_GLOSS: Record<WorkbenchDimension, string> = {
  role: 'Did the prompt assign a clear, relevant role or persona to the AI?',
  context: 'Did the prompt supply the background and situation the task needs?',
  task: 'Is the actual ask specific, bounded, and unambiguous?',
  constraints:
    'Did the prompt set limits (length, tone, audience, things to avoid)?',
  format: 'Did the prompt specify the structure or shape of the output?',
  examples:
    'Did the prompt provide examples that anchor the desired output?',
};

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResult {
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
}

function pickLang(
  en: string,
  jp: string | null,
  language: WorkbenchLanguage,
): string {
  if (language === 'ja' && jp && jp.trim()) return jp;
  return en;
}

/**
 * Build the evaluator's system + user prompt. Exported so the prompt can be
 * asserted directly in unit tests without a network call.
 */
export function buildEvaluatorPrompt({
  scenario,
  attempt,
}: EvaluateAttemptParams): { system: string; userContent: string } {
  const language = attempt.language;
  const applicable = scenario.applicable_dimensions;
  const languageName = language === 'ja' ? 'Japanese' : 'English';

  const dimensionBlocks = applicable
    .map((dimension) => {
      const pair = EVALUATOR_EXEMPLARS[dimension][language];
      return [
        `### ${dimension}`,
        DIMENSION_GLOSS[dimension],
        `Weak (score ${pair.weak.score}): ${pair.weak.sample}`,
        `  -> ${pair.weak.rationale}`,
        `Strong (score ${pair.strong.score}): ${pair.strong.sample}`,
        `  -> ${pair.strong.rationale}`,
      ].join('\n');
    })
    .join('\n\n');

  const schemaBlock = [
    '{',
    applicable
      .map(
        (dimension) =>
          `  "${dimension}": { "score": <integer 0-5>, "rationale": "<text>", "improvement": "<text>" }`,
      )
      .join(',\n'),
    '}',
  ].join('\n');

  const system = [
    "You are a prompting coach for the Apply-It Workbench. You grade how well a member WROTE a prompt, on a fixed rubric of dimensions. You are not grading the AI output itself - only how well the member's prompt exercised each dimension.",
    '',
    'Score each dimension below from 0 (absent) to 5 (excellent). Use these calibration examples:',
    '',
    dimensionBlocks,
    '',
    'Respond with ONLY a JSON object in exactly this shape (no markdown code fences, no commentary before or after):',
    schemaBlock,
    '',
    'Rules:',
    `- Include exactly these keys: ${applicable.join(', ')}. No more, no fewer.`,
    '- "score" is an integer from 0 to 5.',
    '- "rationale" explains why the prompt earned that score.',
    '- "improvement" tells the member one concrete way to raise it.',
    `- Write every "rationale" and "improvement" value in ${languageName}.`,
    '- Output raw JSON only - no prose, no markdown fences.',
  ].join('\n');

  const userContent = [
    '# Scenario',
    pickLang(scenario.brief_en, scenario.brief_jp, language),
    '',
    '# Dimensions to score',
    applicable.join(', '),
    '',
    '# Reference: an expert prompt for this scenario',
    pickLang(scenario.expert_prompt_en, scenario.expert_prompt_jp, language),
    '',
    "# The member's prompt (this is what you are scoring)",
    attempt.prompt_text,
    '',
    '# The output that prompt produced',
    attempt.output_text,
  ].join('\n');

  return { system, userContent };
}

/** fetch wrapped in an AbortController timeout (mirrors lib/workbench/executors.ts). */
async function callEvaluatorModel(
  system: string,
  messages: AnthropicMessage[],
): Promise<AnthropicResult> {
  const apiKey = process.env[EVALUATOR_MODEL.envVar];
  if (!apiKey) {
    throw new EvaluatorError(
      'CONFIG_ERROR',
      `Evaluator is not configured (${EVALUATOR_MODEL.envVar} missing)`,
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EVALUATOR_MODEL.timeoutMs);
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
        model: EVALUATOR_MODEL.apiId,
        max_tokens: EVALUATOR_MODEL.maxTokens,
        temperature: EVALUATOR_MODEL.temperature,
        system,
        messages,
      }),
    });
  } catch (err) {
    // Network error, abort/timeout, DNS, etc.
    throw new EvaluatorError(
      'PROVIDER_ERROR',
      err instanceof Error ? err.message : 'Evaluator request failed',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '(unreadable)');
    throw new EvaluatorError(
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

export async function evaluateAttempt(
  params: EvaluateAttemptParams,
): Promise<EvaluateAttemptResult> {
  const { scenario } = params;
  const applicable = scenario.applicable_dimensions;
  const { system, userContent } = buildEvaluatorPrompt(params);

  // --- Provider call + JSON parse, with one retry on a parse failure. -------
  let messages: AnthropicMessage[] = [{ role: 'user', content: userContent }];
  let raw: unknown;
  let parseError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callEvaluatorModel(system, messages);
    try {
      raw = parseJsonFromClaude<unknown>(result, {
        contextLabel: 'Workbench evaluator',
      });
      parseError = undefined;
      break;
    } catch (err) {
      parseError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        // Append the failed reply + a corrective instruction and try once more.
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
    throw new EvaluatorError('PARSE_ERROR', parseError.message);
  }

  // --- Schema validation (no retry). ----------------------------------------
  const parsed = workbenchEvaluatorResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EvaluatorError(
      'SCHEMA_ERROR',
      `Evaluator JSON failed validation: ${parsed.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
    );
  }
  const dimensions = parsed.data;

  // Every applicable dimension must be present.
  const missing = applicable.filter((d) => dimensions[d] === undefined);
  if (missing.length > 0) {
    throw new EvaluatorError(
      'SCHEMA_ERROR',
      `Evaluator omitted required dimension(s): ${missing.join(', ')}`,
    );
  }

  // --- Scoring math (deterministic). ----------------------------------------
  const scores: WorkbenchScores = {};
  for (const dimension of applicable) {
    scores[dimension] = dimensions[dimension]!.score;
  }

  const values = applicable.map((d) => dimensions[d]!.score);
  const overallScore = Math.round(
    (values.reduce((sum, v) => sum + v, 0) / values.length) * 20,
  );

  const strengths = applicable
    .filter((d) => dimensions[d]!.score >= 4)
    .sort((a, b) => dimensions[b]!.score - dimensions[a]!.score)
    .slice(0, 3)
    .map((d) => dimensions[d]!.rationale);

  const improvements = applicable
    .filter((d) => 5 - dimensions[d]!.score > 0)
    .sort((a, b) => dimensions[a]!.score - dimensions[b]!.score) // largest gap (lowest score) first
    .slice(0, 3)
    .map((d) => dimensions[d]!.improvement);

  return { scores, overallScore, strengths, improvements, dimensions };
}
