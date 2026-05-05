import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type PartnerBadgePartner = {
  slug: string;
  name_en: string;
  name_jp: string | null;
  logo_url: string | null;
};

type Variant = 'default' | 'compact';

type Props = {
  partner: PartnerBadgePartner;
  locale: string;
  variant?: Variant;
  className?: string;
};

export function PartnerBadge({ partner, locale, variant = 'default', className }: Props) {
  const t = useTranslations('partner_badge');
  const name = (locale === 'ja' && partner.name_jp) || partner.name_en;
  const labelKey = variant === 'compact' ? 'from_partner' : 'presented_by';
  const prefix = locale === 'ja' ? '/ja' : '';

  return (
    <Link
      href={`${prefix}/partners/${partner.slug}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] uppercase tracking-wider text-fg-tertiary transition-colors hover:text-fg-secondary hover:bg-bg-tertiary',
        className,
      )}
    >
      {partner.logo_url && (
        <Image
          src={partner.logo_url}
          alt=""
          width={14}
          height={14}
          className="rounded-sm object-contain"
          unoptimized
        />
      )}
      <span>{t(labelKey, { name })}</span>
    </Link>
  );
}
