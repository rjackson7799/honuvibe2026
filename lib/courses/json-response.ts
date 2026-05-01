type AnthropicMessagesResult = {
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
};

export function parseJsonFromClaude<T>(
  result: AnthropicMessagesResult,
  opts: { contextLabel: string },
): T {
  if (result.stop_reason === 'max_tokens') {
    throw new Error(
      `${opts.contextLabel} response was truncated (hit max_tokens). ` +
        `Try a shorter course (fewer weeks) or reduce the amount of content requested.`,
    );
  }

  const textBlock = result.content?.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error(`No text response from Claude for ${opts.contextLabel}`);
  }

  let jsonStr = textBlock.text.trim();

  const fenceMatch =
    jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    jsonStr.match(/~~~(?:json)?\s*([\s\S]*?)~~~/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start > 0 || (end !== -1 && end < jsonStr.length - 1)) {
    if (start !== -1 && end > start) jsonStr = jsonStr.slice(start, end + 1);
  }

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
