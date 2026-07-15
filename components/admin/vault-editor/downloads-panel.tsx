'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadVaultDownload, deleteVaultDownload } from '@/lib/vault/actions';
import { labelClass } from '@/components/admin/editor-shell/field-classes';
import type { VaultAccessTier, VaultDownload } from '@/lib/vault/types';

const ACCESS_TIERS: VaultAccessTier[] = ['free', 'premium'];

// Inputs sit on the bg-tertiary panel, so they use bg-secondary (inverted
// from the rest of the form) — carried over from the previous editor.
const panelInputClass =
  'w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal';

type DownloadsPanelProps = {
  itemId: string;
  downloads: VaultDownload[];
};

/**
 * Self-contained downloads manager (edit mode only — uploads need an
 * existing content_item_id). Files go to the vault-private bucket.
 */
export function DownloadsPanel({ itemId, downloads }: DownloadsPanelProps) {
  const router = useRouter();
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [dlFile, setDlFile] = useState<File | null>(null);
  const [dlDescriptionEn, setDlDescriptionEn] = useState('');
  const [dlDescriptionJp, setDlDescriptionJp] = useState('');
  const [dlAccessTier, setDlAccessTier] = useState<VaultAccessTier>('free');
  const [dlDisplayOrder, setDlDisplayOrder] = useState(0);
  const [dlSaving, setDlSaving] = useState(false);
  const [dlError, setDlError] = useState('');

  async function handleAddDownload() {
    if (!dlFile) return;
    setDlSaving(true);
    setDlError('');
    try {
      const fd = new FormData();
      fd.set('content_item_id', itemId);
      fd.set('file', dlFile);
      if (dlDescriptionEn.trim()) fd.set('description_en', dlDescriptionEn.trim());
      if (dlDescriptionJp.trim()) fd.set('description_jp', dlDescriptionJp.trim());
      fd.set('access_tier', dlAccessTier);
      fd.set('display_order', String(dlDisplayOrder));

      await uploadVaultDownload(fd);

      // Reset form
      setDlFile(null);
      setDlDescriptionEn('');
      setDlDescriptionJp('');
      setDlAccessTier('free');
      setDlDisplayOrder(0);
      setShowDownloadForm(false);
      router.refresh();
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setDlSaving(false);
    }
  }

  async function handleDeleteDownload(downloadId: string) {
    if (!confirm('Delete this download?')) return;
    try {
      await deleteVaultDownload(downloadId);
      router.refresh();
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Failed to delete download');
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing downloads */}
      {downloads.length > 0 ? (
        <div className="space-y-2">
          {downloads.map((dl) => (
            <div
              key={dl.id}
              className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-bg-secondary">
                  <Download size={14} className="text-fg-tertiary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg-primary">{dl.file_name}</p>
                  <p className="text-xs text-fg-tertiary">
                    {dl.file_type.toUpperCase()}
                    {dl.file_size_bytes
                      ? ` · ${
                          dl.file_size_bytes < 1024 * 1024
                            ? `${(dl.file_size_bytes / 1024).toFixed(0)} KB`
                            : `${(dl.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                        }`
                      : ''}
                    {' · '}
                    {dl.access_tier}
                    {' · Order: '}
                    {dl.display_order}
                    {dl.download_count > 0 && ` · ${dl.download_count} downloads`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteDownload(dl.id)}
                className="shrink-0 rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-fg-tertiary">No downloads attached.</p>
      )}

      {/* Add download toggle */}
      {!showDownloadForm ? (
        <button
          type="button"
          onClick={() => setShowDownloadForm(true)}
          className="flex items-center gap-1.5 text-sm text-accent-teal transition-colors hover:text-accent-teal/80"
        >
          <Plus size={14} />
          Add Download
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border-default bg-bg-tertiary p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-fg-primary">New Download</h4>
            <button
              type="button"
              onClick={() => setShowDownloadForm(false)}
              className="text-fg-tertiary transition-colors hover:text-fg-primary"
            >
              <X size={14} />
            </button>
          </div>

          <div>
            <label className={labelClass}>File *</label>
            <input
              type="file"
              accept=".pdf,.zip,.xlsx,.docx,.csv,.json,.md,.txt"
              onChange={(e) => setDlFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-fg-primary file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-bg-secondary file:px-3 file:py-2 file:text-sm file:text-fg-primary hover:file:bg-bg-secondary/80"
            />
            {dlFile && (
              <p className="mt-1 text-xs text-fg-tertiary">
                {dlFile.name} · {(dlFile.size / 1024).toFixed(0)} KB
              </p>
            )}
            <p className="mt-1 text-xs text-fg-tertiary">
              Uploads to <code>vault-private/downloads/{itemId}/…</code>. Max
              50&nbsp;MB. Allowed: pdf, zip, xlsx, docx, csv, json, md, txt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Access Tier</label>
              <select
                value={dlAccessTier}
                onChange={(e) => setDlAccessTier(e.target.value as VaultAccessTier)}
                className={panelInputClass}
              >
                {ACCESS_TIERS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Display Order</label>
              <input
                type="number"
                value={dlDisplayOrder || ''}
                onChange={(e) => setDlDisplayOrder(parseInt(e.target.value) || 0)}
                min={0}
                className={panelInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Description (EN)</label>
              <input
                type="text"
                value={dlDescriptionEn}
                onChange={(e) => setDlDescriptionEn(e.target.value)}
                placeholder="Quick reference guide"
                className={panelInputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description (JP)</label>
              <input
                type="text"
                value={dlDescriptionJp}
                onChange={(e) => setDlDescriptionJp(e.target.value)}
                placeholder="クイックリファレンス"
                className={panelInputClass}
              />
            </div>
          </div>

          {dlError && <p className="text-xs text-accent-coral">{dlError}</p>}

          <Button
            variant="primary"
            size="sm"
            onClick={handleAddDownload}
            disabled={dlSaving || !dlFile}
          >
            <Plus size={14} className="mr-1" />
            {dlSaving ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      )}
      {/* Deletion errors surface here (the panel owns its own error state). */}
      {!showDownloadForm && dlError && (
        <p className="text-xs text-accent-coral">{dlError}</p>
      )}
    </div>
  );
}
