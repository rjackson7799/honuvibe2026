import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminLibraryDetail } from '@/components/admin/AdminLibraryDetail';
import type { LibraryVideo } from '@/lib/library/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/library/actions', () => ({
  createLibraryVideo: vi.fn(),
  updateLibraryVideo: vi.fn(),
  publishLibraryVideo: vi.fn(),
  unpublishLibraryVideo: vi.fn(),
  deleteLibraryVideo: vi.fn(),
}));

const courseOptions = [
  { id: 'c-1', title: 'AI Fundamentals' },
  { id: 'c-2', title: 'Web Dev Basics' },
];

const mockVideo: LibraryVideo = {
  id: 'v-1',
  slug: 'setting-up-cursor',
  title_en: 'Setting Up Cursor IDE',
  title_jp: 'Cursorのセットアップ',
  description_en: 'Learn to set up Cursor',
  description_jp: null,
  video_url: 'https://youtube.com/watch?v=abc123def45',
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
  is_published: false,
  published_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('AdminLibraryDetail', () => {
  it('renders create form when video is null', () => {
    render(<AdminLibraryDetail video={null} courseOptions={courseOptions} />);
    expect(screen.getByText('New Video')).toBeInTheDocument();
    expect(screen.getByText('Create Video')).toBeInTheDocument();
  });

  it('renders edit form with pre-filled values', () => {
    render(<AdminLibraryDetail video={mockVideo} courseOptions={courseOptions} />);
    expect(screen.getByText('Setting Up Cursor IDE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('setting-up-cursor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Setting Up Cursor IDE')).toBeInTheDocument();
  });

  it('shows Back to Library link', () => {
    render(<AdminLibraryDetail video={null} courseOptions={courseOptions} />);
    expect(screen.getByText('Back to Library')).toBeInTheDocument();
  });

  it('shows Publish button for draft videos', () => {
    render(<AdminLibraryDetail video={mockVideo} courseOptions={courseOptions} />);
    expect(screen.getByText('Publish')).toBeInTheDocument();
  });

  it('shows Unpublish button for published videos', () => {
    const publishedVideo = { ...mockVideo, is_published: true };
    render(<AdminLibraryDetail video={publishedVideo} courseOptions={courseOptions} />);
    expect(screen.getByText('Unpublish')).toBeInTheDocument();
  });

  it('shows YouTube embed for YouTube URLs', () => {
    render(<AdminLibraryDetail video={mockVideo} courseOptions={courseOptions} />);
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toContain('youtube-nocookie.com/embed/abc123def45');
  });

  it('shows open in new tab link for non-YouTube URLs', () => {
    const nonYtVideo = { ...mockVideo, video_url: 'https://vimeo.com/12345' };
    render(<AdminLibraryDetail video={nonYtVideo} courseOptions={courseOptions} />);
    expect(screen.getAllByText(/Open video URL in new tab/).length).toBeGreaterThan(0);
  });

  it('shows course options in the Related Course dropdown', () => {
    render(<AdminLibraryDetail video={mockVideo} courseOptions={courseOptions} />);
    expect(screen.getByText('AI Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Web Dev Basics')).toBeInTheDocument();
  });

  it('shows Delete button in edit mode', () => {
    render(<AdminLibraryDetail video={mockVideo} courseOptions={courseOptions} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
