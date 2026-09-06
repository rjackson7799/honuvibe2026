import { describe, expect, it } from 'vitest';
import { DELIVERABLE_TITLE_MAX, scopeBulletsToDeliverables } from './deliverable-seed';

function snapshot(scopeBody: string) {
  return {
    sections: [
      { key: 'exec_summary', title: 'Executive summary', body_md: '- Not a deliverable' },
      { key: 'scope', title: 'Scope & phases', body_md: scopeBody },
    ],
  };
}

describe('scopeBulletsToDeliverables', () => {
  it('takes the scope bullets only: bold stripped, paragraphs ignored, duplicates dropped', () => {
    const scope = '- **Homepage** redesign\n- Booking flow\n\nA paragraph about phases.\n- Booking flow';
    expect(scopeBulletsToDeliverables(snapshot(scope))).toEqual([
      { title: 'Homepage redesign' },
      { title: 'Booking flow' },
    ]);
  });

  it('ignores headings and every section that is not `scope`', () => {
    const scope = '## Phase one\n- Analytics setup\n\n## Phase two\n- Launch checklist';
    expect(scopeBulletsToDeliverables(snapshot(scope))).toEqual([
      { title: 'Analytics setup' },
      { title: 'Launch checklist' },
    ]);
    // The exec_summary bullet in the fixture is never picked up.
    expect(scopeBulletsToDeliverables(snapshot(scope)).map((d) => d.title)).not.toContain('Not a deliverable');
  });

  it('truncates a bullet longer than the column allows', () => {
    const long = 'X'.repeat(300);
    const [candidate] = scopeBulletsToDeliverables(snapshot(`- ${long}`));
    expect(candidate.title).toHaveLength(DELIVERABLE_TITLE_MAX);
    expect(candidate.title).toBe('X'.repeat(200));
  });

  it('de-duplicates case- and whitespace-insensitively', () => {
    const scope = '- Booking flow\n- booking   flow\n- BOOKING FLOW';
    expect(scopeBulletsToDeliverables(snapshot(scope))).toEqual([{ title: 'Booking flow' }]);
  });

  it('returns [] for an empty scope, a missing scope section, and a malformed snapshot', () => {
    expect(scopeBulletsToDeliverables(snapshot(''))).toEqual([]);
    expect(scopeBulletsToDeliverables(snapshot('Only a paragraph, no bullets.'))).toEqual([]);
    expect(scopeBulletsToDeliverables({ sections: [{ key: 'terms', body_md: '- Payment' }] })).toEqual([]);
    expect(scopeBulletsToDeliverables({ sections: 'not-an-array' })).toEqual([]);
    expect(scopeBulletsToDeliverables({})).toEqual([]);
    expect(scopeBulletsToDeliverables(null)).toEqual([]);
    expect(scopeBulletsToDeliverables(undefined)).toEqual([]);
  });

  it('drops blank bullets rather than seeding an empty title the CHECK would reject', () => {
    expect(scopeBulletsToDeliverables(snapshot('- \n- Real item\n-   '))).toEqual([{ title: 'Real item' }]);
  });
});
