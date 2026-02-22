import { cn } from '@/lib/utils';
import { Overline } from './overline';

type SectionHeadingProps = {
  overline?: string;
  heading: string;
  sub?: string;
  centered?: boolean;
  className?: string;
};

export function SectionHeading({ overline, heading, sub, centered = false, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-3', centered && 'items-center text-center', className)}>
      {overline && <Overline>{overline}</Overline>}
      <h2 className="font-serif text-h2 font-normal text-fg-primary">{heading}</h2>
      {sub && <p className="max-w-[600px] text-base text-fg-secondary leading-relaxed">{sub}</p>}
    </div>
  );
}
