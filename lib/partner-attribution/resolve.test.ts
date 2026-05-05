import { describe, it, expect } from 'vitest';
import { resolveEnrollmentPartnerId } from './resolve';

describe('resolveEnrollmentPartnerId', () => {
  it('returns course owner when course has a partner_id', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: 'p-owner',
        cookiePartnerId: 'p-cookie',
      }),
    ).toBe('p-owner');
  });

  it('returns course owner even when no cookie is present', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: 'p-owner',
        cookiePartnerId: null,
      }),
    ).toBe('p-owner');
  });

  it('falls back to cookie when course has no owner', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: null,
        cookiePartnerId: 'p-cookie',
      }),
    ).toBe('p-cookie');
  });

  it('returns null when neither source provides a partner', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: null,
        cookiePartnerId: null,
      }),
    ).toBeNull();
  });

  it('treats empty string as null', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: '',
        cookiePartnerId: 'p-cookie',
      }),
    ).toBe('p-cookie');
  });
});
