import Link from 'next/link';

type StudioLockupProps = {
  /** 'light' for the cream nav, 'dark' for the navy footer. */
  tone?: 'light' | 'dark';
  /** Wrap in a link to home (nav) or render as plain markup (footer). */
  href?: string;
};

/**
 * The "HonuVibe Studio" wordmark lockup: "HonuVibe" with a teal ".AI" accent,
 * followed by a smaller, letter-spaced grey "Studio" sub-label. Matches the
 * main HonuVibe.AI / Discover mark (app.honuvibe.ai/discover) — no glyph; the
 * teal ".AI" is the single brand accent and "Studio" reads as a quiet tag.
 */
export function StudioLockup({ tone = 'light', href }: StudioLockupProps) {
  const inner = (
    <span className={`lockup${tone === 'dark' ? ' on-dark' : ''}`}>
      <span className="mark">
        HonuVibe<span className="ai">.AI</span>
      </span>
      <span className="studio-word">Studio</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="HonuVibe Studio home" style={{ display: 'inline-flex' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}
