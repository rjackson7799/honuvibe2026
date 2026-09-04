'use server';

// Engagement spine — admin server actions (slice 1: start, stage, timeline).
// Mirrors lib/blue-filler/actions.ts: a private requireAdmin() gate, zod-
// validated input with a human-readable error, the service-role client for the
// write (RLS keeps these tables admin-only, so the service role is the
// controlled write path), and revalidatePath afterwards.
//
// Stage changes write ONLY engagements.stage (+ lost_reason). The timestamp
// anchors, the stage_changed event and the leads.sales_stage mirror are all
// trigger-produced in the same transaction (migration 067) — nothing here
// touches leads. Every stage change revalidates the lead's page too, because
// the mirror just changed that page's data.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ENGAGEMENT_STAGES } from './stages';

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
    throw new Error(`Invalid input — ${messages.join(' ')}`);
  }
  return result.data;
}

const uuidSchema = z.string().uuid();
const stageSchema = z.enum(ENGAGEMENT_STAGES);
const lostReasonSchema = z
  .string()
  .trim()
  .min(1, 'A reason is required to mark an engagement lost')
  .max(1000, 'Keep the reason under 1000 characters');
const noteSchema = z
  .string()
  .trim()
  .min(1, 'Write something first')
  .max(4000, 'Keep the note under 4000 characters');

function revalidateEngagementPaths(engagementId: string, leadId?: string | null): void {
  revalidatePath('/admin/studio/engagements');
  revalidatePath(`/admin/studio/engagements/${engagementId}`);
  // The mirror changed the lead's status, which both lead surfaces render.
  revalidatePath('/admin/studio/leads');
  if (leadId) revalidatePath(`/admin/studio/leads/${leadId}`);
}

/**
 * Open an engagement for a QUALIFIED lead. Thin wrapper over the
 * start_engagement RPC — one transaction that locks the lead, returns the
 * existing engagement on a replay, and REQUIRES sales_stage = 'qualified'
 * (the disabled button is UX; the RPC is the enforcement).
 */
export async function startEngagement(
  leadId: string,
): Promise<{ engagementId: string; alreadyStarted: boolean }> {
  await requireAdmin();
  const id = parseInput(uuidSchema, leadId);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('start_engagement', { p_lead_id: id });
  if (error) {
    if (error.message?.includes('lead_not_found')) throw new Error('Lead not found.');
    if (error.message?.includes('lead_not_qualified')) {
      throw new Error('Mark this lead Qualified and save before starting an engagement.');
    }
    console.error('[engagement] startEngagement RPC failed:', error);
    throw new Error('Failed to start the engagement.');
  }

  // RETURNS TABLE → an array of one row.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { engagement_id: string; already_started: boolean }
    | undefined;
  if (!row?.engagement_id) {
    console.error('[engagement] startEngagement RPC returned no row:', data);
    throw new Error('Failed to start the engagement.');
  }

  revalidateEngagementPaths(row.engagement_id, id);
  return { engagementId: row.engagement_id, alreadyStarted: row.already_started };
}

/**
 * Move an engagement to any stage — active, terminal, or back out of a
 * terminal (reopen). `lost` requires a reason; `closed` does not. Any
 * transition is allowed: one operator, fifteen engagements, a state machine
 * here only produces "why won't it let me".
 */
export async function setEngagementStage(
  engagementId: string,
  stage: string,
  opts?: { lostReason?: string | null },
): Promise<void> {
  await requireAdmin();
  const id = parseInput(uuidSchema, engagementId);
  const next = parseInput(stageSchema, stage);

  const patch: { stage: typeof next; lost_reason?: string } = { stage: next };
  if (next === 'lost') patch.lost_reason = parseInput(lostReasonSchema, opts?.lostReason ?? '');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('engagements')
    .update(patch)
    .eq('id', id)
    .select('id, lead_id')
    .maybeSingle();
  if (error) {
    if (error.message?.includes('lost_reason_required')) {
      throw new Error('A reason is required to mark an engagement lost.');
    }
    console.error('[engagement] setEngagementStage failed:', error);
    throw new Error('Failed to change the stage.');
  }
  if (!data) throw new Error('Engagement not found.');

  revalidateEngagementPaths(id, (data as { lead_id: string }).lead_id);
}

/** Append a note to the timeline. Notes are append-only like every event. */
export async function addEngagementNote(engagementId: string, body: string): Promise<void> {
  await requireAdmin();
  const id = parseInput(uuidSchema, engagementId);
  const summary = parseInput(noteSchema, body);

  const admin = createAdminClient();
  const { error } = await admin
    .from('engagement_events')
    .insert({ engagement_id: id, kind: 'note', actor: 'admin', summary });
  if (error) {
    console.error('[engagement] addEngagementNote failed:', error);
    throw new Error('Failed to add the note.');
  }

  revalidatePath(`/admin/studio/engagements/${id}`);
  revalidatePath('/admin/studio/engagements');
}

/** Clear a needs_attention flag. The only mutable column on an event. */
export async function resolveEngagementEvent(eventId: string): Promise<void> {
  await requireAdmin();
  const id = parseInput(uuidSchema, eventId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('engagement_events')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('needs_attention', true)
    .is('resolved_at', null)
    .select('engagement_id')
    .maybeSingle();
  if (error) {
    console.error('[engagement] resolveEngagementEvent failed:', error);
    throw new Error('Failed to resolve the item.');
  }
  if (!data) return; // already resolved, or not an attention item — nothing to do

  revalidatePath(`/admin/studio/engagements/${(data as { engagement_id: string }).engagement_id}`);
  revalidatePath('/admin/studio/engagements');
}
