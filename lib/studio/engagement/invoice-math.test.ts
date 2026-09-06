import { describe, expect, it } from 'vitest';
import {
  STRIPE_MINIMUM_MINOR,
  depositIssuable,
  depositLabel,
  invoiceNoun,
  splitDeposit,
} from './invoice-math';

describe('splitDeposit', () => {
  it('splits the click-path offer: 87500 at 50% → 43750 / 43750', () => {
    expect(splitDeposit(87500, 50)).toEqual({ deposit: 43750, balance: 43750 });
  });

  it('splits the JPY offer with no decimals: 132000 at 50% → 66000 / 66000', () => {
    expect(splitDeposit(132000, 50)).toEqual({ deposit: 66000, balance: 66000 });
  });

  it('rounds half UP and still sums exactly: 87501 at 50% → 43751 / 43750', () => {
    const split = splitDeposit(87501, 50);
    expect(split).toEqual({ deposit: 43751, balance: 43750 });
    expect(split.deposit + split.balance).toBe(87501);
  });

  it('at 100% takes the whole amount and leaves no balance', () => {
    expect(splitDeposit(87500, 100)).toEqual({ deposit: 87500, balance: 0 });
    expect(splitDeposit(132000, 100)).toEqual({ deposit: 132000, balance: 0 });
  });

  it('returns integers that sum exactly, for every total in a 0..10000 sweep at both pcts', () => {
    // Collect and assert ONCE: 20k iterations x 5 expect() calls is slow
    // enough to trip the default timeout under full-suite load, and a single
    // assertion on the offending cases reports them just as precisely.
    const bad: string[] = [];
    for (const pct of [50, 100] as const) {
      for (let total = 0; total <= 10_000; total += 1) {
        const { deposit, balance } = splitDeposit(total, pct);
        if (
          !Number.isInteger(deposit) ||
          !Number.isInteger(balance) ||
          deposit + balance !== total ||
          deposit < 0 ||
          balance < 0
        ) {
          bad.push(`${total}@${pct}% -> ${deposit}/${balance}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('rejects a pct outside the allowlist and a non-integer or negative total', () => {
    expect(() => splitDeposit(87500, 30)).toThrow(/pct must be 50 or 100/);
    expect(() => splitDeposit(87500, 0)).toThrow(/pct must be 50 or 100/);
    expect(() => splitDeposit(87500.5, 50)).toThrow(/non-negative integer/);
    expect(() => splitDeposit(-1, 50)).toThrow(/non-negative integer/);
  });
});

describe('depositIssuable', () => {
  it('accepts the click-path offers at both percentages', () => {
    expect(depositIssuable(87500, 50)).toEqual({ ok: true, split: { deposit: 43750, balance: 43750 } });
    expect(depositIssuable(132000, 100)).toEqual({ ok: true, split: { deposit: 132000, balance: 0 } });
  });

  it('refuses a performance offer with nothing to invoice', () => {
    expect(depositIssuable(0, 50)).toEqual({ ok: false, reason: 'nothing_to_bill' });
    expect(depositIssuable(0, 100)).toEqual({ ok: false, reason: 'nothing_to_bill' });
  });

  it('refuses a deposit under the Stripe minimum', () => {
    expect(depositIssuable(1, 50)).toEqual({ ok: false, reason: 'below_minimum' });
    expect(depositIssuable(60, 50)).toEqual({ ok: false, reason: 'below_minimum' });
    expect(depositIssuable(49, 100)).toEqual({ ok: false, reason: 'below_minimum' });
  });

  it('refuses a split whose BALANCE could never be billed, but allows it at 100%', () => {
    // 80 → 40 / 40: both halves are under the floor.
    expect(depositIssuable(80, 50)).toEqual({ ok: false, reason: 'below_minimum' });
    // 99 → 50 / 49: the deposit clears the floor, the balance does not.
    expect(depositIssuable(99, 50)).toEqual({ ok: false, reason: 'below_minimum' });
    // The same total at 100% has no balance to bill, so it is issuable.
    expect(depositIssuable(99, 100)).toEqual({ ok: true, split: { deposit: 99, balance: 0 } });
    // 100 → 50 / 50: both exactly on the floor.
    expect(depositIssuable(100, 50)).toEqual({ ok: true, split: { deposit: 50, balance: 50 } });
  });

  it('pins the Stripe minimum to 50 minor units for both currencies', () => {
    expect(STRIPE_MINIMUM_MINOR).toBe(50);
  });
});

describe('depositLabel / invoiceNoun', () => {
  it('builds the label the RPC builds, truncating the business name at 150 chars', () => {
    expect(depositLabel('Hawaii Palms', 50)).toBe('Deposit — Hawaii Palms (50%)');
    expect(depositLabel('Hawaii Palms', 100)).toBe('Build investment — Hawaii Palms (100%)');
    const long = 'X'.repeat(200);
    const label = depositLabel(long, 50);
    expect(label).toBe(`Deposit — ${'X'.repeat(150)} (50%)`);
    expect(label.length).toBeLessThanOrEqual(200);
  });

  it('names each invoice kind the way the timeline and the emails do', () => {
    expect(invoiceNoun('deposit', 50)).toBe('Deposit');
    expect(invoiceNoun('deposit', 100)).toBe('Build investment');
    expect(invoiceNoun('balance', 50)).toBe('Balance');
    expect(invoiceNoun('care_month', null)).toBe('Care');
  });
});
