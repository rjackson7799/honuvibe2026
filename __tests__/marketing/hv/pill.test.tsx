import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HvPill } from '@/components/marketing/hv/pill';

/**
 * cn() (tailwind-merge) does not know the custom hv-* colours conflict, so a
 * className override like `border-hv-green-700` on top of the dark tone's
 * `border-hv-green-900` leaves both classes and the stylesheet order decides.
 * The "We build" chips on the dark Build hero need their own tone instead.
 */
describe('HvPill tones', () => {
  it('outline-dark draws a visible green-700 border on a transparent fill, with no competing border colour', () => {
    render(<HvPill tone="outline-dark">Web apps</HvPill>);
    const classes = screen.getByText('Web apps').className.split(/\s+/);
    expect(classes).toContain('border-hv-green-700');
    expect(classes).toContain('bg-transparent');
    expect(classes).not.toContain('border-hv-green-900');
    expect(classes).not.toContain('bg-hv-green-900');
  });

  it('keeps the existing dark and light tones unchanged', () => {
    render(
      <>
        <HvPill tone="dark">Dark</HvPill>
        <HvPill>Light</HvPill>
      </>,
    );
    expect(screen.getByText('Dark').className).toContain('bg-hv-green-900');
    expect(screen.getByText('Light').className).toContain('border-hv-sand-300');
  });
});
