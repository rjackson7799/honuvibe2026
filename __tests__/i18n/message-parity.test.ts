import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

/**
 * Guards the classic missing-translation regression: every key present in one
 * locale must exist in the other. Walks both trees and compares the flattened
 * dotted key sets. Values are not compared (the point is structural parity).
 */
function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return [prefix];
  }
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(...flattenKeys(v, path));
  }
  return out;
}

describe('message parity (en.json ⇄ ja.json)', () => {
  const enKeys = flattenKeys(en).sort();
  const jaKeys = flattenKeys(ja).sort();

  it('has no keys present in EN but missing in JA', () => {
    const missingInJa = enKeys.filter((k) => !jaKeys.includes(k));
    expect(missingInJa).toEqual([]);
  });

  it('has no keys present in JA but missing in EN', () => {
    const missingInEn = jaKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it('has identical key trees in both locales', () => {
    expect(enKeys).toEqual(jaKeys);
  });
});
