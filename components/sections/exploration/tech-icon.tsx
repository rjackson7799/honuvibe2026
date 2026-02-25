type TechIconProps = {
  name: string;
  size?: number;
  className?: string;
};

export function TechIcon({ name, size = 28, className }: TechIconProps) {
  const props = { width: size, height: size, className, viewBox: '0 0 24 24', fill: 'none' as const };

  switch (name) {
    case 'nextjs':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="currentColor" opacity="0.15" />
          <path d="M18.5 18.5L9.5 7H8v10h1.5V9.56l8.25 10.56" fill="currentColor" />
          <path d="M15.5 7h1.5v10h-1.5V7z" fill="currentColor" />
        </svg>
      );
    case 'react':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" fill="none" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" fill="none" transform="rotate(120 12 12)" />
        </svg>
      );
    case 'typescript':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" opacity="0.15" />
          <path d="M7 11h6m-3 0v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16.5 11c-.83 0-1.5.37-1.5 1s.67 1 1.5 1 1.5.37 1.5 1-.67 1-1.5 1m0-4v-.5m0 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'tailwind':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M12 6c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.3.74 1.9 1.35C13.33 10.79 14.44 12 17 12c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.3-.74-1.9-1.35C15.67 7.21 14.56 6 12 6zM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.3.74 1.9 1.35C8.33 16.79 9.44 18 12 18c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.3-.74-1.9-1.35C10.67 13.21 9.56 12 7 12z" fill="currentColor" />
        </svg>
      );
    case 'supabase':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M13.5 21.5c-.4.5-1.2.1-1.1-.5l.7-8H5.5c-.8 0-1.2-1-.6-1.6l7.6-9.4c.4-.5 1.2-.1 1.1.5l-.7 8h7.6c.8 0 1.2 1 .6 1.6l-7.6 9.4z" fill="currentColor" opacity="0.85" />
        </svg>
      );
    case 'stripe':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="3" fill="currentColor" opacity="0.15" />
          <path d="M13.5 9.5c-1.5-.5-2-.7-2-1.2s.5-.8 1.3-.8c1.2 0 2.2.5 2.2.5l.5-2s-1-.5-2.6-.5c-2.7 0-3.9 1.5-3.9 3.1 0 1.5 1.1 2.3 2.5 2.8 1.1.4 1.5.7 1.5 1.2 0 .6-.5.9-1.4.9-1.2 0-2.5-.6-2.5-.6l-.5 2s1.1.6 3 .6c2.8 0 4-1.4 4-3.2 0-1.6-1.1-2.4-2.1-2.8z" fill="currentColor" />
        </svg>
      );
    case 'openai':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M20.74 10.9a5.03 5.03 0 00-.44-4.17A5.1 5.1 0 0014.84 4a5.05 5.05 0 00-3.84-1.73 5.1 5.1 0 00-4.86 3.48 5.03 5.03 0 00-3.36 2.44 5.1 5.1 0 00.62 5.97 5.03 5.03 0 00.44 4.17A5.1 5.1 0 009.3 21.1a5.05 5.05 0 003.84 1.73 5.1 5.1 0 004.86-3.48 5.03 5.03 0 003.36-2.44 5.1 5.1 0 00-.62-5.97z" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'nodejs':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.12" />
          <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <text x="12" y="14.5" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold" fontFamily="sans-serif">JS</text>
        </svg>
      );
    case 'vercel':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M12 3L22 21H2L12 3z" fill="currentColor" />
        </svg>
      );
    case 'figma':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <circle cx="15.5" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M8 19.5a2.5 2.5 0 012.5-2.5h2v2.5a2.5 2.5 0 11-4.5 0z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M10.5 12a2.5 2.5 0 010-5h2v5h-2z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M10.5 7a2.5 2.5 0 010-5h2a2.5 2.5 0 010 5h-2z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M10.5 12a2.5 2.5 0 000 5h2v-5h-2z" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'claude':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.12" />
          <path d="M8.5 10a1 1 0 011-1h5a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2z" fill="currentColor" opacity="0.5" />
          <circle cx="10" cy="15" r="0.8" fill="currentColor" />
          <circle cx="14" cy="15" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'cursor':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.12" />
          <path d="M8 8l4 8 1.5-3.5L17 11l-9-3z" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...props} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.12" />
        </svg>
      );
  }
}
