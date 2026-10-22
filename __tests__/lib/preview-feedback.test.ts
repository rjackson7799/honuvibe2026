import { describe, expect, it } from 'vitest';
import {
  escapeMarkdown,
  filterFeedback,
  groupFeedbackByPage,
  parseFeedbackInput,
  shortFeedbackId,
  toMarkdownChecklist,
  type PreviewFeedbackItem,
} from '@/lib/previews/feedback';

function item(over: Partial<PreviewFeedbackItem>): PreviewFeedbackItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000000',
    createdAt: '2026-10-01T10:00:00.000Z',
    page: 'index.html',
    reviewerName: 'Ann',
    kind: 'bug',
    message: 'Broken',
    viewportW: null,
    viewportH: null,
    userAgent: null,
    status: 'new',
    ...over,
  };
}

describe('parseFeedbackInput', () => {
  it('round-trips valid input, trimmed', () => {
    const r = parseFeedbackInput({
      name: '  Ann  ',
      kind: 'bug',
      message: '  Button is off  ',
      page: '  /about.html ',
      viewportW: 1280,
      viewportH: 720,
      extra: 'ignored',
    });
    expect(r).toEqual({
      ok: true,
      value: { name: 'Ann', kind: 'bug', message: 'Button is off', page: '/about.html', viewportW: 1280, viewportH: 720 },
    });
  });

  it('rejects empty or whitespace name', () => {
    const base = { kind: 'bug', message: 'x', page: 'p' };
    expect(parseFeedbackInput({ ...base, name: '' }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base, name: '   \n' }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base }).ok).toBe(false);
  });

  it('rejects over-length name and message instead of truncating', () => {
    const base = { name: 'Ann', kind: 'bug', message: 'x', page: 'p' };
    expect(parseFeedbackInput({ ...base, name: 'n'.repeat(81) }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base, name: 'n'.repeat(80) }).ok).toBe(true);
    const long = parseFeedbackInput({ ...base, message: 'm'.repeat(4001) });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(typeof long.error).toBe('string');
    expect(parseFeedbackInput({ ...base, message: 'm'.repeat(4000) }).ok).toBe(true);
  });

  it('rejects an empty message', () => {
    expect(parseFeedbackInput({ name: 'Ann', kind: 'bug', message: '  ', page: 'p' }).ok).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(parseFeedbackInput({ name: 'Ann', kind: 'praise', message: 'x', page: 'p' }).ok).toBe(false);
  });

  it('rejects a page with control characters or bad length', () => {
    const base = { name: 'Ann', kind: 'improvement', message: 'x' };
    expect(parseFeedbackInput({ ...base, page: 'a\nb' }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base, page: 'a\u007fb' }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base, page: '   ' }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base, page: 'p'.repeat(301) }).ok).toBe(false);
    expect(parseFeedbackInput({ ...base, page: 'p'.repeat(300) }).ok).toBe(true);
  });

  it('turns a bad viewport into null without rejecting the note', () => {
    const base = { name: 'Ann', kind: 'bug', message: 'x', page: 'p' };
    const r = parseFeedbackInput({ ...base, viewportW: 'wide', viewportH: 12.5 });
    expect(r).toEqual({ ok: true, value: { ...base, viewportW: null, viewportH: null } });
    const r2 = parseFeedbackInput({ ...base, viewportW: -1, viewportH: 20001 });
    expect(r2.ok && r2.value.viewportW === null && r2.value.viewportH === null).toBe(true);
    const r3 = parseFeedbackInput({ ...base, viewportW: 0, viewportH: 20000 });
    expect(r3.ok && r3.value.viewportW === 0 && r3.value.viewportH === 20000).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(parseFeedbackInput(null).ok).toBe(false);
    expect(parseFeedbackInput('x').ok).toBe(false);
    expect(parseFeedbackInput([]).ok).toBe(false);
  });
});

describe('filterFeedback', () => {
  const items = [
    item({ id: '1', status: 'new', kind: 'bug' }),
    item({ id: '2', status: 'planned', kind: 'improvement' }),
    item({ id: '3', status: 'done', kind: 'bug' }),
    item({ id: '4', status: 'wont_do', kind: 'improvement' }),
  ];

  it("'open' returns new + planned only", () => {
    expect(filterFeedback(items, { kind: 'all', status: 'open' }).map((i) => i.id)).toEqual(['1', '2']);
  });

  it('filters by kind and exact status', () => {
    expect(filterFeedback(items, { kind: 'bug', status: 'all' }).map((i) => i.id)).toEqual(['1', '3']);
    expect(filterFeedback(items, { kind: 'all', status: 'done' }).map((i) => i.id)).toEqual(['3']);
    expect(filterFeedback(items, { kind: 'all', status: 'all' })).toHaveLength(4);
  });
});

describe('groupFeedbackByPage', () => {
  it('orders groups by newest item (newest first) and items oldest first', () => {
    const a1 = item({ id: 'a1', page: 'a.html', createdAt: '2026-10-01T00:00:00Z' });
    const a2 = item({ id: 'a2', page: 'a.html', createdAt: '2026-10-05T00:00:00Z' });
    const b1 = item({ id: 'b1', page: 'b.html', createdAt: '2026-10-03T00:00:00Z' });
    const c1 = item({ id: 'c1', page: 'c.html', createdAt: '2026-10-02T00:00:00Z' });
    const groups = groupFeedbackByPage([b1, a2, c1, a1]);
    expect(groups.map((g) => g.page)).toEqual(['a.html', 'b.html', 'c.html']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['a1', 'a2']);
  });

  it('returns [] for no items', () => {
    expect(groupFeedbackByPage([])).toEqual([]);
  });
});

describe('shortFeedbackId', () => {
  it('returns the first 8 chars of the uuid', () => {
    expect(shortFeedbackId('a1b2c3d4-e5f6-4000-8000-000000000000')).toBe('a1b2c3d4');
  });
});

describe('escapeMarkdown', () => {
  it('backslash-escapes the markdown-significant characters', () => {
    expect(escapeMarkdown('\\ ` * _ [ ] < > # |')).toBe('\\\\ \\` \\* \\_ \\[ \\] \\< \\> \\# \\|');
    expect(escapeMarkdown('plain text')).toBe('plain text');
  });
});

describe('toMarkdownChecklist', () => {
  const items = [
    item({
      id: 'a1b2c3d4-0000-4000-8000-000000000000',
      page: 'index.html',
      kind: 'bug',
      message: 'Logo is cut off',
      reviewerName: 'Ann',
      createdAt: '2026-10-01T23:30:00.000Z',
      status: 'new',
    }),
    item({
      id: 'b2c3d4e5-0000-4000-8000-000000000000',
      page: 'index.html',
      kind: 'improvement',
      message: 'Make the hero bigger',
      reviewerName: 'Bob',
      createdAt: '2026-10-02T08:00:00.000Z',
      status: 'done',
    }),
    item({
      id: 'c3d4e5f6-0000-4000-8000-000000000000',
      page: 'about.html',
      kind: 'improvement',
      message: 'First line\nSecond line',
      reviewerName: 'Cy',
      createdAt: '2026-10-03T12:00:00.000Z',
      status: 'planned',
    }),
  ];

  it('renders the exact checklist', () => {
    expect(toMarkdownChecklist('Okada Preview', items)).toBe(
      [
        '# Okada Preview — feedback',
        '',
        '## about.html',
        '- [ ] **Improvement** — First line',
        '  Second line — _Cy, 2026-10-03_ · `c3d4e5f6` (Planned)',
        '',
        '## index.html',
        '- [ ] **Bug fix** — Logo is cut off — _Ann, 2026-10-01_ · `a1b2c3d4`',
        '- [x] **Improvement** — Make the hero bigger — _Bob, 2026-10-02_ · `b2c3d4e5` (Done)',
        '',
      ].join('\n'),
    );
  });

  it('escapes reviewer text', () => {
    const md = toMarkdownChecklist('T', [
      item({ reviewerName: '*Ann*', message: '[link](x) <b>#1</b>', page: 'a_b.html' }),
    ]);
    expect(md).toContain('## a\\_b.html');
    expect(md).toContain('\\[link\\](x) \\<b\\>\\#1\\</b\\>');
    expect(md).toContain('_\\*Ann\\*, 2026-10-01_');
  });
});
