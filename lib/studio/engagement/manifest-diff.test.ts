import { describe, expect, it } from 'vitest';
import type { EngagementQuestion, QuestionnaireSection } from './questions-schema';
import { structuralViolation } from './manifest-diff';

// The server-side half of "after send, editing is reword-only": prompts, help,
// option LABELS, section titles/blurbs may change; every structural property
// is frozen. Pinned here because it is the most likely place a later
// "helpful" relaxation would slip through.

const sections: QuestionnaireSection[] = [
  { key: 'orientation', title: 'About you', blurb: null },
  { key: 'economics', title: 'Economics', blurb: 'Money first' },
];

function q(overrides: Partial<EngagementQuestion>): EngagementQuestion {
  return {
    id: 'q',
    section_key: 'orientation',
    qtype: 'text',
    prompt: 'Prompt',
    help: null,
    required: false,
    options: [],
    allow_other: false,
    max_select: null,
    long: false,
    ...overrides,
  };
}

const before = {
  sections,
  questions: [
    q({ id: 'about', long: true, required: true }),
    q({
      id: 'goal',
      qtype: 'single',
      allow_other: true,
      options: [
        { value: 'leads', label: 'More leads' },
        { value: 'bookings', label: 'More bookings' },
      ],
    }),
    q({
      id: 'channels',
      section_key: 'economics',
      qtype: 'multi',
      max_select: 2,
      options: [
        { value: 'google', label: 'Google' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'referral', label: 'Word of mouth' },
      ],
    }),
  ],
};

function withQuestion(id: string, patch: Partial<EngagementQuestion>) {
  return { ...before, questions: before.questions.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
}

describe('structuralViolation (reword-only after send)', () => {
  it('is null for an identical manifest', () => {
    expect(structuralViolation(before, before)).toBeNull();
  });

  it('allows rewording: prompts, help, option labels, section titles and blurbs', () => {
    const after = {
      sections: [
        { key: 'orientation', title: 'About your business', blurb: 'Tell us a little' },
        { key: 'economics', title: 'Money', blurb: null },
      ],
      questions: before.questions.map((x) => ({
        ...x,
        prompt: `${x.prompt} (reworded)`,
        help: 'Some help',
        options: x.options.map((o) => ({ ...o, label: `${o.label}!` })),
      })),
    };
    expect(structuralViolation(before, after)).toBeNull();
  });

  it('rejects adding, removing or reordering questions', () => {
    expect(structuralViolation(before, { ...before, questions: [...before.questions, q({ id: 'extra' })] })).toMatch(/questions cannot be added/);
    expect(structuralViolation(before, { ...before, questions: before.questions.slice(1) })).toMatch(/questions cannot be added/);
    expect(structuralViolation(before, { ...before, questions: [before.questions[1], before.questions[0], before.questions[2]] })).toMatch(
      /reordered/,
    );
  });

  it('rejects adding, removing or reordering sections', () => {
    expect(structuralViolation(before, { ...before, sections: [sections[1], sections[0]] })).toMatch(/sections cannot be/);
    expect(structuralViolation(before, { ...before, sections: [sections[0]] })).toMatch(/sections cannot be/);
  });

  it('rejects a type, required, allow_other, max_select, long or section change', () => {
    expect(structuralViolation(before, withQuestion('goal', { qtype: 'multi' }))).toMatch(/cannot change type/);
    expect(structuralViolation(before, withQuestion('about', { required: false }))).toMatch(/cannot change required/);
    expect(structuralViolation(before, withQuestion('goal', { allow_other: false }))).toMatch(/cannot change allow_other/);
    expect(structuralViolation(before, withQuestion('channels', { max_select: 3 }))).toMatch(/cannot change max_select/);
    expect(structuralViolation(before, withQuestion('about', { long: false }))).toMatch(/cannot change long/);
    expect(structuralViolation(before, withQuestion('goal', { section_key: 'economics' }))).toMatch(/cannot move/);
  });

  it('rejects changing, adding or removing option VALUES (labels are free)', () => {
    expect(
      structuralViolation(
        before,
        withQuestion('goal', {
          options: [
            { value: 'leads', label: 'More leads' },
            { value: 'reservations', label: 'More bookings' },
          ],
        }),
      ),
    ).toMatch(/option values cannot change/);
    expect(
      structuralViolation(before, withQuestion('goal', { options: [...before.questions[1].options, { value: 'brand', label: 'Brand' }] })),
    ).toMatch(/option values cannot change/);
    expect(structuralViolation(before, withQuestion('goal', { options: before.questions[1].options.slice(0, 1) }))).toMatch(
      /option values cannot change/,
    );
  });
});
