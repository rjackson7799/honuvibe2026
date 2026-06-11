import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import {
  sendStudioLeadConfirmation,
  sendStudioLeadAdminNotification,
} from '@/lib/email/send';
import type { StudioLeadEmailData } from '@/lib/email/types';
import {
  STUDIO_INDUSTRY,
  STUDIO_PROJECT_TYPE,
  STUDIO_BUDGET,
  STUDIO_TIMELINE,
  labelizeIndustry,
  labelizeProjectType,
  labelizeBudget,
  labelizeTimeline,
} from '@/lib/studio/labels';

// Optional select fields arrive as '' when unselected → coerce to null.
const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal('')])
    .nullish()
    .transform((v) => (v && v !== '' ? (v as T[number]) : null));

const optText = z
  .string()
  .max(300)
  .nullish()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : null));

const schema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  company: z.string().min(1).max(200),
  industry: optEnum(STUDIO_INDUSTRY),
  project_type: optEnum(STUDIO_PROJECT_TYPE),
  budget_range: optEnum(STUDIO_BUDGET),
  timeline: optEnum(STUDIO_TIMELINE),
  message: z.string().min(1).max(5000),
  referral_source: optText,
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
    // Writes to the normalized `leads` table (migration 047) — the discovery
    // engine's source of truth — as a lightweight, session-less lead. The admin
    // reads `leads`, so these still appear in /admin/studio/leads.
    const { error } = await supabase.from('leads').insert({
      name: d.full_name,
      email: d.email,
      business_name: d.company,
      industry: d.industry,
      tier_interest: d.project_type,
      budget_range: d.budget_range,
      timeline: d.timeline,
      message: d.message,
      referral_source: d.referral_source,
      source_locale: d.source_locale,
      source: 'studio_form',
      lifecycle: 'new',
      sales_stage: 'new',
    });
    if (error) {
      console.error('[Studio Leads] DB insert failed:', error.message);
    }
  }

  const emailData: StudioLeadEmailData = {
    locale: d.source_locale,
    fullName: d.full_name,
    email: d.email,
    company: d.company,
    industryLabel: labelizeIndustry(d.industry),
    projectTypeLabel: labelizeProjectType(d.project_type),
    budgetLabel: labelizeBudget(d.budget_range),
    timelineLabel: labelizeTimeline(d.timeline),
    referralSource: d.referral_source,
    message: d.message,
  };

  void Promise.all([
    sendStudioLeadConfirmation(emailData),
    sendStudioLeadAdminNotification(emailData),
  ]);

  return NextResponse.json({ success: true });
}
