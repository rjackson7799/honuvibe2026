// Blue Filler — server-side reads. Admin-only data, so every read goes through
// the service-role client behind an admin-gated page or route (same shape as
// lib/admin/queries.ts).

import { createAdminClient } from '@/lib/supabase/server';
import { IDEA_LIST_CAP } from './types';
import type {
  BlueFillerIdea,
  BlueFillerResearch,
  IdeaStatus,
  ResearchSummary,
} from './types';
import type { TasteExample } from './generator';

const TASTE_LIMIT = 8;
const DEDUPE_LIMIT = 100;
const RESEARCH_HISTORY_LIMIT = 20;

export interface IdeaListFilters {
  status?: IdeaStatus;
  industryKey?: string;
}

/**
 * Ranked list. The tiebreaker chain (composite, created_at, id) is total, so
 * pagination and the 200-row cap are deterministic.
 */
export async function listIdeas(filters: IdeaListFilters = {}): Promise<BlueFillerIdea[]> {
  const admin = createAdminClient();
  let query = admin
    .from('blue_filler_ideas')
    .select('*')
    .order('composite', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(IDEA_LIST_CAP);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.industryKey) query = query.eq('industry_key', filters.industryKey);

  const { data, error } = await query;
  if (error) {
    console.error('[blue-filler] listIdeas failed:', error);
    throw new Error('Failed to load ideas.');
  }
  return (data ?? []) as BlueFillerIdea[];
}

export async function getIdea(id: string): Promise<BlueFillerIdea | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blue_filler_ideas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[blue-filler] getIdea failed:', error);
    throw new Error('Failed to load the idea.');
  }
  return (data as BlueFillerIdea | null) ?? null;
}

export async function getLatestResearch(ideaId: string): Promise<BlueFillerResearch | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blue_filler_research')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[blue-filler] getLatestResearch failed:', error);
    throw new Error('Failed to load research.');
  }
  return (data as BlueFillerResearch | null) ?? null;
}

/**
 * The 5-second poll's projection: everything EXCEPT raw_findings_md, which the
 * DB caps at 200,000 characters and which grows with every checkpoint. Sending
 * it back on each poll of a 3-4 minute run would move megabytes for a panel
 * that renders only the status line while generating; the full GET that fires
 * once the run terminalizes fills it in.
 */
const POLL_COLUMNS =
  'id, idea_id, created_at, updated_at, status, report, summary_md, citations, revised_scores, search_count, model_id, pipeline_version, build_sha, generation_error, completed_at';

export async function getLatestResearchForPoll(
  ideaId: string,
): Promise<Omit<BlueFillerResearch, 'raw_findings_md'> | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blue_filler_research')
    .select(POLL_COLUMNS)
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[blue-filler] getLatestResearchForPoll failed:', error);
    throw new Error('Failed to load research.');
  }
  return (data as unknown as Omit<BlueFillerResearch, 'raw_findings_md'> | null) ?? null;
}

export async function getResearchHistory(
  ideaId: string,
  limit = RESEARCH_HISTORY_LIMIT,
): Promise<BlueFillerResearch[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blue_filler_research')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[blue-filler] getResearchHistory failed:', error);
    throw new Error('Failed to load research history.');
  }
  return (data ?? []) as BlueFillerResearch[];
}

export function toResearchSummary(row: BlueFillerResearch): ResearchSummary {
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    search_count: row.search_count,
    citation_count: row.citations?.length ?? 0,
  };
}

/**
 * Ryan's taste, as observations for the generator prompt. Verdicts count
 * regardless of the idea's status — archiving an idea does not erase the signal
 * that he was interested in it.
 */
export async function getTasteProfile(): Promise<{
  interested: TasteExample[];
  passed: TasteExample[];
}> {
  const admin = createAdminClient();

  const fetchVerdict = async (verdict: 'interested' | 'pass'): Promise<TasteExample[]> => {
    const { data, error } = await admin
      .from('blue_filler_ideas')
      .select('title, one_liner, industry_key, verdict_note')
      .eq('verdict', verdict)
      .order('updated_at', { ascending: false })
      .limit(TASTE_LIMIT);
    if (error) {
      console.error(`[blue-filler] getTasteProfile(${verdict}) failed:`, error);
      return [];
    }
    return (data ?? []) as TasteExample[];
  };

  const [interested, passed] = await Promise.all([fetchVerdict('interested'), fetchVerdict('pass')]);
  return { interested, passed };
}

/** Recent non-archived ideas, so the generator does not repeat itself. */
export async function getDedupeList(): Promise<{ title: string; industry_key: string }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blue_filler_ideas')
    .select('title, industry_key')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(DEDUPE_LIMIT);
  if (error) {
    console.error('[blue-filler] getDedupeList failed:', error);
    return [];
  }
  return (data ?? []) as { title: string; industry_key: string }[];
}
