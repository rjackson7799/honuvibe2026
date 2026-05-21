import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ModTabs } from './ModTabs';
import {
  BanAuthorButton,
  HidePostButton,
  PinPostButton,
  ResolveReportButton,
  UnbanButton,
} from './ModActionButtons';

type Tab = 'reports' | 'posts' | 'bans';

interface ReportRow {
  id: string;
  partner_id: string | null;
  target_type: 'post' | 'comment';
  target_id: string;
  reporter_id: string;
  reason: string;
  note: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

interface PostRow {
  id: string;
  partner_id: string | null;
  author_id: string;
  category: string;
  body_md: string;
  status: 'published' | 'hidden' | 'deleted';
  pinned_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: { full_name: string | null } | null;
}

interface BanRow {
  partner_id: string | null;
  user_id: string;
  reason: string | null;
  created_at: string;
}

export async function ModerationDashboard({
  supabase,
  partnerId,
  partnerScopeLabel,
  tab = 'reports',
}: {
  supabase: SupabaseClient;
  partnerId: string | null | undefined; // undefined = all scopes (HonuVibe admin); null = HonuVibe main only; string = partner
  partnerScopeLabel: string;
  tab?: Tab;
}) {
  // Reports
  let reports: ReportRow[] = [];
  if (tab === 'reports') {
    let q = supabase
      .from('community_reports')
      .select(
        'id, partner_id, target_type, target_id, reporter_id, reason, note, status, created_at',
      )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);
    if (partnerId === null) q = q.is('partner_id', null);
    else if (typeof partnerId === 'string') q = q.eq('partner_id', partnerId);
    const { data } = await q;
    reports = (data ?? []) as ReportRow[];
  }

  // Posts
  let posts: PostRow[] = [];
  if (tab === 'posts') {
    let q = supabase
      .from('community_posts')
      .select(
        `id, partner_id, author_id, category, body_md, status, pinned_at,
         like_count, comment_count, created_at,
         author:users!community_posts_author_id_fkey ( full_name )`,
      )
      .order('created_at', { ascending: false })
      .limit(50);
    if (partnerId === null) q = q.is('partner_id', null);
    else if (typeof partnerId === 'string') q = q.eq('partner_id', partnerId);
    const { data } = await q;
    posts = (data ?? []) as unknown as PostRow[];
  }

  // Bans
  let bans: BanRow[] = [];
  if (tab === 'bans') {
    let q = supabase
      .from('community_bans')
      .select('partner_id, user_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (partnerId === null) q = q.is('partner_id', null);
    else if (typeof partnerId === 'string') q = q.eq('partner_id', partnerId);
    const { data } = await q;
    bans = (data ?? []) as BanRow[];
  }

  return (
    <div className="space-y-5 max-w-[1100px]">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-fg-tertiary">
          {partnerScopeLabel}
        </p>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Community moderation
        </h1>
      </header>

      <ModTabs active={tab} />

      {tab === 'reports' && (
        <div className="rounded-[14px] bg-bg-secondary border border-border-default divide-y divide-border-default">
          {reports.length === 0 ? (
            <p className="p-6 text-sm text-fg-tertiary text-center">No open reports.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-[12px] text-fg-tertiary">
                  <span className="font-semibold text-fg-secondary uppercase">
                    {r.reason}
                  </span>
                  <span>·</span>
                  <span>{r.target_type}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.note && (
                  <p className="text-[13px] text-fg-secondary italic">“{r.note}”</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {r.target_type === 'post' && (
                    <Link
                      href={`/learn/dashboard/community/${r.target_id}`}
                      className="text-[12px] text-[color:var(--accent-teal)] font-semibold underline"
                    >
                      View post
                    </Link>
                  )}
                  <ResolveReportButton reportId={r.id} />
                  {r.target_type === 'post' && (
                    <HidePostButton postId={r.target_id} op="hide" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'posts' && (
        <div className="rounded-[14px] bg-bg-secondary border border-border-default divide-y divide-border-default">
          {posts.length === 0 ? (
            <p className="p-6 text-sm text-fg-tertiary text-center">No posts.</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-[12px] text-fg-tertiary">
                  <span className="font-semibold text-fg-primary">
                    {p.author?.full_name ?? 'Member'}
                  </span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleString()}</span>
                  <span>·</span>
                  <span>{p.category}</span>
                  <span>·</span>
                  <span className="uppercase">{p.status}</span>
                  {p.pinned_at && (
                    <>
                      <span>·</span>
                      <span className="text-[color:var(--accent-teal)] font-semibold">
                        pinned
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[13px] text-fg-secondary line-clamp-3 whitespace-pre-wrap">
                  {p.body_md}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/learn/dashboard/community/${p.id}`}
                    className="text-[12px] text-[color:var(--accent-teal)] font-semibold underline"
                  >
                    View
                  </Link>
                  <PinPostButton postId={p.id} pinned={!!p.pinned_at} />
                  {p.status === 'published' && (
                    <HidePostButton postId={p.id} op="hide" />
                  )}
                  {p.status === 'hidden' && (
                    <HidePostButton postId={p.id} op="unhide" />
                  )}
                  <HidePostButton postId={p.id} op="delete" />
                  <BanAuthorButton partnerId={p.partner_id} userId={p.author_id} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'bans' && (
        <div className="rounded-[14px] bg-bg-secondary border border-border-default divide-y divide-border-default">
          {bans.length === 0 ? (
            <p className="p-6 text-sm text-fg-tertiary text-center">No banned users.</p>
          ) : (
            bans.map((b) => (
              <div
                key={`${b.partner_id ?? 'main'}:${b.user_id}`}
                className="p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-mono text-fg-primary truncate">
                    {b.user_id}
                  </p>
                  <p className="text-[12px] text-fg-tertiary">
                    {new Date(b.created_at).toLocaleString()}
                    {b.reason && <> · {b.reason}</>}
                  </p>
                </div>
                <UnbanButton partnerId={b.partner_id} userId={b.user_id} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
