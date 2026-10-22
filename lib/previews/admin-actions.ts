'use server';

// Admin writes for /admin/studio/previews. Mirrors lib/studio/lead-actions.ts:
// inline requireAdmin() that throws, zod parse, service-role client for the
// write, revalidatePath for the list + detail routes.
//
// Every update runs with `.select(...)` and throws when ZERO rows come back:
// PostgREST reports an update that matches nothing as a success, and a write to
// a nonexistent id must fail loudly instead of looking saved.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { FEEDBACK_STATUSES, type FeedbackStatus } from '@/lib/previews/feedback';

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

function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    );
    throw new Error(`Invalid input — ${messages.join(' ')}`);
  }
  return result.data;
}

function revalidatePreviewPaths(previewId: string): void {
  revalidatePath('/admin/studio/previews');
  revalidatePath(`/admin/studio/previews/${previewId}`);
}

const statusInput = z.object({
  id: z.uuid(),
  status: z.enum(FEEDBACK_STATUSES),
});

const enabledInput = z.object({
  previewId: z.uuid(),
  enabled: z.boolean(),
});

export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  await requireAdmin();
  const input = parseInput(statusInput, { id, status });

  const { data, error } = await createAdminClient()
    .from('preview_feedback')
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .select('id, preview_id');
  if (error) throw new Error(`Could not update feedback: ${error.message}`);
  const row = (data as { id: string; preview_id: string }[] | null)?.[0];
  if (!row) throw new Error('Feedback not found');

  revalidatePreviewPaths(row.preview_id);
}

export async function setPreviewFeedbackEnabled(previewId: string, enabled: boolean): Promise<void> {
  await requireAdmin();
  const input = parseInput(enabledInput, { previewId, enabled });

  const { data, error } = await createAdminClient()
    .from('client_previews')
    .update({ feedback_enabled: input.enabled })
    .eq('id', input.previewId)
    .select('id');
  if (error) throw new Error(`Could not update preview: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Preview not found');

  revalidatePreviewPaths(input.previewId);
}
