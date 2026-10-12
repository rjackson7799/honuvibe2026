import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRACK_IDS, TRACK_KEYS, isTrackId, parseTrackInput } from '@/lib/tracks';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/079_tracks_and_vault_inclusion.sql'),
  'utf8',
);

function checkValues(constraint: string): string[] {
  const re = new RegExp(`${constraint} CHECK \\(\\s*track IS NULL OR track IN \\(([^)]*)\\)`);
  const match = migration.match(re);
  if (!match) throw new Error(`CHECK ${constraint} not found in 079`);
  return match[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''));
}

describe('lib/tracks', () => {
  it.each(['content_items_track_check', 'courses_track_check'])(
    'TRACK_IDS matches the %s CHECK in 079',
    (constraint) => {
      expect(checkValues(constraint)).toEqual([...TRACK_IDS]);
    },
  );

  it('has a design key for every track', () => {
    expect(Object.keys(TRACK_KEYS).sort()).toEqual([...TRACK_IDS].sort());
  });

  it.each([['en', en], ['ja', ja]] as const)('has a label and blurb for every track in %s', (_l, messages) => {
    const tracks = (messages as unknown as { tracks: Record<string, { label?: string; blurb?: string } | string> }).tracks;
    expect(typeof tracks.all).toBe('string');
    for (const id of TRACK_IDS) {
      const entry = tracks[id] as { label?: string; blurb?: string };
      expect(entry?.label, `${id}.label`).toBeTruthy();
      expect(entry?.blurb, `${id}.blurb`).toBeTruthy();
    }
  });

  it('isTrackId accepts only the five ids', () => {
    expect(isTrackId('ai_essentials')).toBe(true);
    expect(isTrackId('AI_ESSENTIALS')).toBe(false);
    expect(isTrackId('ess')).toBe(false);
    expect(isTrackId(null)).toBe(false);
  });

  it('parseTrackInput clears on null/empty and rejects unknown values', () => {
    expect(parseTrackInput('build_with_ai')).toBe('build_with_ai');
    expect(parseTrackInput(null)).toBeNull();
    expect(parseTrackInput('')).toBeNull();
    expect(() => parseTrackInput('bogus')).toThrow(/Invalid track/);
    expect(() => parseTrackInput(undefined)).toThrow(/Invalid track/);
  });
});
