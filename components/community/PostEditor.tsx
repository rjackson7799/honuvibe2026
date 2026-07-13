'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MAX_POST_BODY_LEN } from '@/lib/community/constants';

export function PostEditor({
  postId,
  initialBody,
}: {
  postId: string;
  initialBody: string;
}) {
  const t = useTranslations('community');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeEditor() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function save() {
    if (body.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_md: body }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          json.error === 'edit_window_expired' ? t('error_edit_window') : t('error_generic'),
        );
        setBusy(false);
        return;
      }
      setBusy(false);
      closeEditor();
      router.refresh();
    } catch {
      setError(t('error_network'));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_POST_BODY_LEN}
        rows={8}
        className="w-full resize-y min-h-[160px] p-3 rounded-[10px] bg-bg-primary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-teal)] text-[14px] leading-relaxed"
      />
      {error && (
        <p className="text-[12px] text-[color:var(--accent-coral,#dc2626)]">{error}</p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={closeEditor}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full text-[13px] font-semibold bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] transition-colors"
        >
          {t('edit_cancel')}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || body.trim().length === 0}
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full text-[13px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] transition-colors"
        >
          {busy ? '…' : t('edit_save')}
        </button>
      </div>
    </div>
  );
}
