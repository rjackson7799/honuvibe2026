import { describe, expect, it } from 'vitest';
import { buildJpyOffer, buildUsdOffer } from './proposal-pricing';
import {
  RENDERER_VERSION,
  buildIssuedSnapshot,
  buildProposalDocModel,
  issuedSnapshotSchema,
  type ProposalSnapshotSource,
  type SnapshotEngagementSource,
} from './proposal-document';
import { seedSections } from './proposal-terms';

const NOW = new Date('2026-09-05T20:30:00Z'); // Sep 5, 10:30 HST

const OFFER = buildUsdOffer({ tier: 'starter', addons: { booking: true, aiChat: true }, timeline: 'asap' }, { label: 'Founding-client discount', build: -15000, monthly: 0 });

function proposal(overrides: Partial<ProposalSnapshotSource> = {}): ProposalSnapshotSource {
  return {
    version: 2,
    locale: 'en',
    title: 'Website + online booking',
    currency: 'USD',
    tier: 'starter',
    pricing_mode: 'fixed',
    pricing: OFFER,
    performance_terms: null,
    total_build: OFFER.total_build,
    total_monthly: OFFER.total_monthly,
    data_basis: 'provisional',
    sections: seedSections('en').map((s) =>
      s.key === 'exec_summary' ? { ...s, body_md: 'Kailua Massage sees **60%** of bookings by phone.' } : s,
    ),
    confidence_note: 'INTERNAL — should never render',
    source_snapshot: { secret: 'internal' },
    ...overrides,
  } as ProposalSnapshotSource;
}

const ENGAGEMENT: SnapshotEngagementSource = { title: 'Kailua Beach Massage', client_contact_name: 'Leilani K.' };

describe('buildIssuedSnapshot', () => {
  it('freezes content, identity fields, issue date/year and the locale copy; valid_until is absent', () => {
    const snap = buildIssuedSnapshot(proposal(), ENGAGEMENT, NOW);
    expect(snap.snapshot_version).toBe(1);
    expect(snap.renderer_version).toBe(RENDERER_VERSION);
    expect(snap.cover).toEqual({ business_name: 'Kailua Beach Massage', contact_name: 'Leilani K.', issued_on: '2026-09-05', year: 2026 });
    expect(snap.version).toBe(2);
    expect(snap.locale).toBe('en');
    expect(snap.pricing).toEqual(OFFER);
    expect(snap.sections).toHaveLength(7);
    expect(snap.copy.footnote_provisional).toMatch(/provisional/);
    expect(snap.copy.footer).toContain('Confidential');
    expect(snap).not.toHaveProperty('valid_until');
    expect(snap).not.toHaveProperty('confidence_note');
    expect(snap).not.toHaveProperty('source_snapshot');
    expect(issuedSnapshotSchema.safeParse(snap).success).toBe(true);
    expect(issuedSnapshotSchema.safeParse(JSON.parse(JSON.stringify(snap))).success).toBe(true);
  });

  it('a later change to the engagement contact does not change a model built from the snapshot', () => {
    const snap = buildIssuedSnapshot(proposal(), ENGAGEMENT, NOW);
    const before = buildProposalDocModel(snap, { validUntil: '2026-10-05' });
    const live = { ...ENGAGEMENT, client_contact_name: 'Someone Else', title: 'Renamed Biz' };
    void live;
    const after = buildProposalDocModel(snap, { validUntil: '2026-10-05' });
    expect(after.cover.contact_name).toBe('Leilani K.');
    expect(after.cover.business_name).toBe('Kailua Beach Massage');
    expect(after).toEqual(before);
  });

  it('the issue date and year come from the injected clock in HST (a UTC date past midnight is still the HST day)', () => {
    const snap = buildIssuedSnapshot(proposal(), ENGAGEMENT, new Date('2026-01-01T05:00:00Z')); // Dec 31, 19:00 HST
    expect(snap.cover.issued_on).toBe('2025-12-31');
    expect(snap.cover.year).toBe(2025);
  });
});

describe('buildProposalDocModel', () => {
  it('section order is fixed; the investment table has base + rush + lines (with value) + adjustment + totals; provisional adds the footnote and the † mark', () => {
    const snap = buildIssuedSnapshot(proposal(), ENGAGEMENT, NOW);
    const model = buildProposalDocModel(snap, { validUntil: '2026-10-05' });
    expect(model.sections.map((s) => s.key)).toEqual(['exec_summary', 'takeaways', 'recommendation', 'scope', 'investment_notes', 'terms', 'next_steps']);
    expect(model.sections[0].blocks[0]).toMatchObject({ type: 'paragraph' });
    expect(model.sections.find((s) => s.key === 'takeaways')!.mark).toBe('†');
    expect(model.sections.find((s) => s.key === 'scope')!.mark).toBeNull();
    expect(model.footnote).toMatch(/^† .*provisional.*confirmed against your records/);
    const rows = model.investment.rows;
    expect(rows.map((r) => r.kind)).toEqual(['base', 'rush', 'line', 'line', 'adjustment']);
    expect(rows[0]).toMatchObject({ label: 'Starter build', build: '$500.00', monthly: '$25.00' });
    expect(rows[1]).toMatchObject({ label: 'Rush delivery (ASAP)', build: '$125.00', monthly: '' });
    expect(rows[2]).toMatchObject({ label: 'Booking integration', value: 'Let customers book online, 24/7', build: '$250.00', monthly: '$15.00' });
    expect(rows[4]).toMatchObject({ label: 'Founding-client discount', build: '-$150.00', monthly: '' });
    expect(model.investment.total_build).toBe('$875.00');
    expect(model.investment.total_monthly).toBe('$65.00');
    expect(model.investment.usd_reference).toBeNull();
    expect(model.investment.performance).toBeNull();
    expect(model.cover).toMatchObject({ business_name: 'Kailua Beach Massage', contact_name: 'Leilani K.', title: 'Website + online booking', version: 2, issued_on: 'September 5, 2026', valid_until: 'October 5, 2026' });
    expect(model.footer).toBe('© 2026 HonuVibe.AI · Confidential — prepared for Kailua Beach Massage');
    expect(model.watermark).toBe(false);
  });

  it('client_records: no footnote, no mark; monthly totals include the lines', () => {
    const snap = buildIssuedSnapshot(proposal({ data_basis: 'client_records' }), ENGAGEMENT, NOW);
    const model = buildProposalDocModel(snap, { validUntil: null });
    expect(model.footnote).toBeNull();
    expect(model.sections.find((s) => s.key === 'takeaways')!.mark).toBeNull();
    expect(model.cover.valid_until).toBeNull();
  });

  it('the model is a narrow projection: no confidence_note / source_snapshot / brief / lead fields anywhere', () => {
    const snap = buildIssuedSnapshot(proposal(), ENGAGEMENT, NOW);
    const json = JSON.stringify(buildProposalDocModel(snap, { validUntil: '2026-10-05' }));
    expect(json).not.toContain('INTERNAL');
    expect(json).not.toContain('confidence_note');
    expect(json).not.toContain('source_snapshot');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('brief');
  });

  it('the preview flag carries the watermark for draft|ready only', () => {
    const snap = buildIssuedSnapshot(proposal(), ENGAGEMENT, NOW);
    expect(buildProposalDocModel(snap, { validUntil: null, preview: true }).watermark).toBe(true);
    expect(buildProposalDocModel(snap, { validUntil: null, preview: false }).watermark).toBe(false);
  });

  it('JPY: yen with no decimals, usd_reference line, JA labels for the fixed line ids, JA copy', () => {
    const yen = buildJpyOffer(
      { tier: 'starter', addons: { booking: true, aiChat: true }, timeline: 'asap' },
      { base: { build: 75000, monthly: 3800 }, rush: 18000, lines: { booking: { build: 37000, monthly: 2200 }, ai_chat: { build: 22000, monthly: 3800 } }, adjustment: { label: '創業割引', build: -20000, monthly: 0 } },
    );
    const snap = buildIssuedSnapshot(
      proposal({ locale: 'ja', currency: 'JPY', pricing: yen, total_build: yen.total_build, total_monthly: yen.total_monthly, sections: seedSections('ja') }),
      { title: 'カイルア整体院', client_contact_name: '山田 太郎' },
      NOW,
    );
    const model = buildProposalDocModel(snap, { validUntil: '2026-10-05' });
    expect(model.locale).toBe('ja');
    expect(model.investment.rows[0]).toMatchObject({ label: 'スターター制作', build: '¥75,000', monthly: '¥3,800' });
    expect(model.investment.rows[2]).toMatchObject({ label: '予約システム連携', build: '¥37,000' });
    expect(model.investment.rows[2].value).toMatch(/24時間/);
    expect(model.investment.rows[4]).toMatchObject({ label: '創業割引', build: '-¥20,000' });
    expect(model.investment.total_build).toBe('¥132,000');
    expect(model.investment.total_monthly).toBe('¥9,800');
    expect(model.investment.usd_reference).toMatch(/\$1,025\.00/);
    expect(model.investment.usd_reference).toMatch(/\$65\.00/);
    expect(JSON.stringify(model)).not.toMatch(/¥[\d,]+\.\d/);
    expect(model.cover.issued_on).toBe('2026年9月5日');
    expect(model.cover.valid_until).toBe('2026年10月5日');
    expect(model.footnote).toMatch(/†/);
    expect(model.footer).toContain('カイルア整体院');
    expect(model.labels.total_build).toBe('制作費 合計');
  });

  it('performance terms render as a labelled table above the terms body', () => {
    const snap = buildIssuedSnapshot(
      proposal({
        pricing_mode: 'hybrid',
        performance_terms: { rate_percent: 10, applies_to: 'Net online bookings', qualifying_new: 'First visit', reporting: 'Monthly', payment_timing: 'Net 15', tracking_note: null },
      }),
      ENGAGEMENT,
      NOW,
    );
    const model = buildProposalDocModel(snap, { validUntil: null });
    expect(model.investment.performance).toEqual([
      { label: 'Performance rate', value: '10%' },
      { label: 'Applies to', value: 'Net online bookings' },
      { label: 'Qualifying new customer', value: 'First visit' },
      { label: 'Reporting', value: 'Monthly' },
      { label: 'Payment timing', value: 'Net 15' },
    ]);
  });
});
