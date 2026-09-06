// The proposal DOCUMENT: one snapshot, one render model, three thin renderers
// (components/proposal/ProposalBlocks.tsx + the page, generate-proposal-pdf.ts,
// the admin editor preview). Pure.
//
// buildIssuedSnapshot(proposal, engagement, now) produces the issued_snapshot
// the issue RPC stores: content AND the identity fields the cover shows
// (business, contact, issue date, year) AND the locale copy — so a later
// contact edit, clock tick or copy change cannot alter an issued document.
// valid_until is deliberately NOT in the snapshot (decision #12): it is the
// one client-visible field allowed to change, forward only, and the
// renderers print the live column beside "Issued on".
//
// buildProposalDocModel(snapshot, {validUntil, preview}) is a NARROW
// projection: no confidence_note, source_snapshot, brief or lead fields can
// reach it, so a future column cannot leak. The investment table is rendered
// by code from `pricing` — the narrative never carries the numbers.
//
// The skill's client-doc conventions live here once: both names on the
// cover (wordmark + the client's business as a typographic lockup), the
// section order, the provisional footnote, the confidentiality footer.
// JA copy ships FLAGGED FOR NATIVE REVIEW.

import { z } from 'zod';
import { ADMIN_TIME_ZONE, formatMinorUnits } from './format';
import { parseProposalMarkdown, type Block } from './proposal-markdown';
import { pricedOfferSchema, performanceTermsSchema, proposalSectionsSchema, type PerformanceTerms, type ProposalSection } from './proposal-schema';
import { BASE_LABELS, RUSH_LABEL, type PricedOffer } from './proposal-pricing';
import type { DataBasis, EngagementCurrency, EngagementLocale, EngagementTier, PricingMode, ProposalSectionKey } from './types';

export const RENDERER_VERSION = 'proposal-doc-v1';
export const SNAPSHOT_VERSION = 1;
export const WORDMARK = 'HonuVibe Studio';

/** The private bucket (074) and the archived PDF's object path. */
export const ENGAGEMENT_DOCUMENTS_BUCKET = 'engagement-documents';
export function proposalPdfPath(engagementId: string, proposalId: string, version: number): string {
  return `proposals/${engagementId}/${proposalId}-v${version}.pdf`;
}

// ── Copy ──────────────────────────────────────────────────────────────────

export interface DocCopy {
  footnote_provisional: string;
  /** Rendered at snapshot time (year + business are frozen too). */
  footer: string;
  cover_labels: {
    proposal_v: string; // "{version}"
    issued: string; // "{date}"
    prepared_for: string; // "{contact}" · "{business}"
    valid_until: string; // "{date}"
    preview_band: string;
  };
  investment_labels: {
    item: string;
    build: string;
    monthly: string;
    total_build: string;
    total_monthly: string;
    usd_reference: string; // "{build}" / "{monthly}"
  };
  performance_labels: {
    rate: string;
    applies_to: string;
    qualifying_new: string;
    reporting: string;
    payment_timing: string;
    tracking: string;
  };
}

const COPY: Record<EngagementLocale, Omit<DocCopy, 'footer'> & { footer_template: string }> = {
  en: {
    footnote_provisional: '† Figures shared verbally are provisional and to be confirmed against your records.',
    footer_template: '© {year} HonuVibe.AI · Confidential — prepared for {business}',
    cover_labels: {
      proposal_v: 'Proposal v{version}',
      issued: 'Issued {date}',
      prepared_for: 'Prepared for {contact} · {business}',
      valid_until: 'Valid until {date}',
      preview_band: 'PREVIEW — not issued',
    },
    investment_labels: {
      item: 'Item',
      build: 'Build',
      monthly: 'Monthly care',
      total_build: 'Total build',
      total_monthly: 'Monthly care',
      usd_reference: 'USD reference: {build} build · {monthly} monthly',
    },
    performance_labels: {
      rate: 'Performance rate',
      applies_to: 'Applies to',
      qualifying_new: 'Qualifying new customer',
      reporting: 'Reporting',
      payment_timing: 'Payment timing',
      tracking: 'Tracking',
    },
  },
  ja: {
    footnote_provisional: '† 口頭でご共有いただいた数値は暫定値であり、貴社の記録との照合をお願いいたします。',
    footer_template: '© {year} HonuVibe.AI · 機密情報 — {business} 様向けに作成',
    cover_labels: {
      proposal_v: '提案書 v{version}',
      issued: '発行日 {date}',
      prepared_for: '{contact} 様 · {business}',
      valid_until: '有効期限 {date}',
      preview_band: 'プレビュー — 未発行',
    },
    investment_labels: {
      item: '項目',
      build: '制作費',
      monthly: '月額サポート',
      total_build: '制作費 合計',
      total_monthly: '月額サポート',
      usd_reference: '参考（米ドル換算）: 制作費 {build} · 月額 {monthly}',
    },
    performance_labels: {
      rate: '成果報酬率',
      applies_to: '対象',
      qualifying_new: '新規顧客の定義',
      reporting: 'レポート',
      payment_timing: 'お支払い時期',
      tracking: 'トラッキング',
    },
  },
};

/** JA labels for the fixed line ids (USD lines are calculator-owned, EN-labelled). Unknown ids keep the stored label. */
const LINE_LABELS_JA: Record<string, { label: string; value: string }> = {
  copywriting_full: { label: 'コピーライティング（全文）', value: '文章はすべてこちらで作成します' },
  copywriting_partial: { label: 'コピーライティング（一部）', value: 'お持ちの文章を整えて仕上げます' },
  imagery_ai: { label: 'AI生成画像', value: 'カメラマン不要のプロ品質AI画像' },
  imagery_mix: { label: '画像ミックス', value: 'お持ちの写真＋必要な箇所をAIで補完' },
  multilingual: { label: '多言語対応', value: 'お客様の言語で届く — AI翻訳・完全ローカライズ' },
  gbp_setup: { label: 'Googleビジネスプロフィール設定', value: 'Googleマップ・地域検索で見つけてもらう' },
  gbp_manage: { label: 'Googleビジネスプロフィール運用', value: '投稿・クチコミ・営業時間を常に最新に' },
  booking: { label: '予約システム連携', value: 'お客様が24時間いつでもオンライン予約' },
  payments: { label: '請求・サブスクリプション', value: 'ストアなしで請求書送付と定期決済' },
  ai_chat: { label: 'AIチャットアシスタント', value: '24時間質問に答え、見込み客を逃さない' },
};
const BASE_LABELS_JA: Record<EngagementTier, string> = {
  starter: 'スターター制作',
  pro: 'プロ制作',
  ai_native: 'AIネイティブ制作',
};
const RUSH_LABEL_JA = 'お急ぎ対応（ASAP）';

// ── Snapshot ──────────────────────────────────────────────────────────────

/** The proposal columns the snapshot freezes (a projection of the row). */
export interface ProposalSnapshotSource {
  version: number;
  locale: EngagementLocale;
  title: string;
  currency: EngagementCurrency;
  tier: EngagementTier;
  pricing_mode: PricingMode;
  pricing: PricedOffer;
  performance_terms: PerformanceTerms | null;
  total_build: number;
  total_monthly: number;
  data_basis: DataBasis;
  sections: ProposalSection[];
}

/** The engagement columns the cover shows. */
export interface SnapshotEngagementSource {
  title: string;
  client_contact_name: string | null;
}

export interface IssuedSnapshot {
  snapshot_version: number;
  renderer_version: string;
  version: number;
  locale: EngagementLocale;
  title: string;
  currency: EngagementCurrency;
  tier: EngagementTier;
  pricing_mode: PricingMode;
  pricing: PricedOffer;
  performance_terms: PerformanceTerms | null;
  total_build: number;
  total_monthly: number;
  data_basis: DataBasis;
  sections: ProposalSection[];
  cover: { business_name: string; contact_name: string | null; issued_on: string; year: number };
  copy: DocCopy;
}

const copySchema = z.object({
  footnote_provisional: z.string(),
  footer: z.string(),
  cover_labels: z.object({ proposal_v: z.string(), issued: z.string(), prepared_for: z.string(), valid_until: z.string(), preview_band: z.string() }),
  investment_labels: z.object({ item: z.string(), build: z.string(), monthly: z.string(), total_build: z.string(), total_monthly: z.string(), usd_reference: z.string() }),
  performance_labels: z.object({ rate: z.string(), applies_to: z.string(), qualifying_new: z.string(), reporting: z.string(), payment_timing: z.string(), tracking: z.string() }),
});

/** Validates a stored issued_snapshot before rendering (a stored blob is data, not trust). */
export const issuedSnapshotSchema: z.ZodType<IssuedSnapshot> = z.object({
  snapshot_version: z.literal(SNAPSHOT_VERSION),
  renderer_version: z.string(),
  version: z.number().int().min(1),
  locale: z.enum(['en', 'ja']),
  title: z.string().min(1).max(200),
  currency: z.enum(['USD', 'JPY']),
  tier: z.enum(['starter', 'pro', 'ai_native']),
  pricing_mode: z.enum(['fixed', 'performance', 'hybrid']),
  pricing: pricedOfferSchema,
  performance_terms: performanceTermsSchema.nullable(),
  total_build: z.number().int().min(0),
  total_monthly: z.number().int().min(0),
  data_basis: z.enum(['client_records', 'provisional']),
  sections: proposalSectionsSchema,
  cover: z.object({ business_name: z.string(), contact_name: z.string().nullable(), issued_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), year: z.number().int() }),
  copy: copySchema,
}) as unknown as z.ZodType<IssuedSnapshot>;

/** YYYY-MM-DD of `now` in the operator's zone (HST) — the document's issue date. */
export function hstDateOf(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ADMIN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

export function buildIssuedSnapshot(proposal: ProposalSnapshotSource, engagement: SnapshotEngagementSource, now: Date): IssuedSnapshot {
  const issued_on = hstDateOf(now);
  const year = Number(issued_on.slice(0, 4));
  const business_name = engagement.title;
  const c = COPY[proposal.locale];
  return {
    snapshot_version: SNAPSHOT_VERSION,
    renderer_version: RENDERER_VERSION,
    version: proposal.version,
    locale: proposal.locale,
    title: proposal.title,
    currency: proposal.currency,
    tier: proposal.tier,
    pricing_mode: proposal.pricing_mode,
    pricing: proposal.pricing,
    performance_terms: proposal.performance_terms,
    total_build: proposal.total_build,
    total_monthly: proposal.total_monthly,
    data_basis: proposal.data_basis,
    sections: proposal.sections.map((s) => ({ key: s.key, title: s.title, body_md: s.body_md })),
    cover: { business_name, contact_name: engagement.client_contact_name, issued_on, year },
    copy: {
      footnote_provisional: c.footnote_provisional,
      footer: fill(c.footer_template, { year, business: business_name }),
      cover_labels: c.cover_labels,
      investment_labels: c.investment_labels,
      performance_labels: c.performance_labels,
    },
  };
}

// ── Render model ──────────────────────────────────────────────────────────

export interface InvestmentRow {
  kind: 'base' | 'rush' | 'line' | 'adjustment';
  label: string;
  /** Benefit framing (lines only). */
  value: string;
  build: string;
  /** '' when nothing monthly applies. */
  monthly: string;
}

export interface DocSection {
  key: ProposalSectionKey;
  title: string;
  /** '†' after the heading when provisional (takeaways only). */
  mark: '†' | null;
  blocks: Block[];
}

export interface ProposalDocModel {
  locale: EngagementLocale;
  wordmark: string;
  watermark: boolean;
  cover: {
    business_name: string;
    contact_name: string | null;
    title: string;
    version: number;
    issued_on: string;
    valid_until: string | null;
    /** Rendered lines the renderers print verbatim. */
    proposal_line: string;
    issued_line: string;
    prepared_for_line: string;
    valid_until_line: string | null;
    preview_band: string;
  };
  labels: DocCopy['investment_labels'];
  sections: DocSection[];
  investment: {
    rows: InvestmentRow[];
    total_build: string;
    total_monthly: string;
    usd_reference: string | null;
    performance: { label: string; value: string }[] | null;
  };
  footnote: string | null;
  footer: string;
}

function longDate(iso: string, locale: EngagementLocale): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function moneyOrBlank(amount: number, currency: EngagementCurrency): string {
  return amount === 0 ? '' : formatMinorUnits(amount, currency);
}

function buildRows(snapshot: IssuedSnapshot): InvestmentRow[] {
  const { pricing, currency, locale, tier } = snapshot;
  const ja = locale === 'ja';
  const rows: InvestmentRow[] = [];
  // JA substitutes ONLY the calculator's own EN labels; a label Ryan typed
  // (ai_native base / rush) is his and stays as typed.
  rows.push({
    kind: 'base',
    label: ja && pricing.base.label === BASE_LABELS[tier] ? BASE_LABELS_JA[tier] : pricing.base.label,
    value: '',
    build: formatMinorUnits(pricing.base.build, currency),
    monthly: formatMinorUnits(pricing.base.monthly, currency),
  });
  if (pricing.rush) {
    rows.push({ kind: 'rush', label: ja && pricing.rush.label === RUSH_LABEL ? RUSH_LABEL_JA : pricing.rush.label, value: '', build: formatMinorUnits(pricing.rush.build, currency), monthly: '' });
  }
  for (const line of pricing.lines) {
    const jaLabel = ja && tier !== 'ai_native' ? LINE_LABELS_JA[line.id] : undefined;
    rows.push({
      kind: 'line',
      label: jaLabel?.label ?? line.label,
      value: jaLabel?.value ?? line.value,
      build: formatMinorUnits(line.build, currency),
      monthly: moneyOrBlank(line.monthly, currency),
    });
  }
  if (pricing.adjustment) {
    rows.push({
      kind: 'adjustment',
      label: pricing.adjustment.label,
      value: '',
      build: moneyOrBlank(pricing.adjustment.build, currency),
      monthly: moneyOrBlank(pricing.adjustment.monthly, currency),
    });
  }
  return rows;
}

function performanceRows(snapshot: IssuedSnapshot): { label: string; value: string }[] | null {
  const t = snapshot.performance_terms;
  if (snapshot.pricing_mode === 'fixed' || !t) return null;
  const l = snapshot.copy.performance_labels;
  const rows = [
    { label: l.rate, value: `${t.rate_percent}%` },
    { label: l.applies_to, value: t.applies_to },
    { label: l.qualifying_new, value: t.qualifying_new },
    { label: l.reporting, value: t.reporting },
    { label: l.payment_timing, value: t.payment_timing },
  ];
  if (t.tracking_note) rows.push({ label: l.tracking, value: t.tracking_note });
  return rows;
}

/**
 * The render model. `preview` marks a draft|ready row's on-the-fly snapshot
 * (the watermark band); an issued document passes false / nothing.
 */
export function buildProposalDocModel(snapshot: IssuedSnapshot, opts: { validUntil: string | null; preview?: boolean }): ProposalDocModel {
  const { locale, copy, cover } = snapshot;
  const provisional = snapshot.data_basis === 'provisional';
  const issued_on = longDate(cover.issued_on, locale);
  const valid_until = opts.validUntil ? longDate(opts.validUntil, locale) : null;
  const contact = cover.contact_name ?? '';
  const usd = snapshot.pricing.usd_reference;

  return {
    locale,
    wordmark: WORDMARK,
    watermark: opts.preview === true,
    cover: {
      business_name: cover.business_name,
      contact_name: cover.contact_name,
      title: snapshot.title,
      version: snapshot.version,
      issued_on,
      valid_until,
      proposal_line: fill(copy.cover_labels.proposal_v, { version: snapshot.version }),
      issued_line: fill(copy.cover_labels.issued, { date: issued_on }),
      prepared_for_line: contact
        ? fill(copy.cover_labels.prepared_for, { contact, business: cover.business_name })
        : cover.business_name,
      valid_until_line: valid_until ? fill(copy.cover_labels.valid_until, { date: valid_until }) : null,
      preview_band: copy.cover_labels.preview_band,
    },
    labels: copy.investment_labels,
    sections: snapshot.sections.map((s) => ({
      key: s.key,
      title: s.title,
      mark: provisional && s.key === 'takeaways' ? '†' : null,
      blocks: parseProposalMarkdown(s.body_md),
    })),
    investment: {
      rows: buildRows(snapshot),
      total_build: formatMinorUnits(snapshot.total_build, snapshot.currency),
      total_monthly: formatMinorUnits(snapshot.total_monthly, snapshot.currency),
      usd_reference:
        snapshot.currency === 'JPY' && usd
          ? fill(copy.investment_labels.usd_reference, { build: formatMinorUnits(usd.total_build, 'USD'), monthly: formatMinorUnits(usd.total_monthly, 'USD') })
          : null,
      performance: performanceRows(snapshot),
    },
    footnote: provisional ? copy.footnote_provisional : null,
    footer: copy.footer,
  };
}

/** ASCII filename slug for the PDF download (the tutoring document route's mould). */
export function proposalFileName(businessName: string, version: number): string {
  const cleaned = businessName.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `HonuVibe-Studio-Proposal-${cleaned || 'client'}-v${version}.pdf`;
}
