import { z } from 'zod';

// Pure helpers for client-preview feedback: validation, filtering, grouping and
// the markdown export. Do NOT add 'use server' / 'server-only' / Supabase
// imports here — unit tests and the widget renderer import this module directly
// (same stance as gate.ts).

export const FEEDBACK_KINDS = ['bug', 'improvement'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug fix',
  improvement: 'Improvement',
};

export const FEEDBACK_STATUSES = ['new', 'planned', 'done', 'wont_do'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: 'New',
  planned: 'Planned',
  done: 'Done',
  wont_do: "Won't do",
};

export const FEEDBACK_LIMITS = {
  name: 80,
  message: 4000,
  page: 300,
  userAgent: 500,
  bodyBytes: 16_384,
  // multipart (note + one screenshot) body cap; JSON keeps bodyBytes.
  multipartBodyBytes: 2_097_152,
} as const;

// Image-processing constants live in image-process.ts (SCREENSHOT_LIMITS).

export const PREVIEW_FEEDBACK_IMAGE_BUCKET = 'preview-feedback-images';

/** Object paths for a note's screenshot: <preview_id>/<submission_id>.jpg and .thumb.jpg. */
export function feedbackImagePaths(previewId: string, submissionId: string): { full: string; thumb: string } {
  return { full: `${previewId}/${submissionId}.jpg`, thumb: `${previewId}/${submissionId}.thumb.jpg` };
}

/** Thumb path for a stored full-image path (replaces the trailing .jpg). */
export function thumbPathFor(imagePath: string): string {
  return imagePath.replace(/\.jpg$/, '.thumb.jpg');
}

export type FeedbackInput = {
  name: string;
  kind: FeedbackKind;
  message: string;
  page: string;
  viewportW: number | null;
  viewportH: number | null;
  /** Client-generated idempotency key (lower-case uuid); becomes the row id. */
  submissionId: string | null;
};

const VIEWPORT_MAX = 20_000;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Message keeps tab / LF / CR; Postgres text cannot hold NUL (would 500).
const MESSAGE_CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

// Over-length is REJECTED, never truncated: the widget enforces maxlength, so
// over-length input means a bypassed client.
const feedbackSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(FEEDBACK_LIMITS.name, `Name must be ${FEEDBACK_LIMITS.name} characters or fewer`)
    .refine((n) => !CONTROL_CHARS.test(n), 'Name contains invalid characters'),
  kind: z.enum(FEEDBACK_KINDS, { error: 'Pick Bug fix or Improvement' }),
  message: z
    .string({ error: 'Message is required' })
    .trim()
    .min(1, 'Message is required')
    .max(FEEDBACK_LIMITS.message, `Message must be ${FEEDBACK_LIMITS.message} characters or fewer`)
    .refine((m) => !MESSAGE_CONTROL_CHARS.test(m), 'Message contains invalid characters'),
  page: z
    .string({ error: 'Page is required' })
    .trim()
    .min(1, 'Page is required')
    .max(FEEDBACK_LIMITS.page, `Page must be ${FEEDBACK_LIMITS.page} characters or fewer`)
    .refine((p) => !CONTROL_CHARS.test(p), 'Page contains invalid characters'),
  submissionId: z.uuid({ error: 'Invalid submissionId' }).optional(),
});

function viewportOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= VIEWPORT_MAX ? v : null;
}

export function parseFeedbackInput(
  raw: unknown,
): { ok: true; value: FeedbackInput } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid feedback' };
  }
  const obj = raw as Record<string, unknown>;
  const parsed = feedbackSchema.safeParse({
    name: obj.name,
    kind: obj.kind,
    message: obj.message,
    page: obj.page,
    submissionId: obj.submissionId === undefined || obj.submissionId === null ? undefined : obj.submissionId,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid feedback' };
  }
  return {
    ok: true,
    value: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      message: parsed.data.message,
      page: parsed.data.page,
      submissionId: parsed.data.submissionId ? parsed.data.submissionId.toLowerCase() : null,
      viewportW: viewportOrNull(obj.viewportW),
      viewportH: viewportOrNull(obj.viewportH),
    },
  };
}

export type PreviewFeedbackItem = {
  id: string;
  createdAt: string;
  page: string;
  reviewerName: string;
  kind: FeedbackKind;
  message: string;
  viewportW: number | null;
  viewportH: number | null;
  userAgent: string | null;
  status: FeedbackStatus;
};

/** `status: 'open'` = new + planned. */
export type FeedbackFilter = { kind: FeedbackKind | 'all'; status: FeedbackStatus | 'open' | 'all' };

export function filterFeedback(items: PreviewFeedbackItem[], f: FeedbackFilter): PreviewFeedbackItem[] {
  return items.filter((i) => {
    if (f.kind !== 'all' && i.kind !== f.kind) return false;
    if (f.status === 'all') return true;
    if (f.status === 'open') return i.status === 'new' || i.status === 'planned';
    return i.status === f.status;
  });
}

function time(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * Groups by page. Groups are ordered by each group's newest item (newest
 * first); items inside a group are oldest first so a page's notes read in order.
 */
export function groupFeedbackByPage(
  items: PreviewFeedbackItem[],
): { page: string; items: PreviewFeedbackItem[] }[] {
  const byPage = new Map<string, PreviewFeedbackItem[]>();
  for (const item of items) {
    const list = byPage.get(item.page);
    if (list) list.push(item);
    else byPage.set(item.page, [item]);
  }
  const groups = [...byPage.entries()].map(([page, list]) => ({
    page,
    items: [...list].sort((a, b) => time(a.createdAt) - time(b.createdAt)),
  }));
  const newest = (g: { items: PreviewFeedbackItem[] }) => time(g.items[g.items.length - 1].createdAt);
  return groups.sort((a, b) => newest(b) - newest(a));
}

/** First 8 hex chars of the uuid — maps an exported task back to its row. */
export function shortFeedbackId(id: string): string {
  return id.slice(0, 8);
}

/** Backslash-escapes characters that could create formatting, links, headings or HTML. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>#|]/g, '\\$&');
}

function utcDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function toMarkdownChecklist(previewTitle: string, items: PreviewFeedbackItem[]): string {
  const lines: string[] = [`# ${previewTitle} — feedback`, ''];
  for (const group of groupFeedbackByPage(items)) {
    lines.push(`## ${escapeMarkdown(group.page)}`);
    for (const i of group.items) {
      const box = i.status === 'done' ? '[x]' : '[ ]';
      const message = escapeMarkdown(i.message).replace(/\r\n|\r|\n/g, '\n  ');
      const suffix = i.status === 'new' ? '' : ` (${FEEDBACK_STATUS_LABEL[i.status]})`;
      lines.push(
        `- ${box} **${FEEDBACK_KIND_LABEL[i.kind]}** — ${message} — _${escapeMarkdown(i.reviewerName)}, ${utcDate(i.createdAt)}_ · \`${shortFeedbackId(i.id)}\`${suffix}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
