/**
 * Organizations / team-training inquiry — lean B2B lead capture.
 *
 * Writes into the existing `partnership_inquiries` table (no new table) via the
 * service-role client, tagged in `notes` as an Organizations-page lead so the
 * admin inbox can distinguish it. Mirrors the safe anon-capture posture of
 * app/api/partnerships/submit + app/api/auth/send-login-link:
 *   - service-role insert (RLS belt-and-suspenders), zod validation
 *   - per-IP rate limit + honeypot (no third-party captcha)
 *   - email normalization
 *   - NEVER creates an auth user or sends a magic link from raw form input
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { tryConsume } from '@/lib/community/rate-limit';
import {
  trackServerEvent,
  serverEventContextFromRequest,
} from '@/lib/analytics-server';
import {
  AUDIENCE_SIZE_VALUES,
  labelizeOrgType,
  labelizeAudienceSize,
} from '@/lib/partnerships/labels';
import {
  sendPartnershipInquiryConfirmation,
  sendPartnershipInquiryAdminNotification,
} from '@/lib/email/send';
import type { PartnershipInquiryEmailData } from '@/lib/email/types';

const schema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  organization: z.string().min(1).max(200),
  team_size: z.enum(AUDIENCE_SIZE_VALUES).nullish().transform((v) => v ?? null),
  about: z.string().min(1).max(4000),
  goal: z.string().min(1).max(4000),
  source_locale: z.enum(['en', 'ja']).default('en'),
  // Honeypot — must stay empty. Bots fill every field.
  company_url: z.string().optional(),
});

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (!tryConsume(`org-inquiry:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in an hour.' },
      { status: 429 },
    );
  }

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

  // Honeypot tripped → pretend success, store nothing.
  if (d.company_url && d.company_url.trim() !== '') {
    return NextResponse.json({ success: true });
  }

  const email = d.email.trim().toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('partnership_inquiries').insert({
      full_name: d.full_name,
      email,
      organization: d.organization,
      org_type: 'company',
      community_description: d.about,
      program_description: d.goal,
      audience_size: d.team_size,
      source_locale: d.source_locale,
      notes: 'Source: Organizations page (team training)',
    });
    if (error) {
      console.error('[Organizations] DB insert failed:', error.message);
    }
  }

  // Funnel: B2B lead captured (server-side).
  await trackServerEvent('org_inquiry_submitted', {
    ...serverEventContextFromRequest(req),
    props: { source: 'team_training', locale: d.source_locale },
  });

  const emailData: PartnershipInquiryEmailData = {
    locale: d.source_locale,
    fullName: d.full_name,
    email,
    organization: d.organization,
    website: null,
    orgTypeLabel: labelizeOrgType('company', d.source_locale),
    communityDescription: d.about,
    programDescription: d.goal,
    audienceSizeLabel: labelizeAudienceSize(d.team_size, d.source_locale),
    languageLabel: null,
    timelineLabel: null,
    referralSourceLabel: null,
  };

  void Promise.all([
    sendPartnershipInquiryConfirmation(emailData),
    sendPartnershipInquiryAdminNotification(emailData),
  ]);

  return NextResponse.json({ success: true });
}
