// Seed content for a new proposal: the seven section titles per locale and
// the default `terms` / `next_steps` bodies. A code const like templates.ts —
// there is no terms editor UI (plan: "Explicitly not this unit"). These are
// PLAIN DEFAULTS RYAN EDITS, not legal advice. The AI never touches `terms`
// or `next_steps` (C3 merges only the five narrative keys).
//
// JA copy ships FLAGGED FOR NATIVE REVIEW (CLAUDE.md: no unreviewed machine
// translation in production) — see the ship report.

import { PROPOSAL_SECTION_KEYS, type EngagementLocale, type ProposalSectionKey } from './types';
import type { ProposalSection } from './proposal-schema';

export const SECTION_TITLES: Record<EngagementLocale, Record<ProposalSectionKey, string>> = {
  en: {
    exec_summary: 'Executive summary',
    takeaways: 'Key takeaways',
    recommendation: 'Recommendation',
    scope: 'Scope & phases',
    investment_notes: 'Investment',
    terms: 'Terms',
    next_steps: 'Next steps',
  },
  ja: {
    exec_summary: 'エグゼクティブサマリー',
    takeaways: '主なポイント',
    recommendation: 'ご提案',
    scope: '制作範囲とフェーズ',
    investment_notes: 'ご投資額',
    terms: '条件',
    next_steps: '次のステップ',
  },
};

const TERMS_MD: Record<EngagementLocale, string> = {
  en: [
    '- **Payment.** The build investment is due on acceptance, via a payment link Ryan sends. Work starts once it is received.',
    '- **Monthly care.** Billed monthly from launch and covers hosting, updates, monitoring and small changes. Cancel any time with 30 days\' notice.',
    '- **Validity.** This proposal is valid until the date shown on the cover. After that, please ask for a refreshed version.',
    '- **Out of scope.** Anything not listed under Scope & phases is a separate conversation — we will always tell you before it costs anything.',
    '- **Hand-over.** You own the site, the domain and the content. Source and access are handed over at launch.',
    '- **Cancellation.** Either side may end the work with written notice; you pay for the phases completed and keep everything delivered.',
  ].join('\n'),
  ja: [
    '- **お支払い。** 制作費はご承諾時に、Ryanがお送りするお支払いリンクよりお願いいたします。ご入金の確認後に制作を開始します。',
    '- **月額サポート。** 公開月から毎月ご請求し、ホスティング・更新・監視・軽微な修正を含みます。30日前のご連絡でいつでも解約いただけます。',
    '- **有効期限。** 本提案書は表紙に記載の日付まで有効です。期限を過ぎた場合は、更新版をお申し付けください。',
    '- **範囲外の作業。** 「制作範囲とフェーズ」に記載のない作業は別途ご相談となります。費用が発生する前に必ずお知らせします。',
    '- **引き渡し。** サイト・ドメイン・コンテンツはお客様の所有物です。公開時にソースとアクセス権をお渡しします。',
    '- **解約。** 双方とも書面によるご連絡で中止できます。完了したフェーズ分をお支払いいただき、納品物はすべてお手元に残ります。',
  ].join('\n'),
};

// Bullets, not "1." lines: the proposal markdown subset folds consecutive
// plain lines into one paragraph (proposal-markdown.ts), so a numbered list
// would print as a run-on sentence.
const NEXT_STEPS_MD: Record<EngagementLocale, string> = {
  en: [
    '- **Accept this proposal** — reply to Ryan, or use the Accept button if you received this as a link.',
    '- Ryan sends the payment link and a short kickoff checklist.',
    '- **Kickoff call** — we confirm the phases, the content we need from you, and the launch date.',
  ].join('\n'),
  ja: [
    '- **本提案書のご承諾** — Ryanへの返信、またはリンクでお受け取りの場合は「承諾する」ボタンからお願いします。',
    '- Ryanよりお支払いリンクと、キックオフ用の簡単なチェックリストをお送りします。',
    '- **キックオフ打ち合わせ** — フェーズ・ご用意いただく素材・公開日を確認します。',
  ].join('\n'),
};

/** The seven sections a new proposal starts with: titles per locale, terms + next steps seeded, the rest empty. */
export function seedSections(locale: EngagementLocale): ProposalSection[] {
  return PROPOSAL_SECTION_KEYS.map((key) => ({
    key,
    title: SECTION_TITLES[locale][key],
    body_md: key === 'terms' ? TERMS_MD[locale] : key === 'next_steps' ? NEXT_STEPS_MD[locale] : '',
  }));
}
