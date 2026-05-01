# Course Wizard JSON Parse Error — Fix Plan

**Date:** 2026-04-21
**Trigger:** User hit `Expected ',' or ']' after array element in JSON at position 28807 (line 684 column 10)` on `/ja/admin/courses/upload` step 3 (Instructions).

## Context

The "Create Course → Create with Wizard" flow calls Claude Sonnet 4 via the Anthropic Messages API to generate a full course curriculum as JSON. The response is `JSON.parse`'d with only minimal cleanup (code-fence stripping + outermost `{...}` fallback). When Claude returns JSON that is truncated, has a trailing comma, or has other common LLM quirks, the parse fails and the error text bubbles straight to the UI.

The sibling translator module (`lib/courses/translator.ts`) already has most of the safeguards we need — truncation detection (`stop_reason === 'max_tokens'`), trailing-comma sanitization, and a snippet-around-error-position diagnostic. These were never ported back to the generator or the markdown parser.

Evidence pointing at the root cause for this specific failure:
- Error position 28807 ≈ ~7,200 tokens of JSON — right at the edge of the generator's `max_tokens: 8192` ceiling ([lib/courses/generator.ts:173](lib/courses/generator.ts#L173)). Very likely a mid-array truncation.
- The generator does **not** inspect `result.stop_reason`, so truncation surfaces as a cryptic parse error instead of a clear "response was truncated" message.
- A trailing-comma-before-`]` from the LLM would also produce this exact error class and is not handled.

Goal: make the wizard robust to common LLM JSON issues and fail loudly/clearly when it can't recover.

## Files To Modify

1. **`lib/courses/json-response.ts`** *(new)* — shared helper that extracts + sanitizes + parses a JSON response from a Claude Messages API result, with a clear snippet-based error.
2. **`lib/courses/generator.ts`** — replace inline extract/parse block (lines 189–220) with the shared helper; bump `max_tokens`.
3. **`lib/courses/parser.ts`** — same replacement for the markdown-upload path (same duplicated logic lives around lines 130–169); bump `max_tokens` to match.
4. **`lib/courses/translator.ts`** — adopt the shared helper so we only have one place to maintain JSON repair logic (the existing inline logic around lines 178–200 becomes a call to the helper).

No UI changes needed — `CourseWizard.tsx` already surfaces the server-side error message directly ([components/admin/wizard/CourseWizard.tsx:52-75](components/admin/wizard/CourseWizard.tsx#L52-L75)).

## Implementation

### 1. New helper: `lib/courses/json-response.ts`

Export a single function:

```ts
type AnthropicMessagesResult = {
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
};

export function parseJsonFromClaude<T>(
  result: AnthropicMessagesResult,
  opts: { contextLabel: string }, // e.g. "course generation", "course parsing", "translation"
): T {
  if (result.stop_reason === 'max_tokens') {
    throw new Error(
      `${opts.contextLabel} response was truncated (hit max_tokens). ` +
      `Try a shorter course (fewer weeks) or reduce the amount of content requested.`,
    );
  }

  const textBlock = result.content?.find((b) => b.type === 'text');
  if (!textBlock?.text) throw new Error(`No text response from Claude for ${opts.contextLabel}`);

  let jsonStr = textBlock.text.trim();

  // 1. Strip ``` or ~~~ code fences if present
  const fenceMatch =
    jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    jsonStr.match(/~~~(?:json)?\s*([\s\S]*?)~~~/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  // 2. Narrow to outermost { ... } if there is preamble/postamble
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start > 0 || (end !== -1 && end < jsonStr.length - 1)) {
    if (start !== -1 && end > start) jsonStr = jsonStr.slice(start, end + 1);
  }

  // 3. Sanitize common LLM issues: trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    const posMatch = String(err).match(/position (\d+)/);
    const pos = posMatch ? Number(posMatch[1]) : -1;
    const snippet =
      pos >= 0
        ? jsonStr.slice(Math.max(0, pos - 80), pos + 80)
        : jsonStr.slice(0, 200);
    throw new Error(
      `Failed to parse ${opts.contextLabel} JSON: ${String(err)}. Near: ...${snippet}...`,
    );
  }
}
```

Why it's a helper, not inlined again: three call-sites (generator, parser, translator) had three slightly different copies of this logic — that's how the generator drifted behind the translator in the first place.

### 2. `lib/courses/generator.ts`

- Replace [lib/courses/generator.ts:189-220](lib/courses/generator.ts#L189-L220) with:
  ```ts
  const result = (await response.json()) as Parameters<typeof parseJsonFromClaude>[0];
  const parsed = parseJsonFromClaude<ParsedCourseData>(result, {
    contextLabel: 'course generation',
  });
  ```
- Bump `max_tokens` on [lib/courses/generator.ts:173](lib/courses/generator.ts#L173) from `8192` → `16384`. Claude Sonnet 4 supports far more; 16K gives comfortable headroom for an 8-week course with full session/assignment/vocab arrays without risking another truncation. (Not raising to the max — keeps cost predictable and still lets the truncation message trigger on genuinely oversized requests.)

### 3. `lib/courses/parser.ts`

- Same replacement as generator for [lib/courses/parser.ts:130-169](lib/courses/parser.ts#L130-L169), with `contextLabel: 'course parsing'`.
- Bump `max_tokens` to `16384` for consistency with the generator (markdown uploads can be just as large).

### 4. `lib/courses/translator.ts`

- Replace the inline truncation check + sanitize + parse block at [lib/courses/translator.ts:160-200](lib/courses/translator.ts#L160-L200) with a single call to `parseJsonFromClaude<CourseTranslationOutput>(result, { contextLabel: 'translation' })`.
- This is a pure refactor — keeps existing behavior, removes duplication.

## What This Does Not Do

- **Does not swap to structured outputs / tool use.** The Anthropic Messages API doesn't have a first-class JSON mode for this model; switching to tool-calling would require reshaping the entire prompt schema and is out of scope for a bug fix. If truncation continues to bite after the `max_tokens` bump, that's the next step to consider.
- **Does not add a `jsonrepair` dependency.** Trailing-comma + fence-stripping covers the observed failures. We can revisit if we see unescaped-quote or missing-comma errors in the wild.
- **Does not upgrade the model.** `claude-sonnet-4-20250514` is kept as-is; a model upgrade is a separate decision.

## Verification

1. **Reproduce the original failure** — before changes, run the wizard with the same inputs the user used (8-week course if that was the case) and capture the error. After changes, expect one of:
   - Success (most likely — the 16K token bump resolves truncation).
   - Clear "response was truncated (hit max_tokens)" message if the user picks extreme parameters.
   - A `Near: ...` snippet if there's a genuine syntax issue, which tells us exactly what Claude produced wrong.
2. **Translator regression check** — run an existing course through the translation flow (admin translate button) to confirm the refactor didn't break it; the output should be byte-identical to before.
3. **Parser regression check** — upload a known-good markdown file via the "Upload Markdown" tab and confirm it still parses.
4. **Unit-level sanity** (optional, fast): in a scratch node script, pass `parseJsonFromClaude` a result with (a) a trailing comma, (b) `stop_reason: 'max_tokens'`, (c) code-fenced JSON, (d) JSON with leading/trailing prose — confirm each case behaves as documented.

## Out Of Scope / Follow-ups

- Adding a retry-on-parse-failure loop (send the broken JSON back to Claude with "fix this" instructions).
- Switching to streaming so we can detect truncation earlier and show progress.
- Moving to AI SDK with a Zod schema for true structured output.
