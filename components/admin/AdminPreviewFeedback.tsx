'use client';

// Feedback triage for one client preview: the feedback-widget switch, kind +
// status filters, copy-as-markdown, and per-item status selects. Both writes are
// optimistic and revert (with an inline error) when the server action throws.
// Reviewer text is rendered as plain React text only — never injected as raw HTML.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABEL,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  filterFeedback,
  groupFeedbackByPage,
  shortFeedbackId,
  toMarkdownChecklist,
  type FeedbackFilter,
  type FeedbackStatus,
  type PreviewFeedbackItem,
} from '@/lib/previews/feedback';
import { setFeedbackStatus, setPreviewFeedbackEnabled } from '@/lib/previews/admin-actions';
import type { AdminPreviewSummary } from '@/lib/previews/admin-queries';
import { formatPreviewDate } from '@/components/admin/AdminPreviewsList';

const SAVE_ERROR = "Couldn't save. Try again.";
const COPIED_MS = 2000;
const DEFAULT_FILTER: FeedbackFilter = { kind: 'all', status: 'open' };
const SHOW_ALL_FILTER: FeedbackFilter = { kind: 'all', status: 'all' };

const KIND_OPTIONS: { value: FeedbackFilter['kind']; label: string }[] = [
  { value: 'all', label: 'All' },
  ...FEEDBACK_KINDS.map((k) => ({ value: k, label: FEEDBACK_KIND_LABEL[k] })),
];

const STATUS_OPTIONS: { value: FeedbackFilter['status']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'all', label: 'All' },
  ...FEEDBACK_STATUSES.map((s) => ({ value: s, label: FEEDBACK_STATUS_LABEL[s] })),
];

const selectCls =
  'min-h-[44px] rounded-[10px] border border-border-default bg-bg-primary px-3 text-base text-fg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40';
const buttonCls =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] border border-border-default bg-bg-secondary text-[13px] font-semibold text-fg-secondary hover:border-border-hover hover:text-fg-primary transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40';
// House error style (AdminStudioLeadForm): coral-tinted box, readable fg text.
const errorCls =
  'rounded-lg border border-accent-coral/40 bg-accent-coral-subtle px-3 py-1.5 text-[13px] text-fg-secondary';

type Props = {
  preview: AdminPreviewSummary;
  items: PreviewFeedbackItem[];
};

export function AdminPreviewFeedback({ preview, items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<FeedbackFilter>(DEFAULT_FILTER);
  const [itemErrors, setItemErrors] = useState<Record<string, boolean>>({});

  const [enabled, setEnabled] = useState(preview.feedbackEnabled);
  const [toggleError, setToggleError] = useState(false);

  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  const title = preview.title || preview.slug;
  const filtered = filterFeedback(items, filter);
  const groups = groupFeedbackByPage(filtered);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  // Layout effect: select in the same commit that shows the textarea, so the
  // text is already highlighted when it appears.
  useLayoutEffect(() => {
    if (fallbackText === null || !fallbackRef.current) return;
    fallbackRef.current.focus();
    fallbackRef.current.select();
  }, [fallbackText]);

  // Feedback only works on gated previews (injection + the route require it);
  // turning it off stays possible so a stale "on" can still be cleared.
  const isPublic = preview.mode === 'public';
  const toggleDisabled = isPublic && !enabled;

  // Reverts only undo their own change: if a newer change has landed since,
  // the current value no longer equals what this call set, so it is left alone.
  async function toggleEnabled() {
    if (toggleDisabled) return;
    const previous = enabled;
    const next = !previous;
    setEnabled(next);
    setToggleError(false);
    try {
      await setPreviewFeedbackEnabled(preview.id, next);
    } catch {
      setEnabled((cur) => (cur === next ? previous : cur));
      setToggleError(true);
    }
  }

  async function changeStatus(item: PreviewFeedbackItem, status: FeedbackStatus) {
    const { id } = item;
    const previous = item.status;
    if (status === previous) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    setItemErrors((prev) => ({ ...prev, [id]: false }));
    try {
      await setFeedbackStatus(id, status);
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === id && i.status === status ? { ...i, status: previous } : i)),
      );
      setItemErrors((prev) => ({ ...prev, [id]: true }));
    }
  }

  async function copyMarkdown() {
    const markdown = toMarkdownChecklist(title, filtered);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(markdown);
      setFallbackText(null);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
      setFallbackText(markdown);
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback widget switch */}
      <div className="flex items-center gap-3 flex-wrap rounded-[14px] border border-border-default bg-bg-secondary px-4 py-3">
        <span id="feedback-widget-label" className="text-[14px] font-semibold text-fg-primary">
          Feedback widget
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="feedback-widget-label"
          aria-describedby={isPublic ? 'feedback-widget-public-note' : undefined}
          disabled={toggleDisabled}
          onClick={toggleEnabled}
          className="inline-flex items-center min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            aria-hidden
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-[var(--duration-fast)]',
              enabled ? 'bg-accent-teal' : 'bg-bg-tertiary border border-border-default',
            )}
          >
            <span
              className={cn(
                'inline-block size-4 rounded-full bg-fg-primary transition-transform duration-[var(--duration-fast)] motion-reduce:transition-none',
                enabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </span>
        </button>
        {isPublic ? (
          <span id="feedback-widget-public-note" className="text-[13px] text-fg-tertiary">
            Feedback works on password-protected previews only.
          </span>
        ) : (
          <span className="text-[13px] text-fg-tertiary">
            {enabled ? 'On — reviewers can leave notes' : 'Off — the preview serves without the widget'}
          </span>
        )}
        {toggleError && (
          <p role="alert" className={errorCls}>
            {SAVE_ERROR}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">No feedback yet.</p>
        </div>
      ) : (
        <>
          {/* Filters + export */}
          <div className="flex items-end gap-3 flex-wrap">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-fg-tertiary">
              Kind
              <select
                aria-label="Filter by kind"
                className={selectCls}
                value={filter.kind}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, kind: e.target.value as FeedbackFilter['kind'] }))
                }
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-fg-tertiary">
              Status
              <select
                aria-label="Filter by status"
                className={selectCls}
                value={filter.status}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, status: e.target.value as FeedbackFilter['status'] }))
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {filtered.length > 0 && (
              <div className="flex items-center gap-3">
                <button type="button" className={buttonCls} onClick={copyMarkdown}>
                  Copy as markdown
                </button>
                {copied && (
                  <span role="status" className="text-[13px] font-semibold text-accent-teal">
                    Copied
                  </span>
                )}
              </div>
            )}
          </div>

          {fallbackText !== null && (
            <div className="space-y-1">
              <p className="text-[12.5px] text-fg-tertiary">
                Couldn&apos;t reach the clipboard — the markdown is selected below; copy it manually.
              </p>
              <textarea
                ref={fallbackRef}
                readOnly
                aria-label="Markdown to copy"
                value={fallbackText}
                rows={8}
                className="w-full rounded-[10px] border border-border-default bg-bg-primary p-3 font-mono text-base text-fg-primary"
              />
            </div>
          )}

          {groups.length === 0 ? (
            <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center space-y-3">
              <p className="text-sm text-fg-tertiary">No feedback matches these filters.</p>
              <button type="button" className={buttonCls} onClick={() => setFilter(SHOW_ALL_FILTER)}>
                Show all
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group, gi) => {
                const headingId = `preview-feedback-page-${gi}`;
                return (
                  <section key={group.page} aria-labelledby={headingId} className="space-y-3">
                    <h3
                      id={headingId}
                      className="font-mono text-[13px] text-fg-secondary break-all"
                    >
                      {group.page}
                    </h3>
                    <ul className="space-y-3">
                      {group.items.map((item) => (
                        <FeedbackItemCard
                          key={item.id}
                          item={item}
                          error={itemErrors[item.id] === true}
                          onStatusChange={(s) => changeStatus(item, s)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FeedbackItemCard({
  item,
  error,
  onStatusChange,
}: {
  item: PreviewFeedbackItem;
  error: boolean;
  onStatusChange: (status: FeedbackStatus) => void;
}) {
  const shortId = shortFeedbackId(item.id);
  const viewport =
    item.viewportW !== null && item.viewportH !== null ? `${item.viewportW}×${item.viewportH}` : null;
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = `/api/admin/preview-feedback/${item.id}/image`;
  const meta = [viewport, item.userAgent].filter((v): v is string => Boolean(v)).join(' · ');

  return (
    <li className="rounded-[14px] border border-border-default bg-bg-secondary p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[12.5px]">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold',
              item.kind === 'bug'
                ? 'bg-accent-coral-subtle text-fg-primary'
                : 'bg-accent-teal/10 text-accent-teal',
            )}
          >
            {FEEDBACK_KIND_LABEL[item.kind]}
          </span>
          <span className="font-semibold text-fg-primary">{item.reviewerName}</span>
          <span className="text-fg-tertiary">{formatPreviewDate(item.createdAt)}</span>
          <span className="font-mono text-fg-tertiary">{shortId}</span>
        </div>
        <select
          aria-label={`Status for ${shortId}`}
          className={selectCls}
          value={item.status}
          onChange={(e) => onStatusChange(e.target.value as FeedbackStatus)}
        >
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FEEDBACK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <p className="whitespace-pre-wrap break-words text-[14px] text-fg-primary">{item.message}</p>
      {item.hasImage &&
        (imageFailed ? (
          <p className="text-[12.5px] text-fg-tertiary">Screenshot unavailable</p>
        ) : (
          <a
            href={`${imageUrl}?v=full`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open screenshot in a new tab"
            className="inline-flex min-h-[44px] min-w-[44px] rounded-[10px] border border-border-default bg-bg-primary p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40"
          >
            {/* Deliberate exception to the next/image rule: the screenshot is private
                (admin signer route, 302 to a short-lived URL), so it must not go
                through the image optimizer's shared cache. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${imageUrl}?v=thumb`}
              width={120}
              height={90}
              loading="lazy"
              alt="Screenshot"
              className="h-[90px] w-[120px] object-contain"
              onError={() => setImageFailed(true)}
            />
          </a>
        ))}
      {meta && <p className="text-[12px] text-fg-tertiary break-all">{meta}</p>}
      {error && (
        <p role="alert" className={errorCls}>
          {SAVE_ERROR}
        </p>
      )}
    </li>
  );
}
