'use server';

// Studio lead workspace — admin CRUD for the `leads` table (Phase 1).
// Mirrors lib/workbench/actions.ts: inline requireAdmin() that throws, Zod parse
// with a human-readable error, service-role client for the write (RLS keeps
// `leads` admin-only, so the service role is the controlled write path), and
// revalidatePath for the list + detail routes.
//
// NAMING CONTRACT: the UI and StudioLead* types speak the aliased vocabulary
// everywhere (full_name / company / status / project_type). The leads-table
// column names (name / business_name / sales_stage / tier_interest) appear ONLY
// inside toLeadColumns() below — the single place the UI→DB translation lives.
// A wrong column name fails silently at runtime, so keep it here and nowhere else.

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { z as zod } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { findEngagementForLead } from '@/lib/studio/engagement/queries';
import { salesStageFor } from '@/lib/studio/engagement/stages';
import type { StudioLeadStatus } from '@/lib/admin/types';

const STATUS_IS_ENGAGEMENT_DERIVED =
  "This lead's sales stage is managed by its engagement — change the stage from the engagement workspace.";

// ── Auth + parse helpers (copied from lib/workbench/actions.ts) ──────────────

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
}

function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    );
    throw new Error(`Invalid lead input — ${messages.join(' ')}`);
  }
  return result.data;
}

function revalidateLeadPaths(id?: string): void {
  revalidatePath('/admin/studio/leads');
  if (id) revalidatePath(`/admin/studio/leads/${id}`);
}

// ── Input normalization (trim; '' → null for optional fields) ────────────────

/** Optional free text: trims, coerces '' / null / undefined → null. */
const optText = (max: number) =>
  zod
    .string()
    .max(max)
    .nullish()
    .transform((v) => {
      const t = v?.trim() ?? '';
      return t === '' ? null : t;
    });

/** Required, trimmed text. */
const requiredText = (label: string, max: number) =>
  zod
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: `${label} is required` })
    .refine((v) => v.length <= max, { message: `${label} is too long` });

/** Optional email: '' → null, format-validated ONLY when a value is present. */
const optEmail = zod
  .string()
  .max(320)
  .nullish()
  .transform((v) => {
    const t = v?.trim() ?? '';
    return t === '' ? null : t;
  })
  .refine((v) => v === null || zod.string().email().safeParse(v).success, {
    message: 'Enter a valid email address',
  });

/** Optional URL: '' → null, format-validated ONLY when a value is present. */
const optUrl = zod
  .string()
  .max(500)
  .nullish()
  .transform((v) => {
    const t = v?.trim() ?? '';
    return t === '' ? null : t;
  })
  .refine((v) => v === null || zod.string().url().safeParse(v).success, {
    message: 'Enter a valid URL (include https://)',
  });

const STUDIO_LEAD_STATUSES = ['new', 'qualified', 'proposal', 'won', 'lost'] as const;

const createLeadSchema = zod.object({
  company: requiredText('Company', 200),
  full_name: optText(200),
  email: optEmail,
  phone: optText(50),
  industry: optText(100),
  existing_url: optUrl,
  notes: optText(5000),
});

const updateLeadSchema = zod.object({
  company: requiredText('Company', 200),
  full_name: optText(200),
  email: optEmail,
  phone: optText(50),
  industry: optText(100),
  existing_url: optUrl,
  // Optional: once an engagement exists, its stage drives sales_stage through
  // the 067 mirror and the form omits status entirely (see updateLead).
  status: zod.enum(STUDIO_LEAD_STATUSES).optional(),
  notes: optText(5000),
  preview_url: optUrl,
  preview_password: optText(200),
});

const saveOutreachEmailSchema = zod.object({
  subject: optText(500),
  body: optText(20000),
});

// ── Public input types (UI vocabulary) ───────────────────────────────────────

export type CreateLeadInput = {
  company: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  existing_url?: string | null;
  notes?: string | null;
};

export type UpdateLeadInput = {
  company: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  existing_url?: string | null;
  /** Omit when the lead has an engagement — the engagement's stage owns it. */
  status?: StudioLeadStatus;
  notes?: string | null;
  preview_url?: string | null;
  preview_password?: string | null;
};

// ── The ONE place UI field names are translated to leads-table columns ────────

type LeadColumnPatch = Partial<{
  full_name: string | null;
  company: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  existing_url: string | null;
  status: StudioLeadStatus;
  notes: string | null;
  preview_url: string | null;
  preview_password: string | null;
}>;

/**
 * Maps the aliased UI vocabulary to leads-table column names. This is the single
 * source of truth for the alias↔column translation (full_name→name,
 * company→business_name, status→sales_stage). Only keys present on the patch are
 * emitted, so it works for both a full create and a partial update.
 */
function toLeadColumns(patch: LeadColumnPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ('full_name' in patch) row.name = patch.full_name;
  if ('company' in patch) row.business_name = patch.company;
  if ('email' in patch) row.email = patch.email;
  if ('phone' in patch) row.phone = patch.phone;
  if ('industry' in patch) row.industry = patch.industry;
  if ('existing_url' in patch) row.existing_url = patch.existing_url;
  if ('status' in patch) row.sales_stage = patch.status;
  if ('notes' in patch) row.notes = patch.notes;
  if ('preview_url' in patch) row.preview_url = patch.preview_url;
  if ('preview_password' in patch) row.preview_password = patch.preview_password;
  return row;
}

// ── Actions ───────────────────────────────────────────────────────────────

/**
 * Create a lead by hand. Company is required; every contact field is optional
 * (a prospected lead may have only a company name at first). Starts life as a
 * `manual`-sourced lead at lifecycle/sales_stage 'new'.
 */
export async function createLead(input: CreateLeadInput): Promise<{ id: string }> {
  await requireAdmin();
  const parsed = parseInput(createLeadSchema, input);
  const admin = createAdminClient();

  const row = {
    ...toLeadColumns({
      company: parsed.company,
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      industry: parsed.industry,
      existing_url: parsed.existing_url,
      notes: parsed.notes,
    }),
    source: 'manual',
    lifecycle: 'new',
    sales_stage: 'new',
  };

  const { data, error } = await admin
    .from('leads')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;

  revalidateLeadPaths(data.id);
  return { id: data.id };
}

/**
 * Update a lead's editable fields (identity/contact block, status, notes, preview).
 *
 * STATUS IS ENGAGEMENT-DERIVED ONCE AN ENGAGEMENT EXISTS (migration 067): a
 * DB trigger mirrors the engagement's stage onto leads.sales_stage and a guard
 * RAISEs on any conflicting direct write — including by the service role. So
 * (1) the `status` property is built CONDITIONALLY below: toLeadColumns decides
 * by property presence, and an optional field that is merely `undefined` would
 * still put `sales_stage: undefined` on the wire; and (2) a status CHANGE is
 * refused when the lead is engaged — a value equal to what the mirror already
 * holds (a tab opened before Start engagement) is not a change and is simply
 * dropped, so the rest of the save still lands. The DB guard is the backstop
 * for the race where an engagement starts between the lookup and the write.
 */
export async function updateLead(id: string, patch: UpdateLeadInput): Promise<void> {
  await requireAdmin();
  const parsed = parseInput(updateLeadSchema, patch);
  const admin = createAdminClient();

  let status = parsed.status;
  if (status !== undefined) {
    const engagement = await findEngagementForLead(admin, id);
    if (engagement) {
      if (status !== salesStageFor(engagement.stage)) throw new Error(STATUS_IS_ENGAGEMENT_DERIVED);
      status = undefined;
    }
  }

  const row = toLeadColumns({
    company: parsed.company,
    full_name: parsed.full_name,
    email: parsed.email,
    phone: parsed.phone,
    industry: parsed.industry,
    existing_url: parsed.existing_url,
    ...(status !== undefined ? { status } : {}),
    notes: parsed.notes,
    preview_url: parsed.preview_url,
    preview_password: parsed.preview_password,
  });

  const { error } = await admin.from('leads').update(row).eq('id', id);
  if (error) {
    if (error.message?.includes('lead_sales_stage_is_engagement_derived')) {
      throw new Error(STATUS_IS_ENGAGEMENT_DERIVED);
    }
    throw error;
  }

  revalidateLeadPaths(id);
}

/** Persist a hand-edited outreach email draft (subject + body only). */
export async function saveOutreachEmail(
  id: string,
  input: { subject: string; body: string },
): Promise<void> {
  await requireAdmin();
  const parsed = parseInput(saveOutreachEmailSchema, input);
  const admin = createAdminClient();

  const { error } = await admin
    .from('leads')
    .update({
      outreach_email_subject: parsed.subject,
      outreach_email_body: parsed.body,
    })
    .eq('id', id);
  if (error) throw error;

  revalidateLeadPaths(id);
}
