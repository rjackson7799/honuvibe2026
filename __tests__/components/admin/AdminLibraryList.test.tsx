import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminLibraryList } from '@/components/admin/AdminLibraryList';
import type { LibraryVideo } from '@/lib/library/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const makeVideo = (overrides: Partial<LibraryVideo> = {}): LibraryVideo => ({
  id: 'v-1',
  slug: 'test-video',
  title_en: 'Test Video Title',
  title_jp: null,
  description_en: null,
  description_jp: null,
  video_url: 'https://youtube.com/watch?v=abc123',
  thumbnail_url: null,
  duration_seconds: 300,
  category: 'coding-tools',
  language: 'en',
  access_tier: 'open',
  difficulty: 'beginner',
  related_course_id: null,
  related_resource_slug: null,
  related_glossary_slugs: null,
  tags: ['cursor', 'claude'],
  sort_order: 0,
  is_featured: false,
  is_published: true,
  published_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const publishedVideo = makeVideo({ id: 'v-1', title_en: 'Published Video', is_published: true });
const draftVideo = makeVideo({ id: 'v-2', title_en: 'Draft Video', is_published: false });
const featuredVideo = makeVideo({ id: 'v-3', title_en: 'Featured Video', is_featured: true, is_published: true });

describe('AdminLibraryList', () => {
  it('renders video titles in the table', () => {
    render(<AdminLibraryList videos={[publishedVideo, draftVideo]} />);
    expect(screen.getByText('Published Video')).toBeInTheDocument();
    expect(screen.getByText('Draft Video')).toBeInTheDocument();
  });

  it('shows all filter tabs', () => {
    render(<AdminLibraryList videos={[publishedVideo]} />);
    expect(screen.getByText(/All/)).toBeInTheDocument();
    // Filter buttons exist (StatusBadge may also render same text)
    const publishedElements = screen.getAllByText('published');
    expect(publishedElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('featured')).toBeInTheDocument();
  });

  it('filters to draft only when draft tab is clicked', () => {
    render(<AdminLibraryList videos={[publishedVideo, draftVideo]} />);
    // Both the filter button and status badge render 'draft' — target the button
    const draftElements = screen.getAllByText('draft');
    fireEvent.click(draftElements[0]);
    expect(screen.getByText('Draft Video')).toBeInTheDocument();
    expect(screen.queryByText('Published Video')).not.toBeInTheDocument();
  });

  it('filters by search text', () => {
    render(<AdminLibraryList videos={[publishedVideo, draftVideo]} />);
    const searchInput = screen.getByPlaceholderText('Search by title or tags...');
    fireEvent.change(searchInput, { target: { value: 'Draft' } });
    expect(screen.getByText('Draft Video')).toBeInTheDocument();
    expect(screen.queryByText('Published Video')).not.toBeInTheDocument();
  });

  it('shows empty message when no videos match', () => {
    render(<AdminLibraryList videos={[]} />);
    expect(screen.getByText('No library videos found.')).toBeInTheDocument();
  });

  it('renders duration in minutes', () => {
    render(<AdminLibraryList videos={[publishedVideo]} />);
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('renders category with dashes replaced', () => {
    render(<AdminLibraryList videos={[publishedVideo]} />);
    expect(screen.getByText('coding tools')).toBeInTheDocument();
  });
});
