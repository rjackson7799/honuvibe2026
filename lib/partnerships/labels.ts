import type { Locale } from '@/lib/email/types';

export const ORG_TYPE_VALUES = [
  'professional_network',
  'creative_community',
  'nonprofit',
  'company',
  'accelerator',
  'other',
] as const;
export type OrgType = (typeof ORG_TYPE_VALUES)[number];

export const AUDIENCE_SIZE_VALUES = [
  'under_10',
  '10_25',
  '25_50',
  '50_100',
  '100_plus',
] as const;
export type AudienceSize = (typeof AUDIENCE_SIZE_VALUES)[number];

export const LANGUAGE_VALUES = ['en', 'ja', 'bilingual'] as const;
export type LanguagePreference = (typeof LANGUAGE_VALUES)[number];

export const TIMELINE_VALUES = [
  'ready_now',
  '1_3_months',
  '3_6_months',
  'exploring',
] as const;
export type PartnershipTimeline = (typeof TIMELINE_VALUES)[number];

export const REFERRAL_SOURCE_VALUES = [
  'web_search',
  'social_media',
  'referral',
  'vertice',
  'smashhaus',
  'conference',
  'other',
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCE_VALUES)[number];

const orgTypeLabels: Record<Locale, Record<OrgType, string>> = {
  en: {
    professional_network: 'Professional Network',
    creative_community: 'Creative Community',
    nonprofit: 'Nonprofit',
    company: 'Company',
    accelerator: 'Accelerator',
    other: 'Other',
  },
  ja: {
    professional_network: 'プロフェッショナルネットワーク',
    creative_community: 'クリエイティブコミュニティ',
    nonprofit: '非営利団体',
    company: '企業',
    accelerator: 'アクセラレーター',
    other: 'その他',
  },
};

const audienceSizeLabels: Record<Locale, Record<AudienceSize, string>> = {
  en: {
    under_10: 'Under 10',
    '10_25': '10–25',
    '25_50': '25–50',
    '50_100': '50–100',
    '100_plus': '100+',
  },
  ja: {
    under_10: '10名未満',
    '10_25': '10〜25名',
    '25_50': '25〜50名',
    '50_100': '50〜100名',
    '100_plus': '100名以上',
  },
};

const languageLabels: Record<Locale, Record<LanguagePreference, string>> = {
  en: {
    en: 'English',
    ja: 'Japanese',
    bilingual: 'Bilingual EN+JP',
  },
  ja: {
    en: '英語',
    ja: '日本語',
    bilingual: 'バイリンガル(英語+日本語)',
  },
};

const timelineLabels: Record<Locale, Record<PartnershipTimeline, string>> = {
  en: {
    ready_now: 'Ready now',
    '1_3_months': '1–3 months',
    '3_6_months': '3–6 months',
    exploring: 'Just exploring',
  },
  ja: {
    ready_now: 'すぐに開始',
    '1_3_months': '1〜3ヶ月',
    '3_6_months': '3〜6ヶ月',
    exploring: '検討中',
  },
};

const referralSourceLabels: Record<Locale, Record<ReferralSource, string>> = {
  en: {
    web_search: 'Web search',
    social_media: 'Social media',
    referral: 'Referral',
    vertice: 'Vertice Society',
    smashhaus: 'SmashHaus',
    conference: 'Conference',
    other: 'Other',
  },
  ja: {
    web_search: 'ウェブ検索',
    social_media: 'ソーシャルメディア',
    referral: '紹介',
    vertice: 'Vertice Society',
    smashhaus: 'SmashHaus',
    conference: 'カンファレンス',
    other: 'その他',
  },
};

export function labelizeOrgType(value: OrgType, locale: Locale): string {
  return orgTypeLabels[locale][value];
}

export function labelizeAudienceSize(
  value: AudienceSize | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  return audienceSizeLabels[locale][value];
}

export function labelizeLanguage(
  value: LanguagePreference | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  return languageLabels[locale][value];
}

export function labelizeTimeline(
  value: PartnershipTimeline | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  return timelineLabels[locale][value];
}

export function labelizeReferralSource(
  value: ReferralSource | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  return referralSourceLabels[locale][value];
}
