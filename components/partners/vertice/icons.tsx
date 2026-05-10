import type { SVGProps } from 'react';

type IconProps = { size?: number } & SVGProps<SVGSVGElement>;

export const IconArrow = ({ size = 16, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const IconCheck = ({ size = 16, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconX = ({ size = 14, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
    {...rest}
  >
    <circle cx="7" cy="7" r="7" fill="rgba(26,43,51,0.18)" />
    <path
      d="M4.5 4.5l5 5M9.5 4.5l-5 5"
      stroke="#fff"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const IconSpark = ({ size = 16, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 22 22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M11 2l1.5 5.5L18 9l-5.5 1.5L11 16l-1.5-5.5L4 9l5.5-1.5z" />
  </svg>
);

export const IconChevron = ({ size = 16, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M3 6l5 4 5-4" />
  </svg>
);

export const IconWave = ({ size = 14, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 4 3" />
  </svg>
);

export const IconPlay = ({ size = 14, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...rest}
  >
    <path d="M6 4l14 8-14 8z" />
  </svg>
);

export const HonuMark = ({ size = 28, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="-100 -100 200 200"
    aria-hidden="true"
    {...rest}
  >
    <ellipse cx="0" cy="20" rx="60" ry="48" fill="currentColor" opacity="0.18" />
    <ellipse cx="0" cy="0" rx="50" ry="38" fill="currentColor" />
    <ellipse cx="-46" cy="26" rx="20" ry="12" fill="currentColor" transform="rotate(-20 -46 26)" />
    <ellipse cx="46" cy="26" rx="20" ry="12" fill="currentColor" transform="rotate(20 46 26)" />
    <ellipse cx="-50" cy="-12" rx="18" ry="10" fill="currentColor" transform="rotate(-30 -50 -12)" />
    <ellipse cx="50" cy="-12" rx="18" ry="10" fill="currentColor" transform="rotate(30 50 -12)" />
    <ellipse cx="0" cy="-38" rx="18" ry="14" fill="currentColor" />
  </svg>
);

export const VerticeWordmark = ({ size = 18, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size * 5}
    height={size}
    viewBox="0 0 100 20"
    aria-hidden="true"
    {...rest}
  >
    <text
      x="0"
      y="15"
      fontFamily="var(--vertice-ff-sans, Inter), sans-serif"
      fontSize="13"
      fontWeight="800"
      letterSpacing="3"
      fill="currentColor"
    >
      VERTICE
    </text>
  </svg>
);

export function CoBrandLockup() {
  return (
    <span className="vertice-cobrand" aria-label="Vertice Society × HonuVibe.AI">
      <span className="vertice-cobrand-vertice">VERTICE</span>
      <span className="vertice-cobrand-x" aria-hidden="true">×</span>
      <span className="vertice-cobrand-honu">
        HonuVibe<span className="vertice-cobrand-tld">.AI</span>
      </span>
    </span>
  );
}

export function FloatingHonu({
  top = 120,
  opacity = 0.06,
}: {
  top?: number;
  opacity?: number;
}) {
  return (
    <div
      className="vertice-floating-honu"
      style={{ top, opacity }}
      aria-hidden="true"
    >
      <HonuMark size={180} style={{ color: 'var(--vertice-seafoam)' }} />
    </div>
  );
}
