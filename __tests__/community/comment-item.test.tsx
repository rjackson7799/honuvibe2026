import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import en from '@/messages/en.json';
import { CommentItem } from '@/components/community/CommentItem';
import type { Comment } from '@/lib/community/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const community = (en as Record<string, Record<string, unknown>>).community;
    const raw = community[key];
    if (typeof raw !== 'string') return key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      raw,
    );
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/lib/community/markdown', () => ({
  CommunityMarkdown: ({ body }: { body: string }) => <div>{body}</div>,
}));

// Stub CommentComposer so we don't pull the whole submit pipeline.
vi.mock('@/components/community/CommentComposer', () => ({
  CommentComposer: () => <div data-testid="reply-composer" />,
}));

// Stub CommentMenu with a button that invokes onEdit, letting tests enter edit mode.
vi.mock('@/components/community/CommentMenu', () => ({
  CommentMenu: ({ onEdit }: { onEdit: () => void }) => (
    <button type="button" data-testid="edit-trigger" onClick={onEdit}>
      menu
    </button>
  ),
}));

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    post_id: 'p1',
    partner_id: null,
    author_id: 'author-1',
    body_md: 'hello world',
    parent_comment_id: null,
    status: 'published',
    created_at: new Date().toISOString(),
    author: { id: 'author-1', full_name: 'Ann', avatar_url: null },
    ...overrides,
  };
}

const baseProps = {
  locale: 'en',
  createdLabel: 'now',
  partnerScope: 'main',
};

describe('CommentItem — Reply visibility', () => {
  it('shows Reply for a top-level comment when the viewer can comment', () => {
    render(
      <CommentItem
        {...baseProps}
        comment={makeComment()}
        currentUserId="viewer"
        canComment={true}
      />,
    );
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('hides Reply when the viewer cannot comment (banned or logged-out)', () => {
    render(
      <CommentItem
        {...baseProps}
        comment={makeComment()}
        currentUserId={null}
        canComment={false}
      />,
    );
    expect(screen.queryByText('Reply')).not.toBeInTheDocument();
  });

  it('hides Reply on a reply (single-level nesting)', () => {
    render(
      <CommentItem
        {...baseProps}
        comment={makeComment({ id: 'r1', parent_comment_id: 'c1' })}
        isReply
        currentUserId="viewer"
        canComment={true}
      />,
    );
    expect(screen.queryByText('Reply')).not.toBeInTheDocument();
  });
});

describe('CommentItem — editor error path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retains the entered text, clears busy, and shows a localized message on a 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'edit_window_expired' }),
        }),
      ),
    );

    render(
      <CommentItem
        {...baseProps}
        comment={makeComment()}
        currentUserId="author-1"
        canComment={true}
      />,
    );

    // Enter edit mode via the (stubbed) menu.
    fireEvent.click(screen.getByTestId('edit-trigger'));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('hello world');

    fireEvent.click(screen.getByText('Save'));

    // Localized 403 message appears...
    expect(await screen.findByText('The edit window has passed.')).toBeInTheDocument();
    // ...the entered text is preserved...
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('hello world');
    // ...and the Save button is enabled again (busy cleared).
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled();
  });
});
