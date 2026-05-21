'use client';

import { useState } from 'react';
import { Download, Loader2, Lock } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import type { VaultDownload } from '@/lib/vault/types';

type VaultDownloadListProps = {
  downloads: VaultDownload[];
};

const fileTypeIcons: Record<string, string> = {
  pdf: 'PDF',
  zip: 'ZIP',
  xlsx: 'XLSX',
  docx: 'DOCX',
  csv: 'CSV',
  json: 'JSON',
  md: 'MD',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VaultDownloadList({ downloads }: VaultDownloadListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [paywallId, setPaywallId] = useState<string | null>(null);

  async function handleDownload(downloadId: string, fileName: string) {
    if (pendingId) return;
    setPendingId(downloadId);
    setPaywallId(null);
    try {
      const res = await fetch(`/api/vault/downloads/${downloadId}`, { method: 'POST' });
      if (res.status === 403) {
        setPaywallId(downloadId);
        return;
      }
      if (!res.ok) {
        console.error('Download failed:', await res.text());
        return;
      }
      const { url } = (await res.json()) as { url: string };
      trackEvent('vault_download');

      // Trigger the download via a temporary anchor so the browser respects
      // the suggested filename when the storage URL doesn't carry one.
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {downloads.map((dl) => {
        const isPending = pendingId === dl.id;
        const showPaywall = paywallId === dl.id;
        return (
          <button
            key={dl.id}
            type="button"
            onClick={() => handleDownload(dl.id, dl.file_name)}
            disabled={isPending}
            className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-colors group disabled:opacity-60 disabled:cursor-wait"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center">
                <span className="text-xs font-mono font-medium text-fg-tertiary uppercase">
                  {fileTypeIcons[dl.file_type] ?? dl.file_type}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-primary truncate group-hover:text-accent-teal transition-colors">
                  {dl.file_name}
                </p>
                <p className="text-xs text-fg-tertiary">
                  {formatFileSize(dl.file_size_bytes)}
                  {dl.download_count > 0 && ` · ${dl.download_count} downloads`}
                  {showPaywall && ' · Premium — subscribe to download'}
                </p>
              </div>
            </div>
            {showPaywall ? (
              <Lock size={16} className="shrink-0 text-accent-coral ml-3" />
            ) : isPending ? (
              <Loader2 size={16} className="shrink-0 text-fg-tertiary animate-spin ml-3" />
            ) : (
              <Download size={16} className="shrink-0 text-fg-tertiary group-hover:text-accent-teal transition-colors ml-3" />
            )}
          </button>
        );
      })}
    </div>
  );
}
