import { describe, expect, it } from 'vitest';
import { OTHER_VALUE, type EngagementQuestion, type QuestionnaireSection } from './questions-schema';
import { MAX_DROP_RATIO, mergeTailoredQuestionnaire, type TailorOutput, type TailoredQuestionInput } from './merge';

const sections: QuestionnaireSection[] = [
  { key: 'orientation', title: 'About', blurb: null },
  { key: 'economics', title: 'Economics', blurb: 'Money first' },
];

function tq(id: string, section_key: string, overrides: Partial<EngagementQuestion> = {}): EngagementQuestion {
  return {
    id,
    section_key,
    qtype: 'text',
    prompt: `Template ${id}`,
    help: null,
    required: false,
    options: [],
    allow_other: false,
    max_select: null,
    long: false,
    ...overrides,
  };
}

const base = {
  sections,
  questions: [
    tq('about', 'orientation', { required: true, long: true }),
    tq('years', 'orientation', {
      qtype: 'single',
      options: [
        { value: 'under_1', label: '<1y' },
        { value: 'over_1', label: '1y+' },
      ],
    }),
    tq('best_seller', 'economics', { required: true }),
    tq('seasonality', 'economics'),
    tq('growth', 'economics', { required: true }),
  ],
};

function mq(overrides: Partial<TailoredQuestionInput> = {}): TailoredQuestionInput {
  return {
    template_question_id: '',
    section_key: 'economics',
    qtype: 'text',
    prompt: 'New prompt',
    help: '',
    required: false,
    options: [],
    allow_other: false,
    max_select: 0,
    long: false,
    ...overrides,
  };
}

function out(overrides: Partial<TailorOutput> = {}): TailorOutput {
  return { section_blurbs: [], questions: [], dropped_template_question_ids: [], ...overrides };
}

describe('mergeTailoredQuestionnaire', () => {
  it('keeps every unmentioned template question, in template order, and always lands at draft', () => {
    const r = mergeTailoredQuestionnaire(base, out());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.questions.map((q) => q.id)).toEqual(['about', 'years', 'best_seller', 'seasonality', 'growth']);
    expect(r.kept_unmentioned).toEqual(['about', 'years', 'best_seller', 'seasonality', 'growth']);
    expect(r.dropped).toEqual([]);
    expect(r.added).toEqual([]);
    expect(r.status).toBe('draft');
    expect(r.sections).toEqual(sections);
  });

  it('assigns ids and positions in code: edits reference template ids, new questions get generated ids, model ids are never trusted', () => {
    const r = mergeTailoredQuestionnaire(
      base,
      out({
        questions: [
          mq({ template_question_id: 'best_seller', prompt: 'Which massage package earns most per client?', required: true }),
          mq({ section_key: 'economics', prompt: 'How many rebookings per month?' }),
          mq({ section_key: 'orientation', prompt: 'How many locations?' }),
          // A bogus reference is ignored, not turned into a question.
          mq({ template_question_id: 'not_a_template_id', prompt: 'ignored' }),
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Model's questions first within each section (model order), then the unmentioned template ones.
    expect(r.questions.map((q) => q.id)).toEqual([
      'orientation_new_1',
      'about',
      'years',
      'best_seller',
      'economics_new_1',
      'seasonality',
      'growth',
    ]);
    expect(r.questions.find((q) => q.id === 'best_seller')!.prompt).toBe('Which massage package earns most per client?');
    expect(r.added).toEqual(['economics_new_1', 'orientation_new_1']);
    expect(r.kept_unmentioned).toEqual(['about', 'years', 'seasonality', 'growth']);
    expect(r.questions.some((q) => q.prompt === 'ignored')).toBe(false);
  });

  it('honors explicit drops (unknown ids ignored) but rejects > 40% dropped as a misunderstanding', () => {
    const ok = mergeTailoredQuestionnaire(base, out({ dropped_template_question_ids: ['seasonality', 'nope'] }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.dropped).toEqual(['seasonality']);
      expect(ok.questions.map((q) => q.id)).not.toContain('seasonality');
    }
    // 3 of 5 = 60% > 40%
    const bad = mergeTailoredQuestionnaire(base, out({ dropped_template_question_ids: ['about', 'years', 'seasonality'] }));
    expect(bad).toMatchObject({ ok: false, error: 'too_many_dropped' });
    // Exactly 40% (2 of 5) is allowed.
    expect(MAX_DROP_RATIO).toBe(0.4);
    expect(mergeTailoredQuestionnaire(base, out({ dropped_template_question_ids: ['about', 'years'] })).ok).toBe(true);
    // A drop also wins over an edit of the same id.
    const both = mergeTailoredQuestionnaire(
      base,
      out({ dropped_template_question_ids: ['seasonality'], questions: [mq({ template_question_id: 'seasonality', prompt: 'still here?' })] }),
    );
    expect(both.ok && both.questions.some((q) => q.id === 'seasonality')).toBe(false);
  });

  it('repairs coherence: long/allow_other forced false off-type, max_select clamped, duplicate values deduped, <2 options downgrades to text', () => {
    const r = mergeTailoredQuestionnaire(
      base,
      out({
        questions: [
          // text with choice-only flags
          mq({ prompt: 'T', qtype: 'text', allow_other: true, options: [{ value: 'a', label: 'A' }], max_select: 3, long: true }),
          // multi with duplicates + a reserved value + max_select over the ceiling
          mq({
            prompt: 'M',
            qtype: 'multi',
            options: [
              { value: 'google', label: 'Google' },
              { value: 'Google', label: 'Google again' },
              { value: OTHER_VALUE, label: 'Other' },
              { value: 'ig', label: 'Instagram' },
              { value: '', label: 'blank' },
            ],
            allow_other: true,
            max_select: 12,
            long: true,
          }),
          // single with one option → text
          mq({ prompt: 'S', qtype: 'single', options: [{ value: 'only', label: 'Only' }], allow_other: true, long: true }),
          // multi with 0 → no cap
          mq({ prompt: 'M0', qtype: 'multi', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], max_select: 0 }),
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [t, m, s, m0] = r.questions.filter((q) => q.section_key === 'economics').slice(0, 4);
    expect(t).toMatchObject({ qtype: 'text', allow_other: false, options: [], max_select: null, long: true });
    expect(m).toMatchObject({ qtype: 'multi', allow_other: true, max_select: 3, long: false });
    expect(m.options.map((o) => o.value)).toEqual(['google', 'ig']);
    expect(s).toMatchObject({ qtype: 'text', allow_other: false, options: [], long: false });
    expect(m0).toMatchObject({ qtype: 'multi', max_select: null });
  });

  it('applies section blurbs without touching keys/titles, and reports malformed output the schema rejects', () => {
    const r = mergeTailoredQuestionnaire(base, out({ section_blurbs: [{ key: 'orientation', blurb: 'Tailored blurb' }, { key: 'ghost', blurb: 'x' }] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sections[0]).toEqual({ key: 'orientation', title: 'About', blurb: 'Tailored blurb' });
      expect(r.sections[1]).toEqual(sections[1]);
    }
    const bad = mergeTailoredQuestionnaire(base, out({ questions: [mq({ prompt: '   ' })] }));
    expect(bad).toMatchObject({ ok: false, error: 'malformed_output' });
  });

  it('ignores questions aimed at an unknown section and never exceeds the manifest cap', () => {
    const r = mergeTailoredQuestionnaire(base, out({ questions: [mq({ section_key: 'nowhere', prompt: 'lost' })] }));
    expect(r.ok && r.questions.length).toBe(5);
    const many = Array.from({ length: 50 }, (_, i) => mq({ prompt: `Q${i}` }));
    const capped = mergeTailoredQuestionnaire(base, out({ questions: many }));
    expect(capped.ok && capped.questions.length).toBe(40);
  });
});

// Review follow-up: the 40-question cap must shed the model's ADDITIONS, never a
// template question ("an omitted template question is kept, never silently lost").
import { MAX_QUESTIONS } from './questions-schema';

describe('the question cap', () => {
  it('sheds model additions (newest first) before any template question and reports only the survivors as added', () => {
    const big = {
      sections,
      questions: Array.from({ length: 38 }, (_, i) => tq(`t${i}`, i % 2 === 0 ? 'orientation' : 'economics')),
    };
    const result = mergeTailoredQuestionnaire(
      big,
      out({ questions: Array.from({ length: 5 }, (_, i) => mq({ section_key: 'orientation', prompt: `Added ${i}` })) }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questions).toHaveLength(MAX_QUESTIONS);
    const ids = new Set(result.questions.map((x) => x.id));
    for (let i = 0; i < 38; i += 1) expect(ids.has(`t${i}`), `template t${i} kept`).toBe(true);
    expect(result.kept_unmentioned).toHaveLength(38);
    expect(result.added).toHaveLength(2);
    for (const id of result.added) expect(ids.has(id)).toBe(true);
  });
});
