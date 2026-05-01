'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Users, ExternalLink, Video, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { CommunityLink } from '@/lib/dashboard/types';
import { Card } from '@/components/ui/card';

function CommunityCard({ link, locale }: { link: CommunityLink; locale: string }) {
  const t = useTranslations('dashboard');
  const courseTitle = locale === 'ja' && link.course_title_jp ? link.course_title_jp : link.course_title_en;
  const hasCommunity = link.community_platform && link.community_link;
  const hasZoom = !!link.zoom_link;

  if (!hasCommunity && !hasZoom) return null;

  return (
    <Card variant="learn" padding="md">
      <div className="flex items-start gap-4">
        {link.thumbnail_url && (
          <div className="w-16 h-16 rounded-[10px] overflow-hidden shrink-0 bg-bg-tertiary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={link.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-fg-primary tracking-[-0.01em] mb-1">
            {courseTitle}
          </h3>
          {link.community_duration_months && (
            <p className="text-[12px] text-fg-tertiary mb-3">
              {t('community_access_months', { months: link.community_duration_months })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {hasCommunity && (
              <a
                href={link.community_link!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] shadow-sm hover:shadow-md transition-all"
              >
                <Users size={13} />
                {t('community_join', { platform: link.community_platform! })}
                <ExternalLink size={12} />
              </a>
            )}
            {hasZoom && (
              <a
                href={link.zoom_link!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-semibold text-fg-secondary bg-bg-secondary border border-border-default hover:border-border-hover hover:text-fg-primary transition-colors"
              >
                <Video size={13} />
                {t('community_zoom')}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
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

  const activeLinks = links.filter(
    (l) => (l.community_platform && l.community_link) || l.zoom_link,
  );

  const heading = (
    <div>
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        {t('community_heading')}
      </h1>
      <p className="text-sm text-fg-secondary mt-1.5">{t('community_sub')}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1100px]">
        {heading}
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-bg-tertiary rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      {heading}

      {activeLinks.length === 0 ? (
        <div className="py-12 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center">
            <Users size={26} />
          </div>
          <p className="text-fg-tertiary text-sm mb-4">{t('community_no_links')}</p>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
          >
            {t('explore_courses')} <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLinks.map((link) => (
            <CommunityCard key={link.course_id} link={link} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
