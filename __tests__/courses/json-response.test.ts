import { describe, it, expect } from 'vitest';
import { parseJsonFromClaude } from '@/lib/courses/json-response';

function reply(text: string) {
  return { content: [{ type: 'text', text }] };
}

const OPTS = { contextLabel: 'test' };

describe('parseJsonFromClaude', () => {
  it('parses a raw JSON reply', () => {
    expect(parseJsonFromClaude(reply('{"a": 1}'), OPTS)).toEqual({ a: 1 });
  });

  it('parses raw JSON whose string values contain code fences', () => {
    const payload = { body_jp: '# Intro\n\n```js\nconsole.log(1);\n```' };
    expect(parseJsonFromClaude(reply(JSON.stringify(payload)), OPTS)).toEqual(
      payload,
    );
  });

  it('does not corrupt raw JSON containing ",}" inside a string value', () => {
    const payload = { code: 'const x = { a: 1,};' };
    expect(parseJsonFromClaude(reply(JSON.stringify(payload)), OPTS)).toEqual(
      payload,
    );
  });

  it('unwraps a ```json fence', () => {
    expect(
      parseJsonFromClaude(reply('```json\n{"a": 1}\n```'), OPTS),
    ).toEqual({ a: 1 });
  });

  it('unwraps a fence even when the JSON contains inner code fences', () => {
    const payload = { body_jp: 'text\n\n```py\nprint(1)\n```\n\nmore' };
    const text = '```json\n' + JSON.stringify(payload) + '\n```';
    expect(parseJsonFromClaude(reply(text), OPTS)).toEqual(payload);
  });

  it('strips prose around the JSON object and trailing commas', () => {
    expect(
      parseJsonFromClaude(reply('Here you go: {"a": 1,} thanks'), OPTS),
    ).toEqual({ a: 1 });
  });

  it('throws on truncation via max_tokens', () => {
    expect(() =>
      parseJsonFromClaude(
        { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }] },
        OPTS,
      ),
    ).toThrow(/truncated/);
  });

  it('throws a contextual error on unparseable text', () => {
    expect(() => parseJsonFromClaude(reply('not json at all'), OPTS)).toThrow(
      /Failed to parse test JSON/,
    );
  });
});
