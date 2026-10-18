import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DemoChrome } from '@/components/sandbox/demo-chrome';

// Unit 2a retired the /sandbox landing (307 → /learn), so the demo frame's
// brand link and Exit go Home instead of bouncing through a redirect (D11).
describe('DemoChrome', () => {
  it('brand link and Exit both go to /', () => {
    render(<DemoChrome demoName="HonuAir" stateNote="Resets when you close the tab." />);
    expect(screen.getByRole('link', { name: /HonuVibe/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Exit demo' })).toHaveAttribute('href', '/');
  });
});
