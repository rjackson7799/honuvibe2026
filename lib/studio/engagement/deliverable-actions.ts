'use server';

// Build kickoff — deliverable admin server actions (slice 4B, migration 075).
// The proposal-actions.ts shape: requireAdmin(), zod parseInput, the
// service-role client, revalidatePath on the engagement page + the list.
//
// Deliverables are written by PLAIN service-role statements, not RPCs: a
// single-row INSERT/UPDATE/DELETE on engagement_deliverables takes no
// engagement or proposal lock, so it cannot participate in the
// engagement -> proposal -> invoice cycle the money path lives under. The DB
// guard owns delivered_at; every status move is allowed (decision 7 — one
// operator, corrections are normal).
//
// Only two moves write to the timeline (judgment call 9): the seed
// (deliverables_seeded) and a move INTO delivered (deliverable_delivered).
// Everything else would just make the timeline unreadable.
//
// previewDeliverablesFromScope is REVIEW-FIRST by construction: it returns
// candidates and writes nothing. It is also the seam where a later AI
// extractor drops in — swap the source, keep the confirm step.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { scopeBulletsToDeliverables, type DeliverableCandidate } from './deliverable-seed';
import { DELIVERABLE_PHASES, DELIVERABLE_STATUSES } from './types';
import type { EngagementDeliverable } from '@/lib/admin/types';

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
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
const titleSchema = z.string().trim().min(1, 'A title is required.').max(200, 'Keep the title under 200 characters.');
const phaseSchema = z.enum(DELIVERABLE_PHASES);
const statusSchema = z.enum(DELIVERABLE_STATUSES);

const newRowsSchema = z
  .array(z.object({ title: titleSchema, phase: phaseSchema.default('build') }))
  .min(1, 'Pick at least one deliverable.')
  .max(50, 'Add at most 50 at a time.');

const patchSchema = z
  .object({
    title: titleSchema.optional(),
    phase: phaseSchema.optional(),
    status: statusSchema.optional(),
    due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.').nullable().optional(),
    notes_md: z.string().max(4000, 'Notes are limited to 4000 characters.').nullable().optional(),
    sort_order: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: 'Nothing to change.' });

function revalidate(engagementId: string): void {
  revalidatePath(`/admin/studio/engagements/${engagementId}`);
  revalidatePath('/admin/studio/engagements');
}

async function logEvent(
  admin: SupabaseClient,
  engagementId: string,
  kind: 'deliverables_seeded' | 'deliverable_delivered',
  summary: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin
    .from('engagement_events')
    .insert({ engagement_id: engagementId, kind, actor: 'admin', summary, data });
  if (error) console.error(`[deliverable] event ${kind} failed:`, error);
}

async function loadDeliverable(admin: SupabaseClient, id: string): Promise<EngagementDeliverable> {
  const { data, error } = await admin.from('engagement_deliverables').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('[deliverable] load failed:', error);
    throw new Error('Failed to load the deliverable.');
  }
  if (!data) throw new Error('Deliverable not found.');
  return data as unknown as EngagementDeliverable;
}

/**
 * The accepted proposal's scope bullets as CANDIDATES. Writes nothing — the
 * panel renders them as an editable checklist and only what Ryan confirms
 * reaches addDeliverables.
 */
export async function previewDeliverablesFromScope(
  engagementId: string,
): Promise<{ proposalId: string | null; version: number | null; candidates: DeliverableCandidate[] }> {
  await requireAdmin();
  const eid = parseInput(uuidSchema, engagementId);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('engagement_proposals')
    .select('id, version, issued_snapshot')
    .eq('engagement_id', eid)
    .eq('status', 'accepted')
    .maybeSingle();
  if (error) {
    console.error('[deliverable] scope read failed:', error);
    throw new Error('Failed to read the accepted proposal.');
  }
  if (!data) throw new Error('There is no accepted proposal to seed from.');

  return {
    proposalId: data.id as string,
    version: data.version as number,
    candidates: scopeBulletsToDeliverables(data.issued_snapshot),
  };
}

/**
 * Insert the confirmed rows, in the order Ryan left them. `proposalId` records
 * which accepted proposal seeded them (NULL for hand-added rows); it is
 * ON DELETE SET NULL, so deleting the proposal orphans rather than destroys.
 * The seed event fires only when a proposal is named — a single hand-added
 * row is not a seeding.
 */
export async function addDeliverables(
  engagementId: string,
  rows: { title: string; phase?: 'build' | 'launch' }[],
  proposalId?: string | null,
): Promise<{ added: number }> {
  await requireAdmin();
  const eid = parseInput(uuidSchema, engagementId);
  const parsed = parseInput(newRowsSchema, rows);
  const pid = proposalId ? parseInput(uuidSchema, proposalId) : null;
  const admin = createAdminClient();

  // Append after whatever is already there, so a second seed does not
  // interleave with the first.
  const { data: last } = await admin
    .from('engagement_deliverables')
    .select('sort_order')
    .eq('engagement_id', eid)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const base = ((last?.sort_order as number | undefined) ?? -1) + 1;

  const { data, error } = await admin
    .from('engagement_deliverables')
    .insert(
      parsed.map((r, i) => ({
        engagement_id: eid,
        proposal_id: pid,
        title: r.title,
        phase: r.phase,
        sort_order: base + i,
      })),
    )
    .select('id');
  if (error) {
    console.error('[deliverable] insert failed:', error);
    throw new Error('Failed to add the deliverables.');
  }

  const added = data?.length ?? 0;
  if (pid && added > 0) {
    const { data: p } = await admin.from('engagement_proposals').select('version').eq('id', pid).maybeSingle();
    await logEvent(
      admin,
      eid,
      'deliverables_seeded',
      `${added} deliverable${added === 1 ? '' : 's'} seeded from the accepted proposal's scope`,
      { count: added, proposal_id: pid, version: (p?.version as number | undefined) ?? null },
    );
  }

  revalidate(eid);
  return { added };
}

/**
 * Edit one deliverable. Backwards status moves are allowed on purpose; the DB
 * guard fills, preserves or clears `delivered_at` so an ordinary title edit
 * never disturbs a recorded delivery date.
 */
export async function updateDeliverable(
  deliverableId: string,
  patch: {
    title?: string;
    phase?: 'build' | 'launch';
    status?: 'planned' | 'in_progress' | 'delivered' | 'accepted';
    due_on?: string | null;
    notes_md?: string | null;
    sort_order?: number;
  },
): Promise<void> {
  await requireAdmin();
  const id = parseInput(uuidSchema, deliverableId);
  const changes = parseInput(patchSchema, patch);
  const admin = createAdminClient();
  const before = await loadDeliverable(admin, id);

  const { error } = await admin.from('engagement_deliverables').update(changes).eq('id', id);
  if (error) {
    console.error('[deliverable] update failed:', error);
    throw new Error(
      error.message.includes('deliverable_identity_immutable')
        ? 'A deliverable cannot be moved to another engagement.'
        : 'Failed to save the deliverable.',
    );
  }

  // Only a move INTO delivered is timeline-worthy (judgment call 9).
  if (changes.status === 'delivered' && before.status !== 'delivered') {
    await logEvent(admin, before.engagement_id, 'deliverable_delivered', `Delivered: ${before.title}`, {
      deliverable_id: id,
      title: before.title,
      phase: changes.phase ?? before.phase,
    });
  }

  revalidate(before.engagement_id);
}

/** Remove a deliverable outright — it is a plan, not a record of money. */
export async function deleteDeliverable(deliverableId: string): Promise<void> {
  await requireAdmin();
  const id = parseInput(uuidSchema, deliverableId);
  const admin = createAdminClient();
  const before = await loadDeliverable(admin, id);

  const { error } = await admin.from('engagement_deliverables').delete().eq('id', id);
  if (error) {
    console.error('[deliverable] delete failed:', error);
    throw new Error('Failed to delete the deliverable.');
  }
  revalidate(before.engagement_id);
}
