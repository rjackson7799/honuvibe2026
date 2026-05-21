import { getTranslations } from 'next-intl/server';
import { ExternalLink, MessageCircle } from 'lucide-react';

export async function LineJoinCard({
  url,
}: {
  url: string;
}) {
  const t = await getTranslations('community');
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-[14px] bg-[#06C755]/10 border border-[#06C755]/30 hover:bg-[#06C755]/15 transition-colors"
    >
      <div className="w-12 h-12 rounded-[10px] bg-[#06C755] text-white flex items-center justify-center shrink-0">
        <MessageCircle size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-fg-primary text-[15px]">{t('line_join_title')}</p>
        <p className="text-fg-secondary text-[13px] mt-0.5">{t('line_join_subtitle')}</p>
      </div>
      <span className="text-[color:var(--accent-teal)] inline-flex items-center gap-1 text-sm font-semibold">
        {t('line_join_cta')}
        <ExternalLink size={13} />
      </span>
    </a>
  );
}
