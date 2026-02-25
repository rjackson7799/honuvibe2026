'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Users, ExternalLink, Video } from 'lucide-react';
import Link from 'next/link';
import type { CommunityLink } from '@/lib/dashboard/types';

function CommunityCard({ link, locale }: { link: CommunityLink; locale: string }) {
  const t = useTranslations('dashboard');
  const courseTitle = locale === 'ja' && link.course_title_jp ? link.course_title_jp : link.course_title_en;
  const hasCommunity = link.community_platform && link.community_link;
  const hasZoom = !!link.zoom_link;

  if (!hasCommunity && !hasZoom) return null;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
      <div className="flex items-start gap-4">
        {link.thumbnail_url && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-bg-tertiary">
            <img src={link.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-fg-primary mb-1">{courseTitle}</h3>
          {link.community_duration_months && (
            <p className="text-xs text-fg-tertiary mb-3">
              {t('community_access_months', { months: link.community_duration_months })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {hasCommunity && (
              <a
                href={link.community_link!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-teal text-white hover:bg-accent-teal-hover transition-colors"
              >
                <Users size={12} />
                {t('community_join', { platform: link.community_platform! })}
                <ExternalLink size={12} />
              </a>
            )}
            {hasZoom && (
              <a
                href={link.zoom_link!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-secondary border border-border-default hover:bg-bg-tertiary transition-colors"
              >
                <Video size={12} />
                {t('community_zoom')}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [links, setLinks] = useState<CommunityLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/community');
        if (res.ok) {
          const data = await res.json();
          setLinks(data.links ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter links that actually have community or zoom data
  const activeLinks = links.filter(
    (l) => (l.community_platform && l.community_link) || l.zoom_link,
  );

  if (loading) {
    return (
      <div className="space-y-8 max-w-[1100px]">
        <h1 className="text-2xl font-serif text-fg-primary">{t('heading_community')}</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-bg-tertiary rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1100px]">
      <div>
        <h1 className="text-2xl font-serif text-fg-primary">{t('community_heading')}</h1>
        <p className="text-sm text-fg-secondary mt-2">{t('community_sub')}</p>
      </div>

      {activeLinks.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-fg-tertiary mb-4" />
          <p className="text-fg-tertiary text-sm mb-4">{t('community_no_links')}</p>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 text-sm text-accent-teal hover:underline"
          >
            {t('explore_courses')} →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeLinks.map((link) => (
            <CommunityCard key={link.course_id} link={link} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
