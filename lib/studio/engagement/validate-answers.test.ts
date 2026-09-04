import { describe, expect, it } from 'vitest';
import {
  OTHER_VALUE,
  TEXT_MAX_LONG,
  TEXT_MAX_SHORT,
  questionnaireManifestSchema,
  type AnswerSnapshot,
  type EngagementQuestion,
} from './questions-schema';
import {
  findMissingRequired,
  isAnswerPresent,
  renderSnapshot,
  validateOneAnswer,
} from './validate-answers';

function q(overrides: Partial<EngagementQuestion>): EngagementQuestion {
  return {
    id: 'q1',
    section_key: 'orientation',
    qtype: 'text',
    prompt: 'Tell us about the business.',
    help: null,
    required: false,
    options: [],
    allow_other: false,
    max_select: null,
    long: false,
    ...overrides,
  };
}

const single = q({
  id: 'goal',
  qtype: 'single',
  options: [
    { value: 'leads', label: 'More leads' },
    { value: 'bookings', label: 'More bookings' },
  ],
  allow_other: true,
});

const multi = q({
  id: 'channels',
  section_key: 'leadgen',
  qtype: 'multi',
  options: [
    { value: 'google', label: 'Google' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'referral', label: 'Word of mouth' },
  ],
  allow_other: true,
  max_select: 2,
});

describe('questions-schema', () => {
  it('reserves __other: an option may never use it as a value', () => {
    const result = questionnaireManifestSchema.safeParse({
      sections: [{ key: 'a', title: 'A', blurb: null }],
      questions: [
        q({
          id: 'x',
          section_key: 'a',
          qtype: 'single',
          options: [
            { value: OTHER_VALUE, label: 'Other' },
            { value: 'y', label: 'Y' },
          ],
        }),
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects off-type flags, duplicate ids and unknown sections', () => {
    const base = { sections: [{ key: 'a', title: 'A', blurb: null }] };
    expect(
      questionnaireManifestSchema.safeParse({ ...base, questions: [q({ id: 'x', section_key: 'a', long: true, qtype: 'single', options: single.options })] }).success,
    ).toBe(false);
    expect(
      questionnaireManifestSchema.safeParse({ ...base, questions: [q({ id: 'x', section_key: 'a', allow_other: true })] }).success,
    ).toBe(false);
    expect(
      questionnaireManifestSchema.safeParse({ ...base, questions: [q({ id: 'x', section_key: 'a' }), q({ id: 'x', section_key: 'a' })] }).success,
    ).toBe(false);
    expect(
      questionnaireManifestSchema.safeParse({ ...base, questions: [q({ id: 'x', section_key: 'nope' })] }).success,
    ).toBe(false);
    expect(
      questionnaireManifestSchema.safeParse({ ...base, questions: [q({ id: 'x', section_key: 'a', long: true })] }).success,
    ).toBe(true);
  });
});

describe('validateOneAnswer', () => {
  it('unknown_question when the question is not in the manifest', () => {
    expect(validateOneAnswer(undefined, 'hi', null)).toEqual({ ok: false, error: 'unknown_question' });
  });

  it('accepts a blank answer — autosave never enforces required', () => {
    const required = q({ required: true });
    expect(validateOneAnswer(required, '', null)).toEqual({ ok: true, answer: '', other_text: null, blank: true });
    expect(validateOneAnswer({ ...single, required: true }, '', null)).toMatchObject({ ok: true, blank: true });
    expect(validateOneAnswer({ ...multi, required: true }, [], null)).toMatchObject({ ok: true, blank: true });
  });

  it('trims text and enforces the short/long cap from the question', () => {
    expect(validateOneAnswer(q({}), '  hello  ', null)).toMatchObject({ ok: true, answer: 'hello', blank: false });
    expect(validateOneAnswer(q({}), 'x'.repeat(TEXT_MAX_SHORT + 1), null)).toEqual({ ok: false, error: 'too_long' });
    expect(validateOneAnswer(q({ long: true }), 'x'.repeat(TEXT_MAX_SHORT + 1), null)).toMatchObject({ ok: true });
    expect(validateOneAnswer(q({ long: true }), 'x'.repeat(TEXT_MAX_LONG + 1), null)).toEqual({ ok: false, error: 'too_long' });
  });

  it('invalid_option for a value not in the manifest', () => {
    expect(validateOneAnswer(single, 'ads', null)).toEqual({ ok: false, error: 'invalid_option' });
    expect(validateOneAnswer(multi, ['google', 'tiktok'], null)).toEqual({ ok: false, error: 'invalid_option' });
    expect(validateOneAnswer(multi, ['google', 42], null)).toEqual({ ok: false, error: 'invalid_option' });
  });

  it('__other is invalid_option when allow_other is false', () => {
    expect(validateOneAnswer({ ...single, allow_other: false }, OTHER_VALUE, 'x')).toEqual({ ok: false, error: 'invalid_option' });
    expect(validateOneAnswer({ ...multi, allow_other: false }, [OTHER_VALUE], 'x')).toEqual({ ok: false, error: 'invalid_option' });
  });

  it('too_many over max_select, counting the other choice', () => {
    expect(validateOneAnswer(multi, ['google', 'instagram', 'referral'], null)).toEqual({ ok: false, error: 'too_many' });
    expect(validateOneAnswer(multi, ['google', 'instagram', OTHER_VALUE], 'fax')).toEqual({ ok: false, error: 'too_many' });
    expect(validateOneAnswer(multi, ['google', OTHER_VALUE], 'fax')).toMatchObject({ ok: true, answer: ['google', OTHER_VALUE], other_text: 'fax' });
  });

  it('dedupes multi values (order preserved) and drops blanks', () => {
    expect(validateOneAnswer(multi, ['google', 'google', '', ' instagram '], null)).toMatchObject({
      ok: true,
      answer: ['google', 'instagram'],
    });
  });

  it('other_required when __other is chosen without text; other_not_allowed otherwise', () => {
    expect(validateOneAnswer(single, OTHER_VALUE, '   ')).toEqual({ ok: false, error: 'other_required' });
    expect(validateOneAnswer(single, OTHER_VALUE, ' fax ')).toEqual({ ok: true, answer: OTHER_VALUE, other_text: 'fax', blank: false });
    expect(validateOneAnswer(single, 'leads', 'fax')).toEqual({ ok: false, error: 'other_not_allowed' });
    expect(validateOneAnswer(single, '', 'fax')).toEqual({ ok: false, error: 'other_not_allowed' });
    expect(validateOneAnswer(multi, [OTHER_VALUE], '')).toEqual({ ok: false, error: 'other_required' });
    expect(validateOneAnswer(multi, ['google'], 'fax')).toEqual({ ok: false, error: 'other_not_allowed' });
    expect(validateOneAnswer(q({}), 'text', 'fax')).toEqual({ ok: false, error: 'other_not_allowed' });
  });

  it('other_text has its own cap', () => {
    expect(validateOneAnswer(single, OTHER_VALUE, 'x'.repeat(501))).toEqual({ ok: false, error: 'too_long' });
  });
});

describe('isAnswerPresent', () => {
  it('mirrors engagement_answer_is_present', () => {
    expect(isAnswerPresent('', null)).toBe(false);
    expect(isAnswerPresent('  ', null)).toBe(false);
    expect(isAnswerPresent('x', null)).toBe(true);
    expect(isAnswerPresent([], null)).toBe(false);
    expect(isAnswerPresent(['a'], null)).toBe(true);
    expect(isAnswerPresent(OTHER_VALUE, null)).toBe(false);
    expect(isAnswerPresent(OTHER_VALUE, ' ')).toBe(false);
    expect(isAnswerPresent(OTHER_VALUE, 'fax')).toBe(true);
    expect(isAnswerPresent(null, null)).toBe(false);
  });
});

describe('findMissingRequired', () => {
  const manifest = {
    sections: [
      { key: 'orientation', title: 'Orientation', blurb: null },
      { key: 'leadgen', title: 'Lead gen', blurb: null },
    ],
    questions: [
      q({ id: 'about', required: true }),
      q({ id: 'optional', required: false }),
      { ...single, required: true },
      { ...multi, required: true },
    ],
  };

  it('groups missing required ids by section in manifest order and ignores non-required', () => {
    const missing = findMissingRequired(manifest, [
      { question_id: 'optional', answer: '', other_text: null },
      { question_id: 'goal', answer: OTHER_VALUE, other_text: null }, // other without text = not present
    ]);
    expect(missing).toEqual([
      { section_key: 'orientation', question_ids: ['about', 'goal'] },
      { section_key: 'leadgen', question_ids: ['channels'] },
    ]);
  });

  it('is empty when every required question has a present answer', () => {
    const missing = findMissingRequired(manifest, [
      { question_id: 'about', answer: 'A café', other_text: null },
      { question_id: 'goal', answer: 'leads', other_text: null },
      { question_id: 'channels', answer: ['google'], other_text: null },
    ]);
    expect(missing).toEqual([]);
  });
});

describe('renderSnapshot', () => {
  const snapshot: AnswerSnapshot = {
    questions_version: 3,
    locale: 'ja',
    title: 'ディスカバリー',
    sections: [
      { key: 'orientation', title: 'Orientation', blurb: 'About you' },
      { key: 'leadgen', title: 'Lead gen', blurb: null },
    ],
    questions: [q({ id: 'about' }), single, multi],
    answers: [
      { question_id: 'about', answer: '  A café  ', other_text: null },
      { question_id: 'goal', answer: OTHER_VALUE, other_text: 'Hire staff' },
      { question_id: 'channels', answer: ['instagram', 'google'], other_text: null },
    ],
  };

  it('resolves labels from the pinned manifest, in manifest order, with the localized Other', () => {
    const rendered = renderSnapshot(snapshot);
    expect(rendered.locale).toBe('ja');
    expect(rendered.sections.map((s) => s.key)).toEqual(['orientation', 'leadgen']);
    const [orientation, leadgen] = rendered.sections;
    expect(orientation.items.map((i) => i.question_id)).toEqual(['about', 'goal']);
    expect(orientation.items[0]).toMatchObject({ answered: true, text: 'A café', selected: [] });
    expect(orientation.items[1]).toMatchObject({
      answered: true,
      text: null,
      selected: [{ value: OTHER_VALUE, label: 'その他' }],
      other_text: 'Hire staff',
    });
    expect(leadgen.items[0].selected).toEqual([
      { value: 'instagram', label: 'Instagram' },
      { value: 'google', label: 'Google' },
    ]);
  });

  it('does not consult a live manifest: a relabelled option elsewhere changes nothing', () => {
    const pinned = renderSnapshot(snapshot);
    const live = renderSnapshot({
      ...snapshot,
      questions: [
        q({ id: 'about' }),
        single,
        { ...multi, options: multi.options.map((o) => ({ ...o, label: `${o.label} (renamed)` })) },
      ],
    });
    // Same snapshot -> same labels; a different pinned manifest -> different labels.
    expect(pinned.sections[1].items[0].selected[0].label).toBe('Instagram');
    expect(live.sections[1].items[0].selected[0].label).toBe('Instagram (renamed)');
  });

  it('marks unanswered questions and keeps orphaned-section questions visible', () => {
    const rendered = renderSnapshot({
      ...snapshot,
      sections: [snapshot.sections[0]],
      answers: [],
    });
    expect(rendered.sections[0].items.every((i) => !i.answered)).toBe(true);
    expect(rendered.sections[1]).toMatchObject({ key: '_unsectioned' });
    expect(rendered.sections[1].items.map((i) => i.question_id)).toEqual(['channels']);
  });
});
