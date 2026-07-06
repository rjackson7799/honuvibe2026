import { generatedSessionReportSchema, SESSION_REPORT_TOOL, type GeneratedSessionReport } from './schemas';
import { SESSION_REPORT_SYSTEM_PROMPT, buildSessionReportPrompt } from './prompt';
import type { SessionReportContext } from './types';

// Opus 4.8. No temperature/top_p (400s on Opus 4.8) and no `thinking`
// (incompatible with forced tool_choice). Ceiling is output tokens, not input:
// a full bilingual report runs ~6–16k output tokens, so 24k gives headroom to
// keep verbose sessions from truncating (which yields an empty tool input).
export const TUTORING_MODEL_ID = 'claude-opus-4-8';
const MAX_TOKENS = 24000;

/**
 * Generate a structured 1v1 session report from a raw transcript + prior
 * pattern history. Returns the FULL (instructor-inclusive) report; the caller
 * splits it via splitReport(). Throws a descriptive error on any failure,
 * including output truncation, so the route can mark the row 'failed'.
 */
export async function generateSessionReport(
  context: SessionReportContext,
): Promise<GeneratedSessionReport> {
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
      model: TUTORING_MODEL_ID,
      max_tokens: MAX_TOKENS,
      system: SESSION_REPORT_SYSTEM_PROMPT,
      tools: [SESSION_REPORT_TOOL],
      tool_choice: { type: 'tool', name: SESSION_REPORT_TOOL.name },
      messages: [
        {
          role: 'user',
          content: buildSessionReportPrompt(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errorText}`);
  }

  const result = await response.json();

  const truncated = result.stop_reason === 'max_tokens';
  if (truncated) {
    throw new Error(
      'Report generation was truncated (hit max_tokens). The transcript may be very long or the report too large — try trimming the transcript and regenerating.',
    );
  }

  const toolUseBlock = result.content?.find(
    (block: { type: string }) => block.type === 'tool_use',
  );

  // An empty tool input (no keys) is the signature of a silently truncated tool
  // call — surface it as a clear failure rather than a raw schema error.
  if (
    !toolUseBlock?.input ||
    typeof toolUseBlock.input !== 'object' ||
    Object.keys(toolUseBlock.input).length === 0
  ) {
    throw new Error(
      'Claude returned an empty report (likely truncated). Try regenerating; if it recurs, trim the transcript.',
    );
  }

  // tool_use input is already a parsed object — no JSON.parse needed.
  return generatedSessionReportSchema.parse(toolUseBlock.input);
}
