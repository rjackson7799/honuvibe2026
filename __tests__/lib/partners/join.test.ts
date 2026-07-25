import { describe, it, expect } from 'vitest';
import {
  JOIN_CODE_PATTERN,
  generateInviteToken,
  generateJoinCode,
  hashInviteToken,
  isJoinOutcome,
  isPlausibleInviteToken,
  isSuccessOutcome,
  normalizeJoinCode,
} from '@/lib/partners/join';
import { safeAccentColor, contrastRatio } from '@/lib/partners/contrast';

describe('normalizeJoinCode', () => {
  it('trims and uppercases so a pasted code still resolves', () => {
    expect(normalizeJoinCode('  abcd2345 ')).toBe('ABCD2345');
  });

  it('accepts the full length range the DB CHECK allows', () => {
    expect(normalizeJoinCode('ABCD2345')).toBe('ABCD2345');
    expect(normalizeJoinCode('A'.repeat(24))).toBe('A'.repeat(24));
  });

  it('rejects anything the DB would reject, rather than sending it on', () => {
    expect(normalizeJoinCode('ABC234')).toBeNull(); // too short
    expect(normalizeJoinCode('A'.repeat(25))).toBeNull(); // too long
    expect(normalizeJoinCode('ABCD-234')).toBeNull(); // punctuation
    expect(normalizeJoinCode('ABCD0234')).toBeNull(); // 0 is not in the charset
    expect(normalizeJoinCode('ABCD1234')).toBeNull(); // nor is 1
    expect(normalizeJoinCode('')).toBeNull();
    expect(normalizeJoinCode(null)).toBeNull();
    expect(normalizeJoinCode(undefined)).toBeNull();
  });
});

describe('generateJoinCode', () => {
  it('always produces a code the DB CHECK accepts', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(JOIN_CODE_PATTERN.test(generateJoinCode())).toBe(true);
    }
  });

  it('never emits the visually ambiguous I or O', () => {
    const sample = Array.from({ length: 300 }, () => generateJoinCode()).join('');
    expect(sample).not.toMatch(/[IO]/);
  });

  it('clamps a requested length into the DB-allowed range', () => {
    expect(generateJoinCode(2)).toHaveLength(8);
    expect(generateJoinCode(99)).toHaveLength(24);
    expect(generateJoinCode(12)).toHaveLength(12);
  });

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateJoinCode()));
    expect(codes.size).toBe(500);
  });
});

describe('invite tokens', () => {
  it('generates a 256-bit hex token', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(isPlausibleInviteToken(token)).toBe(true);
  });

  it('hashes to stable sha256 hex', () => {
    const token = generateInviteToken();
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).not.toBe(token);
  });

  it('rejects junk before it ever reaches the database', () => {
    expect(isPlausibleInviteToken('')).toBe(false);
    expect(isPlausibleInviteToken('nope')).toBe(false);
    expect(isPlausibleInviteToken('A'.repeat(64))).toBe(false); // uppercase hex
    expect(isPlausibleInviteToken(null)).toBe(false);
  });
});

describe('join outcomes', () => {
  it('recognizes every outcome the RPCs can return', () => {
    expect(isJoinOutcome('joined')).toBe(true);
    expect(isJoinOutcome('seat_revoked_previously')).toBe(true);
    expect(isJoinOutcome('exhausted')).toBe(true);
    expect(isJoinOutcome('nonsense')).toBe(false);
    expect(isJoinOutcome(undefined)).toBe(false);
  });

  it('treats only membership-activating outcomes as success', () => {
    expect(isSuccessOutcome('joined')).toBe(true);
    expect(isSuccessOutcome('joined_no_seat')).toBe(true);
    expect(isSuccessOutcome('already_member')).toBe(true);
    expect(isSuccessOutcome('seat_revoked_previously')).toBe(true);
    expect(isSuccessOutcome('conflict')).toBe(false);
    expect(isSuccessOutcome('invalid')).toBe(false);
    expect(isSuccessOutcome('expired')).toBe(false);
    expect(isSuccessOutcome('exhausted')).toBe(false);
  });
});

describe('safeAccentColor', () => {
  it('keeps a partner color that reads on both themes', () => {
    // Mid-tone coral: clears 3:1 against near-black and against white.
    expect(safeAccentColor('#c2564b')).toBe('#c2564b');
  });

  it('drops a color that vanishes on the dark theme', () => {
    expect(safeAccentColor('#0a0d16')).toBeNull();
  });

  it('drops a color that vanishes on the light theme', () => {
    expect(safeAccentColor('#fffdf5')).toBeNull();
  });

  it('normalizes shorthand hex and tolerates a missing hash', () => {
    expect(safeAccentColor('c2564b')).toBe('#c2564b');
    expect(safeAccentColor('#C55')).toBe('#cc5555');
  });

  it('returns null for unparseable input so the caller falls back to teal', () => {
    expect(safeAccentColor('rgb(1,2,3)')).toBeNull();
    expect(safeAccentColor('')).toBeNull();
    expect(safeAccentColor(null)).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for a color against itself', () => {
    expect(contrastRatio('#5eaaa8', '#5eaaa8')).toBeCloseTo(1, 5);
  });
});
