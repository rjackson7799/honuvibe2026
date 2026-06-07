import { describe, it, expect } from 'vitest';
import { resolvePostAuthRedirect } from './post-auth-redirect';

const EVENT_PATH = '/learn/dashboard/events/intro-ai-agents';

describe('resolvePostAuthRedirect', () => {
  it('honors a safe explicit redirect for an onboarded user', () => {
    expect(
      resolvePostAuthRedirect({ explicitRedirect: EVENT_PATH, onboarded: true, role: 'student' }),
    ).toBe(EVENT_PATH);
  });

  it('honors a safe explicit redirect even for a brand-new (non-onboarded) user', () => {
    // The bug fix: a freshly invite-created account must still land on the event
    // page, not be force-redirected to the dashboard welcome screen.
    expect(
      resolvePostAuthRedirect({ explicitRedirect: EVENT_PATH, onboarded: false, role: 'student' }),
    ).toBe(EVENT_PATH);
  });

  it('sends a non-onboarded user with no explicit redirect to the dashboard welcome', () => {
    expect(
      resolvePostAuthRedirect({ explicitRedirect: null, onboarded: false, role: 'student' }),
    ).toBe('/learn/dashboard?welcome=true');
  });

  it('applies role-based defaults for an onboarded user with no explicit redirect', () => {
    expect(resolvePostAuthRedirect({ explicitRedirect: null, onboarded: true, role: 'admin' })).toBe('/admin');
    expect(resolvePostAuthRedirect({ explicitRedirect: null, onboarded: true, role: 'partner' })).toBe('/partner');
    expect(
      resolvePostAuthRedirect({ explicitRedirect: null, onboarded: true, role: 'instructor' }),
    ).toBe('/instructor/courses');
    expect(resolvePostAuthRedirect({ explicitRedirect: null, onboarded: true, role: 'student' })).toBe('/learn/dashboard');
  });

  it('ignores an unsafe explicit redirect and falls through to default logic', () => {
    expect(
      resolvePostAuthRedirect({ explicitRedirect: '//evil.com', onboarded: true, role: 'admin' }),
    ).toBe('/admin');
    expect(
      resolvePostAuthRedirect({ explicitRedirect: 'https://evil.com', onboarded: false, role: 'student' }),
    ).toBe('/learn/dashboard?welcome=true');
  });
});
