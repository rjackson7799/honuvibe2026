import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPreviewWithFeedback } from '@/lib/previews/admin-queries';
import { AdminPreviewFeedback } from '@/components/admin/AdminPreviewFeedback';
import {
  PreviewLiveChip,
  formatPreviewDate,
  isPreviewExpired,
} from '@/components/admin/AdminPreviewsList';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = {
  title: 'Client Preview — Admin',
};

export default async function AdminStudioPreviewPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // A non-uuid id would make Postgres raise (22P02) instead of matching nothing.
  if (!UUID_RE.test(id)) notFound();

  const result = await getPreviewWithFeedback(id);
  if (!result) notFound();

  const { preview, items } = result;
  const expired = isPreviewExpired(preview.expiresAt, Date.now());

  return (
    <div className="max-w-[880px] space-y-6">
      <Link
        href="/admin/studio/previews"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft size={15} aria-hidden /> All previews
      </Link>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
            {preview.title || preview.slug}
          </h1>
          <PreviewLiveChip expired={expired} />
        </div>
        <p className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[13px] text-fg-tertiary">
          <span className="font-mono">{preview.slug}</span>
          <span>
            {preview.expiresAt
              ? `${expired ? 'Expired' : 'Expires'} ${formatPreviewDate(preview.expiresAt)}`
              : 'No expiry'}
          </span>
        </p>
      </div>

      <AdminPreviewFeedback preview={preview} items={items} />
    </div>
  );
}
