import { Fragment } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type BreadcrumbItem = { label: string; href?: string };

type BreadcrumbProps = {
  /** Last item is the current page and renders without a link. */
  items: BreadcrumbItem[];
  /** 'dark' = on the green hero (green-400 links, sand current); 'light' = on sand. */
  tone?: 'dark' | 'light';
  ariaLabel?: string;
  className?: string;
};

/** README "Breadcrumb": 14px, muted links, current page in the surface's ink. */
export function HvBreadcrumb({ items, tone = 'dark', ariaLabel = 'Breadcrumb', className }: BreadcrumbProps) {
  const linkClass = tone === 'dark' ? 'text-hv-green-400 hover:text-hv-sand-100' : 'text-hv-ink-500 hover:text-hv-terracotta';
  const currentClass = tone === 'dark' ? 'text-hv-sand-100' : 'text-hv-green-900';
  const sepClass = tone === 'dark' ? 'text-hv-green-400' : 'text-hv-ink-500';

  return (
    <nav aria-label={ariaLabel} className={cn('text-[14px]', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {item.href && !last ? (
                  <Link href={item.href} className={cn('transition-colors', linkClass)}>
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={cn('font-medium', currentClass)}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden className={sepClass}>
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
