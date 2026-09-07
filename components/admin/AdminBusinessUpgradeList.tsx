'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { duplicateBusinessUpgradeProject, setBusinessUpgradeProjectStatus } from '@/lib/business-upgrades/admin-actions';
import type { BusinessUpgradeProjectEditorRow } from '@/lib/business-upgrades/types';

export function AdminBusinessUpgradeList({ projects }: { projects: BusinessUpgradeProjectEditorRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [, transition] = useTransition();
  const shown = (filter === 'all' ? projects : projects.filter((p) => p.status === filter)).filter((p) => !search || p.title_en.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase()));
  function change(id: string, status: 'draft' | 'published' | 'archived') {
    setBusy(id); setError(''); transition(async () => { try { await setBusinessUpgradeProjectStatus(id, status); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); } finally { setBusy(null); } });
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search title or slug" className="min-h-10 rounded-lg border border-border-default bg-bg-secondary px-3 text-sm"/>{['all','draft','published','archived'].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${filter === value ? 'bg-accent-teal text-white' : 'bg-bg-tertiary text-fg-secondary'}`}>{value}</button>)}</div>
    {error && <p className="text-sm text-accent-coral">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-secondary"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-fg-tertiary"><th className="p-4">Project</th><th className="p-4">Targets</th><th className="p-4">Steps</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{shown.map((p) => <tr key={p.id} className="border-t border-border-default"><td className="p-4"><Link href={`/admin/business-upgrades/${p.id}`} className="font-semibold text-fg-primary hover:text-accent-teal">{p.title_en}</Link><span className="block text-xs text-fg-tertiary">{p.slug} · v{p.template_version}</span></td><td className="p-4 text-fg-secondary">{(p.goal_codes ?? []).join(', ')}</td><td className="p-4 text-fg-secondary">{p.business_upgrade_project_steps?.length ?? 0}</td><td className="p-4 capitalize text-fg-secondary">{p.status}</td><td className="p-4 text-right"><div className="flex justify-end gap-3"><Link href={`/admin/business-upgrades/${p.id}/preview`} className="text-xs font-semibold text-fg-secondary">Preview</Link><button disabled={busy === p.id} onClick={()=>{setBusy(p.id);transition(async()=>{try{const r=await duplicateBusinessUpgradeProject(p.id);router.push(`/admin/business-upgrades/${r.projectId}`);}catch(e){setError(e instanceof Error?e.message:'Duplicate failed');}finally{setBusy(null);}})}} className="text-xs font-semibold text-fg-secondary">Duplicate</button>{p.status !== 'published' && <button disabled={busy === p.id} onClick={() => change(p.id, 'published')} className="text-xs font-semibold text-accent-teal">Publish</button>}{p.status === 'published' && <button disabled={busy === p.id} onClick={() => change(p.id, 'draft')} className="text-xs font-semibold text-fg-secondary">Unpublish</button>}{p.status !== 'archived' && <button disabled={busy === p.id} onClick={() => change(p.id, 'archived')} className="text-xs font-semibold text-accent-coral">Archive</button>}</div></td></tr>)}</tbody></table>{shown.length === 0 && <p className="p-8 text-center text-sm text-fg-tertiary">No projects match this filter.</p>}</div>
  </div>;
}
