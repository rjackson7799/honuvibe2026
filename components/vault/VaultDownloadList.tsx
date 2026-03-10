'use client';

import { Download } from 'lucide-react';
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

function trackDownload(downloadId: string) {
  fetch(`/api/vault/downloads/${downloadId}`, { method: 'POST' }).catch(() => {});
  trackEvent('vault_download');
}

export function VaultDownloadList({ downloads }: VaultDownloadListProps) {
  return (
    <div className="space-y-2">
      {downloads.map((dl) => (
        <a
          key={dl.id}
          href={dl.file_url}
          download={dl.file_name}
          onClick={() => trackDownload(dl.id)}
          className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover transition-colors group"
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
                {dl.download_count > 0 && ` \u00b7 ${dl.download_count} downloads`}
              </p>
            </div>
          </div>
          <Download size={16} className="shrink-0 text-fg-tertiary group-hover:text-accent-teal transition-colors ml-3" />
        </a>
      ))}
    </div>
  );
}
