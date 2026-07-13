import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

type Messages = Record<string, Record<string, unknown>>;

const enCommunity = (en as Messages).community;
const jaCommunity = (ja as Messages).community;

describe('community i18n parity', () => {
  it('EN and JA community namespaces have identical top-level keys', () => {
    const enKeys = Object.keys(enCommunity).sort();
    const jaKeys = Object.keys(jaCommunity).sort();
    expect(jaKeys).toEqual(enKeys);
  });

  it('includes the new editor / error / open-post keys in both locales', () => {
    const required = [
      'edit_save',
      'edit_cancel',
      'error_generic',
      'error_network',
      'error_edit_window',
      'confirm_delete_comment',
      'open_post_by',
    ];
    for (const key of required) {
      expect(typeof enCommunity[key]).toBe('string');
      expect((enCommunity[key] as string).length).toBeGreaterThan(0);
      expect(typeof jaCommunity[key]).toBe('string');
      expect((jaCommunity[key] as string).length).toBeGreaterThan(0);
    }
  });

  it('open_post_by carries the {name} placeholder in both locales', () => {
    expect(enCommunity.open_post_by).toContain('{name}');
    expect(jaCommunity.open_post_by).toContain('{name}');
  });
});
