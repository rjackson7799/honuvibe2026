import { describe, it, expect } from 'vitest';
import { formatEventDateTime } from './format';

describe('formatEventDateTime', () => {
  const iso = '2026-06-20T18:00:00Z'; // 18:00 UTC

  it('renders in the event timezone for en (Hawaii: 18:00Z -> 08:00 HST)', () => {
    const s = formatEventDateTime(iso, 'Pacific/Honolulu', 'en');
    expect(s).toContain('June 20, 2026');
    expect(s).toContain('8:00');
    expect(s).toContain('HST');
  });

  it('renders in JST for ja (18:00Z -> 03:00 next day)', () => {
    const s = formatEventDateTime(iso, 'Asia/Tokyo', 'ja');
    expect(s).toContain('2026');
    expect(s).toContain('21'); // rolls over to June 21 in Tokyo
  });
});
