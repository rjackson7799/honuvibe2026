// @vitest-environment node
//
// The client-facing money copy (slices 4 + 5). These are sentences a paying
// client reads about their own bank statement, so the tests are about TRUTH,
// not tone:
//
//   * a PARTIAL refund must not read as a full one. 4A's band took a single
//     amount and the page passed the ORIGINAL, so a $200 refund of a $437.50
//     deposit told the client the whole $437.50 had come back;
//   * "settles the project in full" is a claim about the WHOLE project and
//     must never appear on a band that only knows about the balance.
import { describe, expect, test } from 'vitest';
import { T } from './copy';

const LOCALES = ['en', 'ja'] as const;

describe('the refunded band carries BOTH amounts', () => {
  test.each(LOCALES)('%s: a partial refund names the refunded AND the original amount', (locale) => {
    const body = T[locale].refundedBand('Deposit', '$200.00', '$437.50', true, 'September 25, 2026');
    expect(body).toContain('$200.00');
    expect(body).toContain('$437.50');
  });

  test.each(LOCALES)('%s: a full refund names the amount and reads differently from a partial', (locale) => {
    const partial = T[locale].refundedBand('Deposit', '$200.00', '$437.50', true, 'September 25, 2026');
    const full = T[locale].refundedBand('Deposit', '$437.50', '$437.50', false, 'September 25, 2026');
    expect(full).toContain('$437.50');
    expect(full).not.toBe(partial);
  });

  test('EN wording distinguishes the two without a separate band', () => {
    expect(T.en.refundedBand('Deposit', '$200.00', '$437.50', true, 'Sep 25')).toMatch(/\$200\.00 of the \$437\.50/);
    expect(T.en.refundedBand('Deposit', '$437.50', '$437.50', false, 'Sep 25')).toMatch(/The deposit of \$437\.50 was refunded/);
  });

  test('the title follows the kind in EN', () => {
    expect(T.en.refundedBandTitle('Balance')).toBe('Balance refunded');
    expect(T.en.refundedBandTitle('Deposit')).toBe('Deposit refunded');
  });
});

describe('"settles the project in full" is earned, never assumed', () => {
  test.each(LOCALES)('%s: the plain paid band does NOT claim full settlement', (locale) => {
    const plain = T[locale].balancePaidBand('$437.50', 'September 22, 2026');
    const inFull = T[locale].balancePaidInFullBand('$437.50', 'September 22, 2026');
    expect(plain).not.toBe(inFull);
    expect(plain.length).toBeLessThan(inFull.length);
  });

  test('EN: only the in-full variant says so', () => {
    expect(T.en.balancePaidBand('$437.50', 'Sep 22')).not.toMatch(/in full/i);
    expect(T.en.balancePaidInFullBand('$437.50', 'Sep 22')).toMatch(/settles the project in full/i);
    expect(T.en.balancePaidBand('$437.50', 'Sep 22')).toMatch(/received/i);
  });

  test('JA: only the in-full variant says so', () => {
    expect(T.ja.balancePaidBand('¥66,000', '2026年9月22日')).not.toContain('全額');
    expect(T.ja.balancePaidInFullBand('¥66,000', '2026年9月22日')).toContain('全額');
  });
});

describe('the balance keys exist in BOTH locales and never say "deposit"', () => {
  const KEYS = [
    'balanceDueBand',
    'balanceDueAfterDepositBand',
    'balanceButton',
    'balancePendingBand',
    'balanceThanksBand',
    'balancePaidBandTitle',
    'balancePaidBand',
    'balancePaidInFullBand',
    'payStale',
    'refundedBand',
    'refundedBandTitle',
  ] as const;

  test.each(KEYS)('%s is present in en and ja', (key) => {
    for (const locale of LOCALES) {
      expect(T[locale], `${locale}.${key}`).toHaveProperty(key);
      expect(T[locale][key]).toBeTruthy();
    }
  });

  test('the EN balance button says balance, not deposit', () => {
    // The regression this guards: depositButton is the literal string
    // "Pay the deposit →", so a balance band reusing it asks for the wrong money.
    expect(T.en.balanceButton).toMatch(/balance/i);
    expect(T.en.balanceButton).not.toMatch(/deposit/i);
    expect(T.en.balanceButton).not.toBe(T.en.depositButton);
    expect(T.ja.balanceButton).not.toBe(T.ja.depositButton);
    expect(T.ja.balanceButton).toContain('残金');
  });

  test('the balance bands talk about the balance, not the deposit', () => {
    expect(T.en.balanceDueBand('Kai', 'Sep 6', '$437.50')).toMatch(/balance/i);
    expect(T.en.balanceDueBand('Kai', 'Sep 6', '$437.50')).not.toMatch(/deposit/i);
    expect(T.en.balancePendingBand).toMatch(/balance/i);
    expect(T.en.balanceThanksBand).toMatch(/balance/i);
  });

  test('balanceDueAfterDepositBand names the deposit amount, its date AND the balance', () => {
    const body = T.en.balanceDueAfterDepositBand('$437.50', 'September 7, 2026', '$437.50');
    expect(body).toMatch(/Deposit of \$437\.50 received on September 7, 2026/);
    expect(body).toMatch(/balance of \$437\.50 is now due/i);
  });

  test('payStale tells the client to reload, not that payments are broken', () => {
    expect(T.en.payStale).toMatch(/reload/i);
    expect(T.en.payStale).not.toMatch(/unavailable/i);
    expect(T.ja.payStale).toContain('再読み込み');
  });
});
