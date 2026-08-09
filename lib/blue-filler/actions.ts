'use server';

// Blue Filler — Taste Memory actions.
//
// Mirrors lib/workbench/actions.ts: a private requireAdmin() gate, zod-validated
// input, the service-role client for the write (RLS keeps these tables
// admin-only, so the service role is the controlled write path), an EXPLICIT
// updated_at, and revalidatePath afterwards.
//
// Neither action touches scores: status and verdict are Ryan's judgment,
// composite/grade belong to the scoring pipeline.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const ideaIdSchema = z.string().uuid();

const statusSchema = z.enum(['new', 'shortlist', 'archived']);

/** null clears the verdict; a note without a verdict is meaningless, so it clears too. */
const verdictSchema = z.enum(['interested', 'pass']).nullable();
const verdictNoteSchema = z.string().max(500).nullable();

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

function revalidateIdeaPaths(id: string): void {
  revalidatePath('/admin/blue-filler');
  revalidatePath(`/admin/blue-filler/${id}`);
}

export async function updateIdeaStatus(ideaId: string, status: string): Promise<void> {
  await requireAdmin();

  const id = ideaIdSchema.parse(ideaId);
  const nextStatus = statusSchema.parse(status);

  const admin = createAdminClient();
  const { error } = await admin
    .from('blue_filler_ideas')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[blue-filler] updateIdeaStatus failed:', error);
    throw new Error('Failed to update the status.');
  }
  revalidateIdeaPaths(id);
}

export async function updateIdeaVerdict(
  ideaId: string,
  verdict: string | null,
  note: string | null,
): Promise<void> {
  await requireAdmin();

  const id = ideaIdSchema.parse(ideaId);
  const nextVerdict = verdictSchema.parse(verdict);
  const rawNote = verdictNoteSchema.parse(note);
  // Clearing the verdict clears its note; an empty note is stored as null, not ''.
  const nextNote = nextVerdict === null ? null : rawNote?.trim() || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from('blue_filler_ideas')
    .update({
      verdict: nextVerdict,
      verdict_note: nextNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[blue-filler] updateIdeaVerdict failed:', error);
    throw new Error('Failed to save the verdict.');
  }
  revalidateIdeaPaths(id);
}
