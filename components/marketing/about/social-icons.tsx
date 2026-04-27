import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function TikTokIcon({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        d="M20 6.5c-1.5-.5-2.8-1.8-3.2-3.5h-3.3v13.5c0 1.5-1.2 2.7-2.8 2.7s-2.7-1.2-2.7-2.7c0-1.5 1.2-2.7 2.7-2.7.3 0 .6.05.8.1V11c-.3-.04-.6-.06-.8-.06-3.2 0-5.7 2.5-5.7 5.7S8 22.3 11.2 22.3s5.8-2.5 5.8-5.7V11.4c1.3.9 2.8 1.4 4.5 1.4V9.6c-.9 0-1.7-.4-2.3-1.1"
        fill="currentColor"
      />
    </svg>
  );
}

export function InstagramIcon({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      <rect x="4" y="4" width="20" height="20" rx="6" />
      <circle cx="14" cy="14" r="5" />
      <circle cx="20" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YouTubeIcon({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
      {...rest}
    >
      <rect
        x="2"
        y="6"
        width="24"
        height="16"
        rx="5"
        fill="currentColor"
        opacity="0.15"
      />
      <rect
        x="2"
        y="6"
        width="24"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <polygon points="11,10 11,18 19,14" fill="currentColor" />
    </svg>
  );
}

export function LineIcon({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
      {...rest}
    >
      <rect
        x="2"
        y="4"
        width="24"
        height="20"
        rx="6"
        fill="currentColor"
        opacity="0.12"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d="M14 8C9.5 8 6 11 6 14.5c0 3 2.5 5.5 6 6.5l2 1.5-1-2c3.5-.5 7-3 7-6C20 11 17.5 8 14 8z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export function LinkedInIcon({ size = 28, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
      {...rest}
    >
      <rect
        x="3"
        y="3"
        width="22"
        height="22"
        rx="4"
        fill="currentColor"
        opacity="0.12"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <rect x="7.5" y="11" width="2.5" height="9" fill="currentColor" />
      <circle cx="8.75" cy="8.5" r="1.4" fill="currentColor" />
      <path
        d="M13 11h2.5v1.4c.5-.9 1.6-1.6 3-1.6 2.2 0 3.5 1.4 3.5 3.7V20H19.5v-4.6c0-1.1-.4-1.9-1.5-1.9s-1.5.7-1.5 1.9V20H13v-9z"
        fill="currentColor"
      />
    </svg>
  );
}
