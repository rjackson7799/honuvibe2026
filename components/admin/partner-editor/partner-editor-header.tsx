'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../StatusBadge';

type PartnerEditorHeaderProps = {
  partnerId: string;
  name: string;
  slug: string;
  isActive: boolean;
  enrollmentCount: number;
  saving: boolean;
  saveMessage: string;
  saveError: string;
  onSave: () => void;
};

/**
 * Sticky action bar, mirroring the Vault editor's header. Keep this to two
 * rows — the rail's `top-[104px]` offset is measured against that height.
 */
export function PartnerEditorHeader({
  partnerId,
  name,
  slug,
  isActive,
  enrollmentCount,
  saving,
  saveMessage,
  saveError,
  onSave,
}: PartnerEditorHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-bg-primary/95 pb-3 pt-2 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link
          href="/admin/partners"
          className="flex items-center gap-1 text-sm text-fg-tertiary transition-colors hover:text-fg-primary"
        >
          <ArrowLeft size={16} />
          All partners
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/partners/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent-teal hover:underline"
          >
            View landing <ExternalLink size={14} />
          </Link>
          <Link
            href={`/admin/partners/${partnerId}/enrollments`}
            className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            Enrollments ({enrollmentCount})
          </Link>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-serif text-2xl text-fg-primary">{name}</h1>
          <span className="shrink-0 font-mono text-xs text-fg-tertiary">{slug}</span>
          <StatusBadge status={isActive ? 'active' : 'inactive'} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {saveMessage && <span className="text-sm text-accent-teal">{saveMessage}</span>}
          {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
            <Save size={16} className="mr-1.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </header>
  );
}
