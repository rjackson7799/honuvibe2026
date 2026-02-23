import { Youtube, Linkedin, Instagram, Globe, Rss } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlatformIconProps = {
  platform: string;
  size?: number;
  className?: string;
};

function XIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.83 4.83 0 01-1-.15z" />
    </svg>
  );
}

export function PlatformIcon({ platform, size = 24, className }: PlatformIconProps) {
  const iconClass = cn('shrink-0', className);

  switch (platform) {
    case 'youtube':
      return <Youtube size={size} className={iconClass} />;
    case 'x':
      return <XIcon size={size} className={iconClass} />;
    case 'linkedin':
      return <Linkedin size={size} className={iconClass} />;
    case 'instagram':
      return <Instagram size={size} className={iconClass} />;
    case 'tiktok':
      return <TikTokIcon size={size} className={iconClass} />;
    case 'podcast':
      return <Rss size={size} className={iconClass} />;
    case 'newsletter':
      return <Rss size={size} className={iconClass} />;
    case 'website':
      return <Globe size={size} className={iconClass} />;
    default:
      return <Globe size={size} className={iconClass} />;
  }
}
