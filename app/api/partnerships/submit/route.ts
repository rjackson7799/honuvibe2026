import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import {
  sendPartnershipInquiryConfirmation,
  sendPartnershipInquiryAdminNotification,
} from '@/lib/email/send';
import {
  ORG_TYPE_VALUES,
  AUDIENCE_SIZE_VALUES,
  LANGUAGE_VALUES,
  TIMELINE_VALUES,
  REFERRAL_SOURCE_VALUES,
  labelizeOrgType,
  labelizeAudienceSize,
  labelizeLanguage,
  labelizeTimeline,
  labelizeReferralSource,
} from '@/lib/partnerships/labels';
import type { PartnershipInquiryEmailData } from '@/lib/email/types';

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .nullish()
    .transform((v) => (v ? v : null));

const schema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  organization: z.string().min(1).max(200),
  website: z
    .union([z.string().url(), z.literal('')])
    .nullish()
    .transform((v) => (v && v !== '' ? v : null)),
  org_type: z.enum(ORG_TYPE_VALUES),
  community_description: z.string().min(1).max(4000),
  program_description: z.string().min(1).max(4000),
  audience_size: optionalEnum(AUDIENCE_SIZE_VALUES),
  language: optionalEnum(LANGUAGE_VALUES),
  timeline: optionalEnum(TIMELINE_VALUES),
  referral_source: optionalEnum(REFERRAL_SOURCE_VALUES),
  source_locale: z.enum(['en', 'ja']).default('en'),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('partnership_inquiries').insert({
      full_name: d.full_name,
      email: d.email,
      organization: d.organization,
      website: d.website,
      org_type: d.org_type,
      community_description: d.community_description,
      program_description: d.program_description,
      audience_size: d.audience_size,
      language: d.language,
      timeline: d.timeline,
      referral_source: d.referral_source,
      source_locale: d.source_locale,
    });
    if (error) {
      console.error('[Partnerships] DB insert failed:', error.message);
    }
  }

  const emailData: PartnershipInquiryEmailData = {
    locale: d.source_locale,
    fullName: d.full_name,
    email: d.email,
    organization: d.organization,
    website: d.website,
    orgTypeLabel: labelizeOrgType(d.org_type, d.source_locale),
    communityDescription: d.community_description,
    programDescription: d.program_description,
    audienceSizeLabel: labelizeAudienceSize(d.audience_size, d.source_locale),
    languageLabel: labelizeLanguage(d.language, d.source_locale),
    timelineLabel: labelizeTimeline(d.timeline, d.source_locale),
    referralSourceLabel: labelizeReferralSource(
      d.referral_source,
      d.source_locale,
    ),
  };

  void Promise.all([
    sendPartnershipInquiryConfirmation(emailData),
    sendPartnershipInquiryAdminNotification(emailData),
  ]);

  return NextResponse.json({ success: true });
}
