import { getTranslations } from 'next-intl/server';
import { ExternalLink, Users, Video } from 'lucide-react';
import { getCommunityLinksForStudent } from '@/lib/dashboard/queries';
import type { CommunityLink } from '@/lib/dashboard/types';

export async function CourseChannelsStrip({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const t = await getTranslations('community');
  const links = await getCommunityLinksForStudent(userId);
  const active = links.filter(
    (l: CommunityLink) => (l.community_platform && l.community_link) || l.zoom_link,
  );
  if (active.length === 0) return null;

  return (
    <div className="rounded-[14px] bg-bg-tertiary border border-border-default p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-fg-tertiary mb-3">
        {t('course_channels_strip_label')}
      </p>
      <div className="flex flex-wrap gap-2">
        {active.map((link) => {
          const title = locale === 'ja' && link.course_title_jp ? link.course_title_jp : link.course_title_en;
          return (
            <div key={link.course_id} className="inline-flex items-center gap-1.5">
              {link.community_link && (
                <a
                  href={link.community_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-colors"
                >
                  <Users size={12} />
                  <span className="truncate max-w-[160px]">{title}</span>
                  <ExternalLink size={11} className="opacity-60" />
                </a>
              )}
              {link.zoom_link && (
                <a
                  href={link.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-colors"
                  aria-label={`${title} Zoom`}
                >
                  <Video size={12} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
