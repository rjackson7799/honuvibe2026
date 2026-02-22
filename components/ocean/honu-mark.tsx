type HonuMarkProps = {
  size?: number;
  color?: string;
  className?: string;
};

export function HonuMark({ size = 32, color = 'var(--accent-teal)', className }: HonuMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Stylized geometric sea turtle */}
      <ellipse cx="16" cy="15" rx="9" ry="11" fill={color} opacity="0.9" />
      {/* Shell pattern */}
      <path d="M16 6 L16 24" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <path d="M9 12 L23 12" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <path d="M9 18 L23 18" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      {/* Head */}
      <ellipse cx="16" cy="4.5" rx="3" ry="2.5" fill={color} opacity="0.85" />
      {/* Flippers */}
      <ellipse cx="6" cy="11" rx="4" ry="2" fill={color} opacity="0.7" transform="rotate(-30 6 11)" />
      <ellipse cx="26" cy="11" rx="4" ry="2" fill={color} opacity="0.7" transform="rotate(30 26 11)" />
      <ellipse cx="7" cy="21" rx="3.5" ry="1.5" fill={color} opacity="0.6" transform="rotate(20 7 21)" />
      <ellipse cx="25" cy="21" rx="3.5" ry="1.5" fill={color} opacity="0.6" transform="rotate(-20 25 21)" />
      {/* Tail */}
      <ellipse cx="16" cy="27" rx="2" ry="3" fill={color} opacity="0.6" />
    </svg>
  );
}
