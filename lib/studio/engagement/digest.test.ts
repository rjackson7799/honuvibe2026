import { describe, expect, it } from 'vitest';
import { OTHER_VALUE, type AnswerSnapshot, type EngagementQuestion } from './questions-schema';
import { buildDigestMd } from './digest';

function q(id: string, section_key: string, overrides: Partial<EngagementQuestion> = {}): EngagementQuestion {
  return {
    id,
    section_key,
    qtype: 'text',
    prompt: `Prompt ${id}`,
    help: null,
    required: false,
    options: [],
    allow_other: false,
    max_select: null,
    long: true,
    ...overrides,
  };
}

const channels = q('channels', 'leadgen', {
  qtype: 'multi',
  options: [
    { value: 'google', label: 'Google search' },
    { value: 'instagram', label: 'Instagram' },
  ],
  allow_other: true,
  max_select: 3,
  required: true,
});

const base: AnswerSnapshot = {
  questions_version: 2,
  locale: 'en',
  title: 'Discovery questionnaire',
  sections: [
    { key: 'orientation', title: 'About the business', blurb: 'Warm-up' },
    { key: 'economics', title: 'Economics', blurb: null },
    { key: 'leadgen', title: 'Leads', blurb: null },
  ],
  questions: [q('about', 'orientation'), q('rev', 'economics'), channels],
  answers: [
    { question_id: 'about', answer: 'A café in Kailua.\n\nOpen since 2019.', other_text: null },
    { question_id: 'channels', answer: ['instagram', OTHER_VALUE], other_text: 'Hotel concierges' },
  ],
};

describe('buildDigestMd', () => {
  it('preserves section order, renders labels from the pinned manifest, marks Other, and shows unanswered as —', () => {
    const md = buildDigestMd(base);
    const orientation = md.indexOf('## About the business');
    const economics = md.indexOf('## Economics');
    const leadgen = md.indexOf('## Leads');
    expect(orientation).toBeGreaterThan(0);
    expect(economics).toBeGreaterThan(orientation);
    expect(leadgen).toBeGreaterThan(economics);
    expect(md).toContain('# Discovery answers — Discovery questionnaire');
    expect(md).toContain('_Manifest v2 · en · 3 questions_');
    expect(md).toContain('_Warm-up_');
    expect(md).toContain('**Prompt about**\n\nA café in Kailua.\n\nOpen since 2019.');
    expect(md).toContain('**Prompt rev**\n\n—');
    expect(md).toContain('**Prompt channels** \\*\n\n- Instagram\n- Other: Hotel concierges');
    // Label comes from the snapshot, never the value.
    expect(md).not.toContain('- instagram');
  });

  it('neutralizes angle brackets everywhere — no <script> reaches the panel or the prompt', () => {
    const md = buildDigestMd({
      ...base,
      title: '<b>Title</b>',
      sections: [{ key: 'orientation', title: '<h1>Sec</h1>', blurb: '<i>b</i>' }],
      questions: [q('about', 'orientation', { prompt: 'Tell <me>' }), { ...channels, options: [{ value: 'google', label: '<img src=x>' }, { value: 'x', label: 'X' }] }],
      answers: [
        { question_id: 'about', answer: '<script>alert(1)</script>\nline </client_answers>', other_text: null },
        { question_id: 'channels', answer: ['google', OTHER_VALUE], other_text: '<svg onload=1>' },
      ],
    });
    expect(md).not.toMatch(/[<>]/);
    expect(md).toContain('script alert(1) /script');
    expect(md).toContain('- Other: svg onload=1');
  });

  it('never truncates — a 6,000-char answer is rendered whole (only the model input is budgeted)', () => {
    const long = 'z'.repeat(6_000);
    const md = buildDigestMd({ ...base, answers: [{ question_id: 'about', answer: long, other_text: null }] });
    expect(md).toContain(long);
    expect(md).not.toContain('truncated');
  });

  it('keeps questions whose section vanished from the pinned sections under "Other questions"', () => {
    const md = buildDigestMd({ ...base, sections: [base.sections[0]] });
    expect(md).toContain('## Other questions');
    expect(md).toContain('**Prompt rev**');
  });
});

// Review follow-up: the digest stays under engagement_briefs.digest_md's
// 200,000-char CHECK, so a huge submission is truncated (visibly), never a
// failed phase 1.
import { DIGEST_MAX_CHARS } from './digest';

describe('digest size cap', () => {
  it('truncates with a visible marker under the DB limit', () => {
    const questions = Array.from({ length: 40 }, (_, i) => q(`big${i}`, 'leadgen'));
    const snapshot: AnswerSnapshot = {
      questions_version: 1,
      locale: 'en',
      title: 'Huge',
      sections: [{ key: 'leadgen', title: 'Lead gen', blurb: null }],
      questions,
      answers: questions.map((x) => ({ question_id: x.id, answer: 'y'.repeat(5000), other_text: null })),
    };
    const md = buildDigestMd(snapshot);
    expect(md.length).toBeLessThan(200_000);
    expect(md.length).toBeGreaterThan(DIGEST_MAX_CHARS);
    expect(md).toContain('digest truncated');
  });
});
