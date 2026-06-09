import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import {
  sendStudioLeadConfirmation,
  sendStudioLeadAdminNotification,
} from '@/lib/email/send';
import type { StudioLeadEmailData } from '@/lib/email/types';

const INDUSTRY = ['creator', 'healthcare', 'service', 'professional', 'other'] as const;
const PROJECT_TYPE = ['starter', 'pro', 'ai_native', 'not_sure'] as const;
const BUDGET = ['under_1k', '1k_3k', '3k_7k', '7k_15k', '15k_plus'] as const;
const TIMELINE = ['asap', '1_month', '1_3_months', 'flexible'] as const;

const INDUSTRY_LABEL: Record<(typeof INDUSTRY)[number], string> = {
  creator: 'Creator',
  healthcare: 'Healthcare',
  service: 'Service Business',
  professional: 'Professional',
  other: 'Other',
};
const PROJECT_TYPE_LABEL: Record<(typeof PROJECT_TYPE)[number], string> = {
  starter: 'Studio Starter',
  pro: 'Studio Pro',
  ai_native: 'Studio AI-Native',
  not_sure: 'Not sure yet',
};
const BUDGET_LABEL: Record<(typeof BUDGET)[number], string> = {
  under_1k: 'Under $1k',
  '1k_3k': '$1k – $3k',
  '3k_7k': '$3k – $7k',
  '7k_15k': '$7k – $15k',
  '15k_plus': '$15k+',
};
const TIMELINE_LABEL: Record<(typeof TIMELINE)[number], string> = {
  asap: 'As soon as possible',
  '1_month': 'Within a month',
  '1_3_months': '1–3 months',
  flexible: 'Flexible',
};

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
  industry: optEnum(INDUSTRY),
  project_type: optEnum(PROJECT_TYPE),
  budget_range: optEnum(BUDGET),
  timeline: optEnum(TIMELINE),
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
    const { error } = await supabase.from('studio_leads').insert({
      full_name: d.full_name,
      email: d.email,
      company: d.company,
      industry: d.industry,
      project_type: d.project_type,
      budget_range: d.budget_range,
      timeline: d.timeline,
      message: d.message,
      referral_source: d.referral_source,
      source_locale: d.source_locale,
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
    industryLabel: d.industry ? INDUSTRY_LABEL[d.industry] : null,
    projectTypeLabel: d.project_type ? PROJECT_TYPE_LABEL[d.project_type] : null,
    budgetLabel: d.budget_range ? BUDGET_LABEL[d.budget_range] : null,
    timelineLabel: d.timeline ? TIMELINE_LABEL[d.timeline] : null,
    referralSource: d.referral_source,
    message: d.message,
  };

  void Promise.all([
    sendStudioLeadConfirmation(emailData),
    sendStudioLeadAdminNotification(emailData),
  ]);

  return NextResponse.json({ success: true });
}
