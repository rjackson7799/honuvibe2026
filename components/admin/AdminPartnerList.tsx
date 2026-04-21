'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PartnerListRow = {
  id: string;
  slug: string;
  name_en: string;
  logo_url: string | null;
  primary_color: string | null;
  is_public: boolean;
  is_active: boolean;
  revenue_share_pct: number;
  enrollments_count: number;
};

type Props = {
  partners: PartnerListRow[];
};

export function AdminPartnerList({ partners }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [slug, setSlug] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameJp, setNameJp] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          name_en: nameEn.trim(),
          name_jp: nameJp.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'Create failed');
        return;
      }
      router.push(`/admin/partners/${data.partner.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showCreate ? (
          <Button size="sm" icon={Plus} iconPosition="left" onClick={() => setShowCreate(true)}>
            New partner
          </Button>
        ) : null}
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border-default bg-bg-secondary p-5 space-y-4"
        >
          <h2 className="font-serif text-lg text-fg-primary">New partner</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fg-secondary">Slug</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="smashhaus"
                pattern="[a-z0-9-]+"
                className="h-10 px-3 rounded border border-border-default bg-bg-primary text-fg-primary text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fg-secondary">Name (EN)</span>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="h-10 px-3 rounded border border-border-default bg-bg-primary text-fg-primary text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-fg-secondary">Name (JP, optional)</span>
              <input
                type="text"
                value={nameJp}
                onChange={(e) => setNameJp(e.target.value)}
                className="h-10 px-3 rounded border border-border-default bg-bg-primary text-fg-primary text-base"
              />
            </label>
          </div>
          {createError && <p className="text-sm text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCreate(false);
                setCreateError('');
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-fg-tertiary">
            New partners are created active & public. Edit branding, description, and featured courses on the next screen.
          </p>
        </form>
      )}

      {partners.length === 0 ? (
        <div className="rounded-lg border border-border-default bg-bg-secondary p-8 text-center text-fg-secondary">
          No partners yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-fg-tertiary">
                <th className="text-left py-3 px-4 font-medium">Partner</th>
                <th className="text-left py-3 px-4 font-medium">Slug</th>
                <th className="text-left py-3 px-4 font-medium">Rev-share</th>
                <th className="text-left py-3 px-4 font-medium">Enrollments</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border-default last:border-0 hover:bg-bg-tertiary"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <Image
                          src={p.logo_url}
                          alt={p.name_en}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded object-contain"
                        />
                      ) : (
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center text-xs font-medium text-white"
                          style={{ background: p.primary_color ?? 'var(--accent-teal)' }}
                        >
                          {p.name_en.charAt(0)}
                        </div>
                      )}
                      <Link
                        href={`/admin/partners/${p.id}`}
                        className="font-medium text-fg-primary hover:text-accent-teal"
                      >
                        {p.name_en}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-fg-secondary">{p.slug}</td>
                  <td className="py-3 px-4 text-fg-secondary">{p.revenue_share_pct}%</td>
                  <td className="py-3 px-4 text-fg-secondary">{p.enrollments_count}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1.5">
                      <StatusPill
                        label={p.is_active ? 'Active' : 'Inactive'}
                        tone={p.is_active ? 'good' : 'muted'}
                      />
                      <StatusPill
                        label={p.is_public ? 'Public' : 'Noindex'}
                        tone={p.is_public ? 'neutral' : 'warn'}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/partners/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent-teal hover:underline"
                    >
                      View <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'muted' | 'warn' | 'neutral';
}) {
  const toneClass = {
    good: 'bg-green-500/10 text-green-500 border-green-500/20',
    muted: 'bg-bg-tertiary text-fg-tertiary border-border-default',
    warn: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    neutral: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}>
      {label}
    </span>
  );
}
