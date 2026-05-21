'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { CATEGORIES, type Category, MAX_POST_BODY_LEN } from '@/lib/community/constants';
import type { LinkPreview } from '@/lib/community/types';
import { trackCommunityPostCreated } from '@/lib/analytics';

const URL_RE = /(https?:\/\/[^\s)]+)/i;

export function PostComposer({ partnerScope }: { partnerScope: string }) {
  const t = useTranslations('community');
  const router = useRouter();

  const [category, setCategory] = useState<Category>('general');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedUrl = useRef<string | null>(null);

  // Debounced link-preview fetch
  useEffect(() => {
    if (previewDismissed) return;
    const match = body.match(URL_RE);
    const url = match?.[1] ?? null;
    if (!url) {
      lastFetchedUrl.current = null;
      setPreview(null);
      return;
    }
    if (url === lastFetchedUrl.current) return;

    const t = setTimeout(async () => {
      lastFetchedUrl.current = url;
      try {
        const res = await fetch('/api/community/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const json = (await res.json()) as { preview: LinkPreview | null };
          setPreview(json.preview);
        }
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(t);
  }, [body, previewDismissed]);

  const canSubmit = body.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          body_md: body,
          link_preview: previewDismissed ? null : preview,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? 'error');
        setSubmitting(false);
        return;
      }
      trackCommunityPostCreated({
        partner_scope: partnerScope,
        category,
        body_length: body.length,
        has_link_preview: !!(preview && !previewDismissed),
      });
      setBody('');
      setPreview(null);
      setPreviewDismissed(false);
      setCategory('general');
      router.refresh();
    } catch {
      setError('network');
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border-default p-4 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="text-[13px] font-semibold bg-bg-tertiary border border-border-default rounded-full px-3 py-1.5 text-fg-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-teal)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`category_${c}`)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('composer_placeholder')}
        maxLength={MAX_POST_BODY_LEN}
        className="w-full resize-y min-h-[120px] p-3 rounded-[10px] bg-bg-primary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-teal)] text-[14.5px] leading-relaxed"
      />
      {preview && !previewDismissed && (
        <div className="relative rounded-[10px] border border-border-default overflow-hidden flex">
          {preview.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.image} alt="" className="w-20 h-20 object-cover bg-bg-tertiary shrink-0" />
          )}
          <div className="p-3 min-w-0 flex-1">
            <p className="text-[11px] text-fg-tertiary truncate">{preview.site}</p>
            <p className="text-[13px] font-semibold text-fg-primary truncate">{preview.title}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setPreviewDismissed(true);
            }}
            className="p-2 self-start text-fg-tertiary hover:text-fg-primary transition-colors"
            aria-label="Remove link preview"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <p className="text-[12.5px] text-[color:var(--accent-coral,#dc2626)]">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-fg-tertiary">{t('composer_hint')}</p>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
        >
          {submitting ? '…' : t('composer_submit')}
        </button>
      </div>
    </div>
  );
}
