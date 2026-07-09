import { describe, expect, test } from 'vitest';
import { cjkHyphenate } from './fonts';

describe('cjkHyphenate', () => {
  test('leaves a plain English word intact', () => {
    expect(cjkHyphenate('inventory')).toEqual(['inventory']);
  });

  test('splits a run of Japanese into individual characters', () => {
    expect(cjkHyphenate('在庫')).toEqual(['在', '庫']);
  });

  test('splits CJK per-char but keeps embedded Latin runs whole', () => {
    // 'AIを使う' → 'AI' stays together, each kana/kanji is its own break point.
    expect(cjkHyphenate('AIを使う')).toEqual(['AI', 'を', '使', 'う']);
  });

  test('empty string returns a single empty token', () => {
    expect(cjkHyphenate('')).toEqual(['']);
  });
});
