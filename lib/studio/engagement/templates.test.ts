import { describe, expect, it } from 'vitest';
import { questionnaireManifestSchema } from './questions-schema';
import {
  QUESTIONNAIRE_TEMPLATES,
  RESERVED_OPTION_VALUE,
  SMALL_BUSINESS_DISCOVERY,
  TEMPLATE_SECTION_KEYS,
  isTemplateKey,
  resolveTemplate,
  type QuestionnaireTemplate,
} from './templates';

// Data invariants in the style of lib/workbench/types.test.ts: every template
// is iterated, so a second template added later is checked without a new test.
const templates: QuestionnaireTemplate[] = Object.values(QUESTIONNAIRE_TEMPLATES);

describe('questionnaire templates — data invariants', () => {
  it('ships exactly one template this unit, keyed by its own key', () => {
    expect(Object.keys(QUESTIONNAIRE_TEMPLATES)).toEqual(['small_business_discovery']);
    expect(SMALL_BUSINESS_DISCOVERY.key).toBe('small_business_discovery');
    expect(isTemplateKey('small_business_discovery')).toBe(true);
    expect(isTemplateKey('nope')).toBe(false);
    expect(isTemplateKey('__proto__')).toBe(false);
  });

  it('the seven discovery buckets are in the locked order with economics second', () => {
    expect(TEMPLATE_SECTION_KEYS).toEqual([
      'orientation',
      'economics',
      'leadgen',
      'audience',
      'tech_ops',
      'content_brand',
      'goals_capacity',
    ]);
    for (const t of templates) {
      expect(t.sections.map((s) => s.key)).toEqual([...TEMPLATE_SECTION_KEYS]);
    }
  });

  it.each(templates)('$key: section keys and question ids are unique; every question points at a section', (t) => {
    const sectionKeys = t.sections.map((s) => s.key);
    expect(new Set(sectionKeys).size).toBe(sectionKeys.length);
    const ids = t.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of t.questions) expect(sectionKeys).toContain(q.section_key);
    // Every section has at least one question — an empty section is a dead rail entry.
    for (const key of sectionKeys) expect(t.questions.some((q) => q.section_key === key)).toBe(true);
  });

  it.each(templates)('$key: choice questions have >= 2 unique-valued options; text questions have none', (t) => {
    for (const q of t.questions) {
      if (q.qtype === 'text') {
        expect(q.options, q.id).toEqual([]);
        continue;
      }
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      const values = q.options.map((o) => o.value);
      expect(new Set(values).size, q.id).toBe(values.length);
    }
  });

  it.each(templates)('$key: allow_other only on choice questions; long only on text; max_select only on multi and within bounds', (t) => {
    for (const q of t.questions) {
      if (q.allow_other) expect(q.qtype, q.id).not.toBe('text');
      if (q.long) expect(q.qtype, q.id).toBe('text');
      if (q.max_select !== null) {
        expect(q.qtype, q.id).toBe('multi');
        expect(q.max_select, q.id).toBeGreaterThanOrEqual(1);
        expect(q.max_select, q.id).toBeLessThanOrEqual(q.options.length + (q.allow_other ? 1 : 0));
      }
    }
  });

  it.each(templates)('$key: every _en and _ja string is non-empty (titles, blurbs, prompts, help, labels)', (t) => {
    expect(t.title_en.trim()).not.toBe('');
    expect(t.title_ja.trim()).not.toBe('');
    expect(t.intro_en.trim()).not.toBe('');
    expect(t.intro_ja.trim()).not.toBe('');
    for (const s of t.sections) {
      expect(s.title_en.trim(), s.key).not.toBe('');
      expect(s.title_ja.trim(), s.key).not.toBe('');
      // A blurb is optional, but never half-translated.
      expect(s.blurb_en === null, s.key).toBe(s.blurb_ja === null);
      if (s.blurb_en !== null) expect(s.blurb_en.trim()).not.toBe('');
      if (s.blurb_ja !== null) expect(s.blurb_ja.trim()).not.toBe('');
    }
    for (const q of t.questions) {
      expect(q.prompt_en.trim(), q.id).not.toBe('');
      expect(q.prompt_ja.trim(), q.id).not.toBe('');
      expect(q.help_en === null, q.id).toBe(q.help_ja === null);
      if (q.help_en !== null) expect(q.help_en.trim(), q.id).not.toBe('');
      if (q.help_ja !== null) expect(q.help_ja.trim(), q.id).not.toBe('');
      for (const o of q.options) {
        expect(o.label_en.trim(), `${q.id}/${o.value}`).not.toBe('');
        expect(o.label_ja.trim(), `${q.id}/${o.value}`).not.toBe('');
      }
    }
  });

  it.each(templates)('$key: the JA strings actually contain Japanese (never a copy of the EN)', (t) => {
    const cjk = /[぀-ヿ一-鿿]/;
    expect(t.title_ja).toMatch(cjk);
    for (const s of t.sections) expect(s.title_ja, s.key).toMatch(cjk);
    for (const q of t.questions) expect(q.prompt_ja, q.id).toMatch(cjk);
  });

  it.each(templates)('$key: no option value is the reserved __other sentinel', (t) => {
    for (const q of t.questions) {
      for (const o of q.options) expect(o.value, q.id).not.toBe(RESERVED_OPTION_VALUE);
    }
  });

  it.each(templates)('$key: every required question is one a client can reasonably answer (text or single/multi with options)', (t) => {
    const required = t.questions.filter((q) => q.required);
    expect(required.length).toBeGreaterThan(0);
    // The economics section leads on substance: at least one required question there.
    expect(required.some((q) => q.section_key === 'economics')).toBe(true);
  });
});

describe('resolveTemplate', () => {
  it.each(templates)('$key resolves to a manifest that passes questionnaireManifestSchema in BOTH locales', (t) => {
    for (const locale of ['en', 'ja'] as const) {
      const resolved = resolveTemplate(t, locale);
      expect(questionnaireManifestSchema.safeParse({ sections: resolved.sections, questions: resolved.questions }).success).toBe(true);
      expect(resolved.sections.length).toBe(t.sections.length);
      expect(resolved.questions.length).toBe(t.questions.length);
      expect(resolved.title.trim()).not.toBe('');
      expect(resolved.intro_md.trim()).not.toBe('');
    }
  });

  it('picks the locale strings and keeps values language-neutral', () => {
    const en = resolveTemplate(SMALL_BUSINESS_DISCOVERY, 'en');
    const ja = resolveTemplate(SMALL_BUSINESS_DISCOVERY, 'ja');
    expect(en.title).toBe(SMALL_BUSINESS_DISCOVERY.title_en);
    expect(ja.title).toBe(SMALL_BUSINESS_DISCOVERY.title_ja);
    const enQ = en.questions.find((q) => q.id === 'lead_channels')!;
    const jaQ = ja.questions.find((q) => q.id === 'lead_channels')!;
    expect(enQ.options.map((o) => o.value)).toEqual(jaQ.options.map((o) => o.value));
    expect(enQ.options[0].label).not.toBe(jaQ.options[0].label);
    expect(jaQ.prompt).toMatch(/[぀-ヿ一-鿿]/);
  });

  it('preserves template order (economics stays second) and flags in the instance', () => {
    const resolved = resolveTemplate(SMALL_BUSINESS_DISCOVERY, 'en');
    expect(resolved.sections[1].key).toBe('economics');
    const channels = resolved.questions.find((q) => q.id === 'lead_channels')!;
    expect(channels).toMatchObject({ qtype: 'multi', allow_other: true, max_select: 3, required: true });
    const summary = resolved.questions.find((q) => q.id === 'business_summary')!;
    expect(summary).toMatchObject({ qtype: 'text', long: true, required: true });
  });
});
