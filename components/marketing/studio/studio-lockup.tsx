import Link from 'next/link';
import { HonuGlyph } from './honu-glyph';

type StudioLockupProps = {
  /** 'light' for the cream nav, 'dark' for the navy footer. */
  tone?: 'light' | 'dark';
  /** Wrap in a link to home (nav) or render as plain markup (footer). */
  href?: string;
};

/**
 * The "HonuVibe Studio" wordmark lockup: honu glyph + bold "HonuVibe"
 * followed by a smaller, letter-spaced teal "Studio" (Linear/Method style).
 * Teal stays the brand accent; this is the single deliberate brand
 * difference from the main HonuVibe.AI mark.
 */
export function StudioLockup({ tone = 'light', href }: StudioLockupProps) {
  const inner = (
    <span className={`lockup${tone === 'dark' ? ' on-dark' : ''}`}>
      <span className="mark">
        <HonuGlyph className="glyph" />
        HonuVibe
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
