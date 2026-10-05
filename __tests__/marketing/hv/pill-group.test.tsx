import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HvPillGroup } from '@/components/marketing/hv/forms/pill-group';

const OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'web_app', label: 'Web app' },
  { value: 'mvp', label: 'MVP' },
] as const;

type V = (typeof OPTIONS)[number]['value'];

describe('HvPillGroup', () => {
  it('single-select reports the clicked value and marks only it pressed', () => {
    const onChange = vi.fn();
    render(<HvPillGroup<V> label="What kind of project?" options={OPTIONS} value="website" onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'What kind of project?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Website' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'MVP' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'MVP' }));
    expect(onChange).toHaveBeenCalledWith('mvp');
  });

  it('multi-select toggles membership in the array', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <HvPillGroup<V> multiple label="Interested in" options={OPTIONS} value={['website']} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'MVP' }));
    expect(onChange).toHaveBeenLastCalledWith(['website', 'mvp']);

    rerender(<HvPillGroup<V> multiple label="Interested in" options={OPTIONS} value={['website', 'mvp']} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'MVP' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Website' }));
    expect(onChange).toHaveBeenLastCalledWith(['mvp']);
  });

  it('dark tone paints the active pill amber and light tone paints it green', () => {
    const { rerender } = render(<HvPillGroup<V> label="g" options={OPTIONS} value="website" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Website' }).className).toContain('bg-hv-amber');
    rerender(<HvPillGroup<V> label="g" tone="light" options={OPTIONS} value="website" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Website' }).className).toContain('bg-hv-green-900');
  });
});
