import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TagsSection } from '@/components/admin/vault-editor/tags-section';
import type { VaultTag } from '@/lib/vault/types';

const tags: VaultTag[] = [
  { slug: 'ai-fundamentals', name_en: 'AI Fundamentals', name_jp: 'AI基礎', category: 'topic' },
  { slug: 'productivity', name_en: 'Productivity', name_jp: '生産性', category: 'topic' },
  { slug: 'cursor', name_en: 'Cursor', name_jp: 'Cursor', category: 'tool' },
  { slug: 'small-business', name_en: 'Small Business', name_jp: null, category: 'industry' },
] as VaultTag[];

describe('TagsSection', () => {
  it('renders pills grouped by category with a selected count', () => {
    render(
      <TagsSection tags={tags} selectedTags={['cursor', 'productivity']} onToggle={() => {}} />,
    );

    expect(screen.getByText('2 selected')).toBeTruthy();
    expect(screen.getByText('topic')).toBeTruthy();
    expect(screen.getByText('tool')).toBeTruthy();
    expect(screen.getByText('industry')).toBeTruthy();
  });

  it('marks selected pills with aria-pressed', () => {
    render(<TagsSection tags={tags} selectedTags={['cursor']} onToggle={() => {}} />);

    const cursorPill = screen.getByRole('button', { name: /Cursor \(Cursor\)/ });
    const productivityPill = screen.getByRole('button', { name: /Productivity/ });
    expect(cursorPill.getAttribute('aria-pressed')).toBe('true');
    expect(productivityPill.getAttribute('aria-pressed')).toBe('false');
  });

  it('fires onToggle with the tag slug when a pill is clicked', () => {
    const onToggle = vi.fn();
    render(<TagsSection tags={tags} selectedTags={[]} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: /AI Fundamentals/ }));
    expect(onToggle).toHaveBeenCalledWith('ai-fundamentals');
  });

  it('omits a tag-less category and shows the empty state with no tags at all', () => {
    const { rerender } = render(
      <TagsSection tags={tags} selectedTags={[]} onToggle={() => {}} />,
    );
    // No 'skill' or 'format' tags in the fixture → those headers don't render.
    expect(screen.queryByText('skill')).toBeNull();
    expect(screen.queryByText('format')).toBeNull();

    rerender(<TagsSection tags={[]} selectedTags={[]} onToggle={() => {}} />);
    expect(screen.getByText(/No tags available/)).toBeTruthy();
  });
});
