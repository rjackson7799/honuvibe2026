import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminPreviewSummary } from '@/lib/previews/admin-queries';
import {
  filterFeedback,
  toMarkdownChecklist,
  type PreviewFeedbackItem,
} from '@/lib/previews/feedback';

const { setFeedbackStatusMock, setPreviewFeedbackEnabledMock } = vi.hoisted(() => ({
  setFeedbackStatusMock: vi.fn(),
  setPreviewFeedbackEnabledMock: vi.fn(),
}));

vi.mock('@/lib/previews/admin-actions', () => ({
  setFeedbackStatus: setFeedbackStatusMock,
  setPreviewFeedbackEnabled: setPreviewFeedbackEnabledMock,
}));

import { AdminPreviewFeedback } from '@/components/admin/AdminPreviewFeedback';

const PREVIEW: AdminPreviewSummary = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  slug: 'okada-5a5c1a2742',
  title: 'Okada',
  mode: 'gated',
  createdAt: '2026-10-01T00:00:00Z',
  expiresAt: null,
  accessCount: 3,
  lastAccessedAt: null,
  feedbackEnabled: false,
  counts: { total: 4, new: 2, open: 3 },
};

function item(over: Partial<PreviewFeedbackItem> & Pick<PreviewFeedbackItem, 'id'>): PreviewFeedbackItem {
  return {
    createdAt: '2026-10-20T10:00:00Z',
    page: '/index.html',
    reviewerName: 'Aki',
    kind: 'bug',
    message: 'Header overlaps logo',
    viewportW: 390,
    viewportH: 844,
    userAgent: 'Mozilla/5.0 (iPhone)',
    status: 'new',
    hasImage: false,
    ...over,
  };
}

const ITEMS: PreviewFeedbackItem[] = [
  item({ id: 'aaaaaaaa-0000-4000-8000-000000000001' }),
  item({
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    page: '/about.html',
    kind: 'improvement',
    message: 'Bigger team photos',
    reviewerName: 'Ken',
    status: 'planned',
    createdAt: '2026-10-21T09:00:00Z',
  }),
  item({
    id: 'cccccccc-0000-4000-8000-000000000003',
    message: 'Footer link typo',
    status: 'done',
    createdAt: '2026-10-19T08:00:00Z',
  }),
  item({
    id: 'dddddddd-0000-4000-8000-000000000004',
    message: '<script>alert(1)</script>',
    createdAt: '2026-10-20T11:00:00Z',
  }),
];

beforeEach(() => {
  setFeedbackStatusMock.mockReset();
  setPreviewFeedbackEnabledMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

describe('AdminPreviewFeedback', () => {
  it('default filter hides done items; switching to All shows them', () => {
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);

    expect(screen.getByText('Header overlaps logo')).toBeInTheDocument();
    expect(screen.getByText('Bigger team photos')).toBeInTheDocument();
    expect(screen.queryByText('Footer link typo')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'all' } });

    expect(screen.getByText('Footer link typo')).toBeInTheDocument();
  });

  it('filters by kind', () => {
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
    fireEvent.change(screen.getByLabelText('Filter by kind'), { target: { value: 'improvement' } });
    expect(screen.getByText('Bigger team photos')).toBeInTheDocument();
    expect(screen.queryByText('Header overlaps logo')).not.toBeInTheDocument();
  });

  it('items are grouped under their page heading', () => {
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);

    const index = screen.getByRole('region', { name: '/index.html' });
    const about = screen.getByRole('region', { name: '/about.html' });

    expect(within(index).getByText('Header overlaps logo')).toBeInTheDocument();
    expect(within(index).queryByText('Bigger team photos')).not.toBeInTheDocument();
    expect(within(about).getByText('Bigger team photos')).toBeInTheDocument();
    expect(within(about).queryByText('Header overlaps logo')).not.toBeInTheDocument();
  });

  it('shows kind tag, name, date, short id and the viewport + user-agent line', () => {
    render(<AdminPreviewFeedback preview={PREVIEW} items={[ITEMS[0]]} />);
    const region = screen.getByRole('region', { name: '/index.html' });
    expect(within(region).getByText('Bug fix')).toBeInTheDocument();
    expect(within(region).getByText('Aki')).toBeInTheDocument();
    expect(within(region).getByText('2026-10-20 10:00 UTC')).toBeInTheDocument();
    expect(within(region).getByText('aaaaaaaa')).toBeInTheDocument();
    expect(within(region).getByText(/390×844/)).toBeInTheDocument();
    expect(within(region).getByText(/Mozilla\/5\.0 \(iPhone\)/)).toBeInTheDocument();
  });

  it('"Copy as markdown" writes the expected string (with short ids) to the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy as markdown' }));

    const expected = toMarkdownChecklist(
      'Okada',
      filterFeedback(ITEMS, { kind: 'all', status: 'open' }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expected));
    expect(expected).toContain('`aaaaaaaa`');
    expect(expected).toContain('`bbbbbbbb`');
    expect(expected).not.toContain('`cccccccc`');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('"Copied" clears after 2s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      stubClipboard(vi.fn(async () => {}));
      render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy as markdown' }));
      expect(await screen.findByText('Copied')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });
      expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to a selected read-only textarea when the clipboard write rejects', async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error('denied'))));

    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy as markdown' }));

    const textarea = (await screen.findByLabelText('Markdown to copy')) as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
    expect(textarea.value).toBe(
      toMarkdownChecklist('Okada', filterFeedback(ITEMS, { kind: 'all', status: 'open' })),
    );
    await waitFor(() => {
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe(textarea.value.length);
    });
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });

  it('a reviewer message containing <script> renders as text', () => {
    const { container } = render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it('a successful status change calls the action with the new status', async () => {
    setFeedbackStatusMock.mockResolvedValue(undefined);
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);

    const select = screen.getByLabelText('Status for aaaaaaaa') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'planned' } });

    await waitFor(() =>
      expect(setFeedbackStatusMock).toHaveBeenCalledWith('aaaaaaaa-0000-4000-8000-000000000001', 'planned'),
    );
    expect(select.value).toBe('planned');
    expect(screen.queryByText("Couldn't save. Try again.")).not.toBeInTheDocument();
  });

  it('a failed status change reverts and shows an error', async () => {
    let rejectCall: (e: Error) => void = () => {};
    setFeedbackStatusMock.mockImplementation(
      () => new Promise<void>((_, reject) => {
        rejectCall = reject;
      }),
    );
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);

    const select = screen.getByLabelText('Status for bbbbbbbb') as HTMLSelectElement;
    expect(select.value).toBe('planned');
    fireEvent.change(select, { target: { value: 'new' } });

    // Optimistic: the select shows the new value while the action is in flight.
    expect((screen.getByLabelText('Status for bbbbbbbb') as HTMLSelectElement).value).toBe('new');

    await act(async () => {
      rejectCall(new Error('Feedback not found'));
    });

    expect((screen.getByLabelText('Status for bbbbbbbb') as HTMLSelectElement).value).toBe('planned');
    expect(screen.getByText("Couldn't save. Try again.")).toBeInTheDocument();
  });

  it('a stale failed status change does not undo a newer successful one', async () => {
    let rejectFirst: (e: Error) => void = () => {};
    setFeedbackStatusMock
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
    // 'done' is hidden by the default Open filter.
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'all' } });

    const select = () => screen.getByLabelText('Status for aaaaaaaa') as HTMLSelectElement;
    expect(select().value).toBe('new');
    fireEvent.change(select(), { target: { value: 'planned' } });
    await act(async () => {
      fireEvent.change(select(), { target: { value: 'done' } });
    });
    expect(setFeedbackStatusMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      rejectFirst(new Error('boom'));
    });
    expect(select().value).toBe('done');
  });

  it('a public preview shows the switch disabled with a note', () => {
    render(<AdminPreviewFeedback preview={{ ...PREVIEW, mode: 'public' }} items={ITEMS} />);
    const toggle = screen.getByRole('switch', { name: 'Feedback widget' });
    expect(toggle).toBeDisabled();
    expect(screen.getByText('Feedback works on password-protected previews only.')).toBeInTheDocument();
    expect(screen.queryByText(/reviewers can leave notes/)).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(setPreviewFeedbackEnabledMock).not.toHaveBeenCalled();
  });

  it('a failed toggle reverts and shows an error', async () => {
    let rejectCall: (e: Error) => void = () => {};
    setPreviewFeedbackEnabledMock.mockImplementation(
      () => new Promise<void>((_, reject) => {
        rejectCall = reject;
      }),
    );
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);

    const toggle = screen.getByRole('switch', { name: 'Feedback widget' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);

    expect(setPreviewFeedbackEnabledMock).toHaveBeenCalledWith(PREVIEW.id, true);
    expect(screen.getByRole('switch', { name: 'Feedback widget' })).toHaveAttribute('aria-checked', 'true');

    await act(async () => {
      rejectCall(new Error('Preview not found'));
    });

    expect(screen.getByRole('switch', { name: 'Feedback widget' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText("Couldn't save. Try again.")).toBeInTheDocument();
  });

  it('a successful toggle stays on', async () => {
    setPreviewFeedbackEnabledMock.mockResolvedValue(undefined);
    render(<AdminPreviewFeedback preview={PREVIEW} items={ITEMS} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Feedback widget' }));
    await waitFor(() => expect(setPreviewFeedbackEnabledMock).toHaveBeenCalled());
    expect(screen.getByRole('switch', { name: 'Feedback widget' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText("Couldn't save. Try again.")).not.toBeInTheDocument();
  });

  it('no feedback shows "No feedback yet."', () => {
    render(<AdminPreviewFeedback preview={PREVIEW} items={[]} />);
    expect(screen.getByText('No feedback yet.')).toBeInTheDocument();
    expect(screen.queryByText('No feedback matches these filters.')).not.toBeInTheDocument();
  });

  it('all filtered out shows "No feedback matches these filters." and "Show all" brings the items back', () => {
    const onlyDone = [ITEMS[2]];
    render(<AdminPreviewFeedback preview={PREVIEW} items={onlyDone} />);

    expect(screen.getByText('No feedback matches these filters.')).toBeInTheDocument();
    expect(screen.queryByText('No feedback yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('Footer link typo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));

    expect(screen.getByText('Footer link typo')).toBeInTheDocument();
    expect((screen.getByLabelText('Filter by status') as HTMLSelectElement).value).toBe('all');
    expect((screen.getByLabelText('Filter by kind') as HTMLSelectElement).value).toBe('all');
  });

  describe('screenshots', () => {
    const IMG_ID = 'eeeeeeee-0000-4000-8000-000000000005';
    const withImage = item({ id: IMG_ID, message: 'See the screenshot', hasImage: true });

    it('renders a thumbnail only for items with an image', () => {
      const { container } = render(
        <AdminPreviewFeedback preview={PREVIEW} items={[ITEMS[0], withImage]} />,
      );
      const imgs = container.querySelectorAll('img');
      expect(imgs).toHaveLength(1);
      expect(imgs[0].getAttribute('src')).toBe(`/api/admin/preview-feedback/${IMG_ID}/image?v=thumb`);
      expect(imgs[0].getAttribute('width')).toBe('120');
      expect(imgs[0].getAttribute('height')).toBe('90');
      const link = imgs[0].closest('a')!;
      expect(link.getAttribute('href')).toBe(`/api/admin/preview-feedback/${IMG_ID}/image?v=full`);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });

    it('shows "Screenshot unavailable" on image error and keeps the note', () => {
      const { container } = render(<AdminPreviewFeedback preview={PREVIEW} items={[withImage]} />);
      fireEvent.error(container.querySelector('img')!);
      expect(screen.getByText('Screenshot unavailable')).toBeInTheDocument();
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('See the screenshot')).toBeInTheDocument();
    });

    it('copied markdown carries the screenshot link', async () => {
      const writeText = vi.fn(async () => {});
      stubClipboard(writeText);
      render(<AdminPreviewFeedback preview={PREVIEW} items={[withImage]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Copy as markdown' }));
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          expect.stringContaining(
            `[screenshot](https://www.honuvibe.ai/api/admin/preview-feedback/${IMG_ID}/image?v=full)`,
          ),
        ),
      );
    });
  });
});
