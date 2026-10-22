import { createClient } from '@/lib/supabase/server';
import type { FeedbackKind, FeedbackStatus, PreviewFeedbackItem } from '@/lib/previews/feedback';

// Admin reads for /admin/studio/previews. Session client (like getStudioLeads):
// client_previews + preview_feedback are admin-only under RLS and the /admin
// layout's AdminGuard gates the pages.
//
// PostgREST truncates every response at max_rows = 1000 with NO error, so:
//   * counts NEVER come from fetched rows — they are head counts;
//   * the feedback list is paged until a short page comes back.
// Explicit columns only; `client_previews.password` is never selected.

export type AdminPreviewSummary = {
  id: string;
  slug: string;
  title: string | null;
  mode: 'public' | 'gated';
  createdAt: string;
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  feedbackEnabled: boolean;
  counts: { total: number; new: number; open: number };
};

/** The list shows at most this many previews (newest first). */
export const PREVIEW_LIST_LIMIT = 200;
const FEEDBACK_PAGE_SIZE = 500;

const PREVIEW_COLUMNS =
  'id, slug, title, mode, created_at, expires_at, access_count, last_accessed_at, feedback_enabled';
const FEEDBACK_COLUMNS =
  'id, created_at, page, reviewer_name, kind, message, viewport_w, viewport_h, user_agent, status';

type PreviewRow = {
  id: string;
  slug: string;
  title: string | null;
  mode: 'public' | 'gated';
  created_at: string;
  expires_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  feedback_enabled: boolean;
};

type FeedbackRow = {
  id: string;
  created_at: string;
  page: string;
  reviewer_name: string;
  kind: FeedbackKind;
  message: string;
  viewport_w: number | null;
  viewport_h: number | null;
  user_agent: string | null;
  status: FeedbackStatus;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function feedbackCounts(
  supabase: Supabase,
  previewId: string,
): Promise<AdminPreviewSummary['counts']> {
  const head = () =>
    supabase
      .from('preview_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('preview_id', previewId);

  const [total, fresh, open] = await Promise.all([
    head(),
    head().eq('status', 'new'),
    head().in('status', ['new', 'planned']),
  ]);
  for (const r of [total, fresh, open]) {
    if (r.error) throw r.error;
  }
  return { total: total.count ?? 0, new: fresh.count ?? 0, open: open.count ?? 0 };
}

function toSummary(row: PreviewRow, counts: AdminPreviewSummary['counts']): AdminPreviewSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    mode: row.mode,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    feedbackEnabled: row.feedback_enabled,
    counts,
  };
}

function toItem(row: FeedbackRow): PreviewFeedbackItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    page: row.page,
    reviewerName: row.reviewer_name,
    kind: row.kind,
    message: row.message,
    viewportW: row.viewport_w,
    viewportH: row.viewport_h,
    userAgent: row.user_agent,
    status: row.status,
  };
}

/** Newest first, capped at PREVIEW_LIST_LIMIT. Three head counts per preview. */
export async function getPreviewSummaries(): Promise<AdminPreviewSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('client_previews')
    .select(PREVIEW_COLUMNS)
    .order('created_at', { ascending: false })
    .range(0, PREVIEW_LIST_LIMIT - 1);
  if (error) throw error;

  const rows = (data ?? []) as PreviewRow[];
  return Promise.all(
    rows.map(async (row) => toSummary(row, await feedbackCounts(supabase, row.id))),
  );
}

/** The preview plus EVERY feedback row (paged past PostgREST's 1000-row cap); null if absent. */
export async function getPreviewWithFeedback(
  id: string,
): Promise<{ preview: AdminPreviewSummary; items: PreviewFeedbackItem[] } | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('client_previews')
    .select(PREVIEW_COLUMNS)
    .eq('id', id)
    .maybeSingle<PreviewRow>();
  if (error) throw error;
  if (!row) return null;

  const items: PreviewFeedbackItem[] = [];
  for (let from = 0; ; from += FEEDBACK_PAGE_SIZE) {
    const { data: page, error: pageError } = await supabase
      .from('preview_feedback')
      .select(FEEDBACK_COLUMNS)
      .eq('preview_id', id)
      .order('created_at')
      .order('id')
      .range(from, from + FEEDBACK_PAGE_SIZE - 1);
    if (pageError) throw pageError;
    const rows = (page ?? []) as FeedbackRow[];
    items.push(...rows.map(toItem));
    if (rows.length < FEEDBACK_PAGE_SIZE) break;
  }

  const counts = await feedbackCounts(supabase, id);
  return { preview: toSummary(row, counts), items };
}
