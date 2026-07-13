import { describe, it, expect } from 'vitest';
import { getRequiredChecks } from '@/lib/vault/editor-progress';
import type { VaultContentType } from '@/lib/vault/types';

const empty = {
  titleEn: '',
  slug: '',
  url: '',
  bodyEn: '',
  toolWidgetKey: '',
};

describe('getRequiredChecks', () => {
  it.each([
    ['video', 3, 'url'],
    ['workshop', 3, 'url'],
    ['article', 3, 'body'],
    ['tool', 3, 'widget'],
    ['template', 2, null],
    ['prompt_pack', 2, null],
  ] as Array<[VaultContentType, number, string | null]>)(
    '%s → %i checks with type-specific key %s',
    (contentType, total, extraKey) => {
      const checks = getRequiredChecks({ contentType, ...empty });
      expect(checks).toHaveLength(total);
      expect(checks[0]).toMatchObject({ key: 'title', done: false });
      expect(checks[1]).toMatchObject({ key: 'slug', done: false });
      if (extraKey) expect(checks[2].key).toBe(extraKey);
    },
  );

  it('marks checks done from trimmed values', () => {
    const checks = getRequiredChecks({
      contentType: 'video',
      titleEn: ' Getting Started ',
      slug: 'getting-started',
      url: '   ',
      bodyEn: '',
      toolWidgetKey: '',
    });
    expect(checks.map((c) => c.done)).toEqual([true, true, false]);
  });

  it('article uses body, not url', () => {
    const checks = getRequiredChecks({
      contentType: 'article',
      ...empty,
      titleEn: 'T',
      slug: 't',
      bodyEn: '# Hello',
    });
    expect(checks.every((c) => c.done)).toBe(true);
  });

  it('tool completes on widget key', () => {
    const checks = getRequiredChecks({
      contentType: 'tool',
      ...empty,
      titleEn: 'T',
      slug: 't',
      toolWidgetKey: 'roi-calculator',
    });
    expect(checks.every((c) => c.done)).toBe(true);
  });
});
