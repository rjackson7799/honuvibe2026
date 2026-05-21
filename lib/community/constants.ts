export const CATEGORIES = ['general', 'show_and_tell', 'help', 'wins', 'announcements'] as const;
export type Category = (typeof CATEGORIES)[number];

export const MAX_POST_BODY_LEN = 10_000;
export const MAX_COMMENT_LEN = 4_000;
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const RATE_LIMITS = {
  reports: { limit: 5, windowMs: 60 * 60 * 1000 },
  linkPreview: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;
