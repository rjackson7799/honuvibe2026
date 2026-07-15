'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VaultRelatedPicker } from '../VaultRelatedPicker';
import { updateVaultItem } from '@/lib/vault/actions';
import { SectionCard } from '@/components/admin/editor-shell/section-card';
import { labelClass, selectClass, textareaClass } from '@/components/admin/editor-shell/field-classes';
import type {
  VaultContentItem,
  VaultDownload,
  VaultFreshnessStatus,
} from '@/lib/vault/types';
import { DownloadsPanel } from './downloads-panel';

const FRESHNESS_STATUSES: VaultFreshnessStatus[] = [
  'current',
  'review_needed',
  'outdated',
];

type PartnerOpt = {
  id: string;
  slug: string;
  name_en: string;
  logo_url: string | null;
  revenue_share_pct: number;
};

type RelationsPublishSectionProps = {
  item: VaultContentItem | null;
  seriesOptions: { id: string; title: string; partner_id: string | null }[];
  seriesId: string;
  setSeriesId: (v: string) => void;
  seriesOrder: number;
  setSeriesOrder: (v: number) => void;
  courseOptions: { id: string; title: string }[];
  relatedCourseId: string;
  setRelatedCourseId: (v: string) => void;
  allItems: { id: string; title_en: string; title_jp: string | null; content_type: string }[];
  relatedItemIds: string[];
  setRelatedItemIds: (ids: string[]) => void;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  partners: PartnerOpt[];
  partnerId: string | null;
  setPartnerId: (v: string | null) => void;
  freshnessStatus: VaultFreshnessStatus;
  setFreshnessStatus: (v: VaultFreshnessStatus) => void;
  downloads: VaultDownload[];
  actionLoading: boolean;
  onPublishToggle: () => void;
  onDelete: () => void;
};

export function RelationsPublishSection({
  item,
  seriesOptions,
  seriesId,
  setSeriesId,
  seriesOrder,
  setSeriesOrder,
  courseOptions,
  relatedCourseId,
  setRelatedCourseId,
  allItems,
  relatedItemIds,
  setRelatedItemIds,
  adminNotes,
  setAdminNotes,
  partners,
  partnerId,
  setPartnerId,
  freshnessStatus,
  setFreshnessStatus,
  downloads,
  actionLoading,
  onPublishToggle,
  onDelete,
}: RelationsPublishSectionProps) {
  const router = useRouter();
  const isCreate = item === null;
  const [savingPartner, setSavingPartner] = useState(false);

  const selectedPartner = partners.find((p) => p.id === partnerId) ?? null;
  const showRevShareWarning = selectedPartner
    ? selectedPartner.revenue_share_pct > 0
    : false;

  return (
    <SectionCard id="relations-publish" number={5} title="Relations &amp; publish">
      {/* Series + Related course */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Series</label>
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {seriesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Related Course</label>
          <select
            value={relatedCourseId}
            onChange={(e) => setRelatedCourseId(e.target.value)}
            className={selectClass}
          >
            <option value="">None</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Series Order (visible only when series selected) */}
      {seriesId && (
        <div>
          <label className={labelClass}>Series Order</label>
          <input
            type="number"
            value={seriesOrder || ''}
            onChange={(e) => setSeriesOrder(parseInt(e.target.value) || 0)}
            min={0}
            className={`${selectClass} max-w-xs`}
          />
        </div>
      )}

      {/* Related Items Picker */}
      <VaultRelatedPicker
        selectedIds={relatedItemIds}
        onChange={setRelatedItemIds}
        allItems={allItems}
        currentItemId={item?.id}
      />

      {/* Partner (owner) */}
      <div className="space-y-2">
        <label className={labelClass}>Partner (owner)</label>
        <select
          value={partnerId ?? ''}
          onChange={(e) => setPartnerId(e.target.value || null)}
          className={`${selectClass} max-w-md`}
        >
          <option value="">— HonuVibe (default) —</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_en}
              {p.revenue_share_pct > 0 ? ` (${p.revenue_share_pct}% rev-share)` : ''}
            </option>
          ))}
        </select>
        {showRevShareWarning && (
          <div className="max-w-md rounded-md border border-accent-gold/40 bg-accent-gold/10 px-3 py-2 text-xs text-accent-gold">
            <strong>Rev-share warning:</strong> {selectedPartner!.name_en} has a{' '}
            {selectedPartner!.revenue_share_pct}% revenue share. Tagging this
            Vault item as partner-owned will route share dollars to them via the
            INS-3 ledger if the item drives revenue in the future. Confirm this
            is intended.
          </div>
        )}
        {!isCreate && (
          <button
            type="button"
            disabled={savingPartner || partnerId === (item.partner_id ?? null)}
            onClick={async () => {
              setSavingPartner(true);
              try {
                await updateVaultItem(item.id, { partner_id: partnerId });
                router.refresh();
              } finally {
                setSavingPartner(false);
              }
            }}
            className="rounded-md bg-accent-teal px-3 py-1.5 text-xs font-medium text-bg-primary disabled:opacity-50"
          >
            {savingPartner ? 'Saving...' : 'Save partner'}
          </button>
        )}
      </div>

      {/* Admin Notes */}
      <div>
        <label className={labelClass}>Admin Notes</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes about this content..."
          className={textareaClass}
        />
      </div>

      {/* Freshness (edit mode only) */}
      {!isCreate && (
        <div className="grid grid-cols-1 gap-4 border-t border-border-default pt-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Freshness Status</label>
            <select
              value={freshnessStatus}
              onChange={(e) =>
                setFreshnessStatus(e.target.value as VaultFreshnessStatus)
              }
              className={selectClass}
            >
              {FRESHNESS_STATUSES.map((fs) => (
                <option key={fs} value={fs}>
                  {fs.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Last Reviewed</label>
            <p className="px-3 py-2 text-sm text-fg-secondary">
              {item.freshness_reviewed_at
                ? new Date(item.freshness_reviewed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Never'}
            </p>
          </div>
        </div>
      )}

      {/* Downloads */}
      <div className="border-t border-border-default pt-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
          Downloads
        </h3>
        {isCreate ? (
          <p className="text-sm text-fg-tertiary">
            Save the content first, then upload downloadable files.
          </p>
        ) : (
          <DownloadsPanel itemId={item.id} downloads={downloads} />
        )}
      </div>

      {/* Publish + danger zone (edit mode only) */}
      {!isCreate && (
        <div className="space-y-3 border-t border-border-default pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
                Publish
              </h3>
              <p className="mt-1 text-xs text-fg-tertiary">
                Publishing runs a per-type validation gate (title, slug, and the
                type&apos;s primary content — plus downloads for templates and
                prompts for prompt packs).
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPublishToggle}
              disabled={actionLoading}
            >
              {item.is_published ? (
                <>
                  <EyeOff size={16} className="mr-1.5" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-1.5" />
                  Publish
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
            <p className="text-xs text-fg-tertiary">
              Deleting removes this content and its attachments permanently.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={onDelete}
              disabled={actionLoading}
            >
              <Trash2 size={16} className="mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
