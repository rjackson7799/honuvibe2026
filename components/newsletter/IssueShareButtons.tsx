'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link2, Check } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type IssueShareButtonsProps = {
  url: string;
  title: string;
  locale: string;
  slug: string;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export function IssueShareButtons({ url, title, locale, slug }: IssueShareButtonsProps) {
  const t = useTranslations('newsletter');
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleShare = (platform: string, shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    trackEvent('newsletter_share', { issue_slug: slug, platform, locale });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackEvent('newsletter_share', { issue_slug: slug, platform: 'copy_link', locale });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    { key: 'line', icon: LineIcon, label: 'LINE', url: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}` },
    { key: 'x', icon: XIcon, label: 'X', url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { key: 'linkedin', icon: LinkedInIcon, label: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  // LINE first on JP pages
  const orderedLinks = locale === 'ja' ? shareLinks : shareLinks.slice(1).concat(shareLinks.slice(0, 1));

  return (
    <div>
      <p className="text-sm text-fg-tertiary mb-3">{t('share_heading')}</p>
      <div className="flex items-center gap-1">
        {orderedLinks.map(({ key, icon: Icon, label, url: shareUrl }) => (
          <button
            key={key}
            onClick={() => handleShare(key, shareUrl)}
            aria-label={`Share on ${label}`}
            className={cn(
              'inline-flex items-center justify-center w-10 h-10 rounded',
              'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
              'transition-colors duration-[var(--duration-fast)]',
            )}
          >
            <Icon />
          </button>
        ))}

        <button
          onClick={handleCopyLink}
          aria-label="Copy link"
          className={cn(
            'inline-flex items-center justify-center w-10 h-10 rounded',
            'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
            'transition-colors duration-[var(--duration-fast)]',
            copied && 'text-accent-teal',
          )}
        >
          {copied ? <Check size={18} /> : <Link2 size={18} />}
        </button>
      </div>
    </div>
  );
}
