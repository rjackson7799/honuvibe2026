import type { Category } from './constants';

export interface CommunityScope {
  partnerId: string | null;
  partner: {
    id: string;
    slug: string;
    name_en: string;
    primary_color: string | null;
    line_url: string | null;
  } | null;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
}

export interface AuthorBrief {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export type ContentStatus = 'published' | 'hidden' | 'deleted';

export interface Post {
  id: string;
  partner_id: string | null;
  author_id: string;
  category: Category;
  body_md: string;
  link_preview: LinkPreview | null;
  status: ContentStatus;
  pinned_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: AuthorBrief | null;
  liked_by_me?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  partner_id: string | null;
  author_id: string;
  body_md: string;
  parent_comment_id: string | null;
  status: ContentStatus;
  created_at: string;
  author?: AuthorBrief | null;
}

export type ReportReason = 'spam' | 'harassment' | 'off_topic' | 'other' | 'auto_flag';

export interface Report {
  id: string;
  partner_id: string | null;
  target_type: 'post' | 'comment';
  target_id: string;
  reporter_id: string;
  reason: ReportReason;
  note: string | null;
  status: 'open' | 'resolved';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Ban {
  partner_id: string | null;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
}

export type ModAction =
  | 'pin'
  | 'unpin'
  | 'hide'
  | 'unhide'
  | 'delete'
  | 'resolve_report'
  | 'ban'
  | 'unban';
