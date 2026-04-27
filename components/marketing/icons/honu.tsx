type HonuIconProps = {
  size?: number;
  className?: string;
};

/**
 * Marketing brand mark — anatomical sea turtle, matches the IconHonu used
 * across the design prototypes in docs/designs/. Uses currentColor so the
 * caller controls fill via text/color classes (typically teal on marketing).
 * The eye dots are filled with the canvas color so they render as cutouts.
 */
export function HonuIcon({ size = 30, className }: HonuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="16" cy="17" rx="10" ry="8" fill="currentColor" opacity="0.15" />
      <ellipse cx="16" cy="16" rx="8" ry="6.5" fill="currentColor" />
      <ellipse cx="16" cy="15" rx="5" ry="4" fill="currentColor" opacity="0.25" />
      <ellipse cx="9" cy="20" rx="3.5" ry="2" fill="currentColor" transform="rotate(-20 9 20)" />
      <ellipse cx="23" cy="20" rx="3.5" ry="2" fill="currentColor" transform="rotate(20 23 20)" />
      <ellipse cx="8" cy="14" rx="3" ry="1.8" fill="currentColor" transform="rotate(-30 8 14)" />
      <ellipse cx="24" cy="14" rx="3" ry="1.8" fill="currentColor" transform="rotate(30 24 14)" />
      <ellipse cx="16" cy="10" rx="3" ry="2.5" fill="currentColor" />
      <path d="M16 23.5 Q15.5 26 16 27 Q16.5 26 16 23.5" fill="currentColor" />
      <circle cx="14.5" cy="10" r="0.8" fill="var(--m-canvas)" />
      <circle cx="17.5" cy="10" r="0.8" fill="var(--m-canvas)" />
    </svg>
  );
}
