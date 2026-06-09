type HonuGlyphProps = {
  className?: string;
  /** 'default' = teal shell on light inner (nav/footer); 'inverted' = light shell on teal inner (dark thumbs). */
  variant?: 'default' | 'inverted';
};

/**
 * The HonuVibe honu (sea turtle) mark — a hex shell with an inner facet.
 * Ported from the Studio mockup. Colours are literal brand hexes so the
 * mark reads correctly on both light chrome and dark surfaces.
 */
export function HonuGlyph({ className, variant = 'default' }: HonuGlyphProps) {
  const shell = variant === 'inverted' ? '#FDFBF7' : '#0FA9A0';
  const inner = variant === 'inverted' ? '#0FA9A0' : '#FDFBF7';
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 3.2c-2 0-3.4 1.3-3.9 3.1-2.2-.7-4.3.2-5.4 2-1.1 1.9-.7 4.1.8 5.6-1.4 1.5-1.8 3.7-.7 5.6 1.1 1.9 3.2 2.8 5.4 2.1.5 1.8 1.9 3.1 3.9 3.1s3.4-1.3 3.9-3.1c2.2.7 4.3-.2 5.4-2.1 1.1-1.9.7-4.1-.7-5.6 1.5-1.5 1.9-3.7.8-5.6-1.1-1.8-3.2-2.7-5.4-2C19.4 4.5 18 3.2 16 3.2Z"
        fill={shell}
      />
      <path d="M16 8.4l3.6 2.2v4.3L16 17.1l-3.6-2.2v-4.3L16 8.4Z" fill={inner} />
      {variant === 'default' && (
        <path
          d="M16 11.2v3.4M13.2 12.6l2.8 1.4 2.8-1.4"
          stroke={shell}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
