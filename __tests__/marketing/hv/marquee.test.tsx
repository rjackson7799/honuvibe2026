import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HvMarquee } from '@/components/marketing/hv/motion/marquee';
import { stubMatchMedia } from './helpers';

const ITEMS = ['Claude', 'Cursor', 'Supabase', 'n8n'];

describe('HvMarquee', () => {
  it('duplicates the row (second copy hidden from AT) and runs at items × 3.2s', () => {
    stubMatchMedia(false);
    render(<HvMarquee items={ITEMS} label="Tools" />);
    const list = screen.getByRole('list', { name: 'Tools' });
    expect(list).toHaveAttribute('data-reduced-motion', 'false');
    expect(screen.getAllByRole('listitem')).toHaveLength(ITEMS.length); // hidden copy is aria-hidden
    expect(list.querySelectorAll('span[role="listitem"]')).toHaveLength(ITEMS.length * 2);
    const track = screen.getByTestId('hv-marquee-track');
    // Only duration/direction are inline; name/timing/iteration come from .hv-marquee-track
    // in globals.css so the hover pause utility can override play-state.
    expect(track.className).toContain('hv-marquee-track');
    expect(track.style.animationDuration).toBe(`${ITEMS.length * 3.2}s`);
    expect(track.style.animationDirection).toBe('normal');
    expect(track.style.animation).toBe('');
    expect(track.className).toContain('group-hover:[animation-play-state:paused]');
  });

  it('reverse flips the animation direction', () => {
    stubMatchMedia(false);
    render(<HvMarquee items={ITEMS} label="Tools" reverse />);
    expect(screen.getByTestId('hv-marquee-track').style.animationDirection).toBe('reverse');
  });

  it('under reduced motion it is a plain, focusable scrollable list with no duplication', () => {
    stubMatchMedia(true);
    render(<HvMarquee items={ITEMS} label="Tools" />);
    const list = screen.getByRole('list', { name: 'Tools' });
    expect(list).toHaveAttribute('data-reduced-motion', 'true');
    expect(list).toHaveAttribute('tabindex', '0');
    expect(list.className).toContain('overflow-x-auto');
    expect(list.querySelectorAll('span[role="listitem"]')).toHaveLength(ITEMS.length);
    const track = screen.getByTestId('hv-marquee-track');
    expect(track.style.animationDuration).toBe('');
    expect(track.className).not.toContain('animation-play-state');
  });

  it('light tone uses the sand pill with a terracotta dot', () => {
    stubMatchMedia(false);
    render(<HvMarquee items={['Prompting']} label="Topics" tone="light" />);
    const pill = screen.getAllByRole('listitem')[0];
    expect(pill.className).toContain('bg-hv-sand-50');
    expect(pill.querySelector('span[aria-hidden]')?.className).toContain('bg-hv-terracotta');
  });
});
