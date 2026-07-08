import { z } from 'zod';

// Studio lead outreach email generator. Structure mirrors lib/tutoring/generator.ts:
// raw fetch to api.anthropic.com, forced tool_use so the model returns structured
// JSON, Zod-validated tool input. No temperature (Sonnet is fine at defaults for a
// short email), no thinking (incompatible with forced tool_choice).
export const OUTREACH_MODEL_ID = 'claude-sonnet-4-6';
const MAX_TOKENS = 2000;

export interface OutreachContext {
  company: string;
  contactName: string | null;
  industry: string | null;
  existingUrl: string | null;
  notes: string | null;
  previewUrl: string | null;
  previewPassword: string | null;
}

export const outreachEmailSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type GeneratedOutreach = z.infer<typeof outreachEmailSchema>;

const OUTREACH_TOOL = {
  name: 'submit_outreach_email',
  description:
    'Submit the drafted outreach email as a subject line and a plain-text body.',
  input_schema: {
    type: 'object' as const,
    properties: {
      subject: {
        type: 'string' as const,
        description: 'The email subject line — short, specific, not clickbait.',
      },
      body: {
        type: 'string' as const,
        description:
          'The plain-text email body. No "Subject:" line, no markdown, no placeholders like [Name].',
      },
    },
    required: ['subject', 'body'],
  },
};

const SYSTEM_PROMPT = `You are the founder of HonuVibe Studio, a small Hawaii-based studio that builds websites and AI-powered tools for local businesses. You are writing a first cold-outreach email to a prospective client.

Voice: warm, genuine, and local — the way one Hawaii small-business owner talks to another. Concise (roughly 90–150 words). No corporate jargon, no hype, no exclamation-point spam. Sound like a real person who did a little homework on their business, not a mass-mailer.

Rules:
- Open with something specific to THIS business (their industry or current site), not a generic hook.
- One clear value idea — how a better/AI-enabled web presence would help a business like theirs.
- Exactly one call to action. If a preview link is provided, invite them to look at the preview (mention the password if one is given) and offer a quick chat. If no preview link is provided, invite them to a short no-pressure chat.
- Do NOT invent facts, prices, timelines, testimonials, or details you were not given.
- Do NOT include a "Subject:" prefix in the body, markdown, or bracketed placeholders. Write the body ready to send, signed off as "Ryan, HonuVibe Studio".

Call the submit_outreach_email tool with the subject and body.`;

function buildPrompt(ctx: OutreachContext): string {
  const lines: string[] = [
    'Draft the outreach email for this prospective Studio client.',
    '',
    `Business name: ${ctx.company}`,
  ];
  if (ctx.contactName) lines.push(`Contact person: ${ctx.contactName}`);
  if (ctx.industry) lines.push(`Industry: ${ctx.industry}`);
  if (ctx.existingUrl) lines.push(`Current website: ${ctx.existingUrl}`);
  if (ctx.previewUrl) {
    lines.push(`Preview we built for them: ${ctx.previewUrl}`);
    if (ctx.previewPassword) {
      lines.push(`Preview password (share it in the email): ${ctx.previewPassword}`);
    }
  }
  if (ctx.notes) {
    lines.push('', 'Private notes from the studio (context only — do not quote verbatim):', ctx.notes);
  }
  if (!ctx.contactName) {
    lines.push('', 'No contact name is known — address the business warmly without inventing a name (e.g. "Hi there" / "Aloha").');
  }
  return lines.join('\n');
}

/**
 * Generate a subject + body outreach email for a Studio lead. Throws a
 * descriptive error on any failure (missing key, non-2xx, truncation, empty
 * tool input) so the route can map it to a JSON error response.
 */
export async function generateOutreachEmail(
  ctx: OutreachContext,
): Promise<GeneratedOutreach> {
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
      model: OUTREACH_MODEL_ID,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [OUTREACH_TOOL],
      tool_choice: { type: 'tool', name: OUTREACH_TOOL.name },
      messages: [{ role: 'user', content: buildPrompt(ctx) }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errorText}`);
  }

  const result = await response.json();

  if (result.stop_reason === 'max_tokens') {
    throw new Error('Outreach generation was truncated (hit max_tokens).');
  }

  const toolUseBlock = result.content?.find(
    (block: { type: string }) => block.type === 'tool_use',
  );

  if (
    !toolUseBlock?.input ||
    typeof toolUseBlock.input !== 'object' ||
    Object.keys(toolUseBlock.input).length === 0
  ) {
    throw new Error('Claude returned an empty outreach email (likely truncated).');
  }

  return outreachEmailSchema.parse(toolUseBlock.input);
}
